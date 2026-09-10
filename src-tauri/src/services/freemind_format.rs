use crate::{
    models::{ImportReport, ImportReportItem, ImportReportSeverity, OutlineDocument, OutlineNode},
    utils::{error::AppError, id::new_id, time::now_millis},
};
use quick_xml::{
    events::{BytesStart, Event},
    Reader,
};
use std::collections::HashMap;

pub fn import_freemind(content: &str) -> Result<(OutlineDocument, ImportReport), AppError> {
    let mut reader = Reader::from_str(content);
    reader.config_mut().trim_text(true);
    let (mut stack, mut roots, mut report) = (
        Vec::<OutlineNode>::new(),
        Vec::<OutlineNode>::new(),
        ImportReport::default(),
    );
    let mut note: Option<NoteCapture> = None;
    loop {
        let event = reader
            .read_event()
            .map_err(|e| AppError::Validation(format!("FreeMind 解析失败: {e}")))?;
        if let Some(capture) = note.as_mut() {
            if capture_event(&reader, &event, capture, &stack, &mut report)? {
                let captured = note.take().expect("note capture").finish();
                if let Some(node) = stack.last_mut() {
                    merge_note(node, captured);
                }
            }
            if !matches!(event, Event::Eof) {
                continue;
            }
        }
        match event {
            Event::Start(e) if e.name().as_ref() == b"node" => {
                stack.push(make_node(&reader, &e, &stack, &mut report)?)
            }
            Event::Empty(e) if e.name().as_ref() == b"node" => {
                let node = make_node(&reader, &e, &stack, &mut report)?;
                attach(node, &mut stack, &mut roots);
            }
            Event::End(e) if e.name().as_ref() == b"node" => {
                let node = stack
                    .pop()
                    .ok_or_else(|| AppError::Validation("FreeMind node 结构不完整".into()))?;
                attach(node, &mut stack, &mut roots);
            }
            Event::Start(e) if e.name().as_ref() == b"richcontent" => {
                let a = attrs(&reader, &e)?;
                if a.get("TYPE")
                    .or_else(|| a.get("type"))
                    .is_some_and(|v| v.eq_ignore_ascii_case("NOTE"))
                    && !stack.is_empty()
                {
                    note = Some(NoteCapture::new());
                }
            }
            Event::Empty(e) | Event::Start(e) if e.name().as_ref() == b"attribute" => {
                apply_extension(&reader, &e, &mut stack, &mut report)?
            }
            Event::Empty(e) | Event::Start(e) if e.name().as_ref() == b"arrowlink" => {
                report.items.push(ImportReportItem {
                    severity: ImportReportSeverity::Warning,
                    node_path: path(&stack),
                    field: "arrowlink".into(),
                    value: attrs(&reader, &e)?
                        .get("DESTINATION")
                        .cloned()
                        .unwrap_or_default(),
                    action: "非树连线暂未导入；知识关系由 Siwei 原生关系模型维护".into(),
                })
            }
            Event::Eof => break,
            _ => {}
        }
    }
    if !stack.is_empty() {
        return Err(AppError::Validation("FreeMind node 结构未闭合".into()));
    }
    if roots.is_empty() {
        return Err(AppError::Validation("FreeMind 文件中没有根节点".into()));
    }
    let mut root = roots.remove(0);
    if !roots.is_empty() {
        report.items.push(ImportReportItem {
            severity: ImportReportSeverity::Warning,
            node_path: vec![root.text.clone()],
            field: "root".into(),
            value: roots.len().to_string(),
            action: "检测到多个根节点，已附加到首个根节点下".into(),
        });
        root.children.extend(roots);
    }
    let now = now_millis();
    let doc = OutlineDocument {
        id: new_id(),
        title: root.text.clone(),
        version: 1,
        created_at: now,
        updated_at: now,
        mind_map_layout: None,
        relations: vec![],
        document_references: vec![],
        entity_mentions: vec![],
        root,
    };
    doc.validate()?;
    Ok((doc, report))
}

pub fn export_freemind(doc: &OutlineDocument) -> String {
    let mut out = vec![
        r#"<?xml version="1.0" encoding="UTF-8"?>"#.into(),
        r#"<map version="1.0.1">"#.into(),
    ];
    emit_node(&mut out, &doc.root, 1);
    out.push("</map>".into());
    out.join("\n")
}

fn make_node(
    reader: &Reader<&[u8]>,
    e: &BytesStart<'_>,
    stack: &[OutlineNode],
    report: &mut ImportReport,
) -> Result<OutlineNode, AppError> {
    let a = attrs(reader, e)?;
    let mut text = a
        .get("TEXT")
        .or_else(|| a.get("text"))
        .map(|v| v.trim().to_string())
        .unwrap_or_default();
    let mut p = path(stack);
    if text.is_empty() {
        text = "未命名节点".into();
        p.push(text.clone());
        report.items.push(ImportReportItem {
            severity: ImportReportSeverity::Warning,
            node_path: p.clone(),
            field: "TEXT".into(),
            value: String::new(),
            action: "使用兜底标题“未命名节点”".into(),
        });
    } else {
        p.push(text.clone());
    }
    let mut note = None;
    if let Some(link) = a
        .get("LINK")
        .or_else(|| a.get("link"))
        .filter(|v| !v.trim().is_empty())
    {
        note = Some(format!("FreeMind 链接: {}", link.trim()));
        report.items.push(ImportReportItem {
            severity: ImportReportSeverity::Info,
            node_path: p.clone(),
            field: "LINK".into(),
            value: link.clone(),
            action: "当前节点模型没有独立链接字段，已写入节点备注".into(),
        });
    }
    if let Some(pos) = a
        .get("POSITION")
        .or_else(|| a.get("position"))
        .filter(|v| !v.trim().is_empty())
    {
        report.items.push(ImportReportItem {
            severity: ImportReportSeverity::Info,
            node_path: p,
            field: "POSITION".into(),
            value: pos.clone(),
            action: "左右分支属于视图信息；树结构已导入，布局暂不写入文档".into(),
        });
    }
    let now = now_millis();
    Ok(OutlineNode {
        id: new_id(),
        text,
        note,
        collapsed: a
            .get("FOLDED")
            .or_else(|| a.get("folded"))
            .and_then(|v| bool_value(v)),
        checked: None,
        tags: None,
        created_at: now,
        updated_at: now,
        children: vec![],
    })
}

fn apply_extension(
    reader: &Reader<&[u8]>,
    e: &BytesStart<'_>,
    stack: &mut [OutlineNode],
    report: &mut ImportReport,
) -> Result<(), AppError> {
    let a = attrs(reader, e)?;
    let Some(name) = a.get("NAME").or_else(|| a.get("name")) else {
        return Ok(());
    };
    let value = a
        .get("VALUE")
        .or_else(|| a.get("value"))
        .cloned()
        .unwrap_or_default();
    let p = path(stack);
    let Some(node) = stack.last_mut() else {
        return Ok(());
    };
    match name.as_str() {
        "siwei.checked" => node.checked = bool_value(&value),
        "siwei.tags" => {
            if let Ok(tags) = serde_json::from_str::<Vec<String>>(&value) {
                if !tags.is_empty() {
                    node.tags = Some(tags);
                }
            }
        }
        _ if name.starts_with("siwei.") => report.items.push(ImportReportItem {
            severity: ImportReportSeverity::Info,
            node_path: p,
            field: name.clone(),
            value,
            action: "未识别的 Siwei 扩展属性已忽略".into(),
        }),
        _ => {}
    }
    Ok(())
}

fn capture_event(
    reader: &Reader<&[u8]>,
    event: &Event<'_>,
    capture: &mut NoteCapture,
    stack: &[OutlineNode],
    report: &mut ImportReport,
) -> Result<bool, AppError> {
    match event {
        Event::Start(e) => {
            capture.depth += 1;
            if line_tag(e.name().as_ref()) {
                capture.br();
            }
            if e.name().as_ref() == b"img" {
                capture_img(reader, e, capture, stack, report)?;
            }
        }
        Event::Empty(e) => {
            if line_tag(e.name().as_ref()) {
                capture.br();
            }
            if e.name().as_ref() == b"img" {
                capture_img(reader, e, capture, stack, report)?;
            }
        }
        Event::Text(e) => capture.text(
            e.xml_content()
                .map_err(|x| AppError::Validation(format!("FreeMind 备注解析失败: {x}")))?
                .as_ref(),
        ),
        Event::End(e) => {
            if line_tag(e.name().as_ref()) {
                capture.br();
            }
            capture.depth = capture.depth.saturating_sub(1);
            if capture.depth == 0 && e.name().as_ref() == b"richcontent" {
                return Ok(true);
            }
        }
        Event::Eof => {
            return Err(AppError::Validation(
                "FreeMind richcontent 结构未闭合".into(),
            ))
        }
        _ => {}
    }
    Ok(false)
}

fn capture_img(
    reader: &Reader<&[u8]>,
    e: &BytesStart<'_>,
    capture: &mut NoteCapture,
    stack: &[OutlineNode],
    report: &mut ImportReport,
) -> Result<(), AppError> {
    let a = attrs(reader, e)?;
    let Some(src) = a
        .get("src")
        .or_else(|| a.get("SRC"))
        .filter(|v| !v.trim().is_empty())
    else {
        return Ok(());
    };
    capture.images.push(src.trim().to_string());
    report.items.push(ImportReportItem {
        severity: ImportReportSeverity::Warning,
        node_path: path(stack),
        field: "img.src".into(),
        value: src.clone(),
        action: "节点模型尚无附件字段，已将图片路径保留到备注；图片文件本身未复制".into(),
    });
    Ok(())
}

fn emit_node(out: &mut Vec<String>, node: &OutlineNode, depth: usize) {
    let i = "  ".repeat(depth);
    let mut a = vec![format!("TEXT=\"{}\"", escape_attr(&node.text))];
    if node.collapsed == Some(true) {
        a.push("FOLDED=\"true\"".into());
    }
    let ext = node.checked.is_some() || node.tags.as_ref().is_some_and(|v| !v.is_empty());
    if node.children.is_empty() && node.note.is_none() && !ext {
        out.push(format!("{i}<node {} />", a.join(" ")));
        return;
    }
    out.push(format!("{i}<node {}>", a.join(" ")));
    if let Some(v) = node.checked {
        out.push(format!(
            "{}<attribute NAME=\"siwei.checked\" VALUE=\"{v}\" />",
            "  ".repeat(depth + 1)
        ));
    }
    if let Some(tags) = &node.tags {
        if !tags.is_empty() {
            let v = serde_json::to_string(tags).unwrap_or_else(|_| "[]".into());
            out.push(format!(
                "{}<attribute NAME=\"siwei.tags\" VALUE=\"{}\" />",
                "  ".repeat(depth + 1),
                escape_attr(&v)
            ));
        }
    }
    if let Some(note) = &node.note {
        let v = escape_text(note).replace('\r', "").replace('\n', "<br />");
        out.push(format!("{}<richcontent TYPE=\"NOTE\"><html><head></head><body><p>{v}</p></body></html></richcontent>", "  ".repeat(depth + 1)));
    }
    for child in &node.children {
        emit_node(out, child, depth + 1);
    }
    out.push(format!("{i}</node>"));
}

fn attrs(reader: &Reader<&[u8]>, e: &BytesStart<'_>) -> Result<HashMap<String, String>, AppError> {
    let mut out = HashMap::new();
    for a in e.attributes().with_checks(false) {
        let a = a.map_err(|x| AppError::Validation(format!("FreeMind 属性解析失败: {x}")))?;
        let k = String::from_utf8_lossy(a.key.as_ref()).to_string();
        let v = a
            .decode_and_unescape_value(reader.decoder())
            .map_err(|x| AppError::Validation(format!("FreeMind 属性解析失败: {x}")))?
            .to_string();
        out.insert(k, v);
    }
    Ok(out)
}
fn attach(node: OutlineNode, stack: &mut [OutlineNode], roots: &mut Vec<OutlineNode>) {
    if let Some(p) = stack.last_mut() {
        p.children.push(node);
    } else {
        roots.push(node);
    }
}
fn path(stack: &[OutlineNode]) -> Vec<String> {
    stack.iter().map(|n| n.text.clone()).collect()
}
fn merge_note(node: &mut OutlineNode, value: Option<String>) {
    if let Some(v) = value.filter(|v| !v.trim().is_empty()) {
        node.note = Some(match node.note.take() {
            Some(old) if !old.trim().is_empty() => format!("{old}\n\n{v}"),
            _ => v,
        });
    }
}
fn bool_value(v: &str) -> Option<bool> {
    match v.trim().to_ascii_lowercase().as_str() {
        "true" | "yes" | "1" => Some(true),
        "false" | "no" | "0" => Some(false),
        _ => None,
    }
}
fn line_tag(v: &[u8]) -> bool {
    matches!(v, b"br" | b"p" | b"div" | b"li")
}
fn escape_text(v: &str) -> String {
    v.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}
fn escape_attr(v: &str) -> String {
    escape_text(v)
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
        .replace(['\r', '\n'], " ")
}

struct NoteCapture {
    depth: usize,
    body: String,
    images: Vec<String>,
}
impl NoteCapture {
    fn new() -> Self {
        Self {
            depth: 1,
            body: String::new(),
            images: vec![],
        }
    }
    fn text(&mut self, v: &str) {
        let v = v.trim();
        if v.is_empty() {
            return;
        }
        if !self.body.is_empty() && !self.body.ends_with([' ', '\n']) {
            self.body.push(' ');
        }
        self.body.push_str(v);
    }
    fn br(&mut self) {
        if !self.body.is_empty() && !self.body.ends_with('\n') {
            self.body.push('\n');
        }
    }
    fn finish(self) -> Option<String> {
        let mut s = vec![];
        let body = self
            .body
            .lines()
            .map(str::trim)
            .filter(|v| !v.is_empty())
            .collect::<Vec<_>>()
            .join("\n");
        if !body.is_empty() {
            s.push(body);
        }
        if !self.images.is_empty() {
            let mut v = vec!["FreeMind 外部图片引用".to_string()];
            v.extend(self.images.into_iter().map(|x| format!("- {x}")));
            s.push(v.join("\n"));
        }
        (!s.is_empty()).then_some(s.join("\n\n"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn node(text: &str, children: Vec<OutlineNode>) -> OutlineNode {
        OutlineNode {
            id: format!("id-{text}"),
            text: text.into(),
            note: None,
            collapsed: None,
            checked: None,
            tags: None,
            created_at: 1,
            updated_at: 1,
            children,
        }
    }

    #[test]
    fn imports_tree_notes_and_external_images() {
        let xml = r#"<map version="1.0.1"><node TEXT="项目"><node TEXT="方案" FOLDED="true" LINK="https://example.com" POSITION="right"><richcontent TYPE="NOTE"><html><body><p>备注内容</p><img src="assets/diagram.png" /></body></html></richcontent></node></node></map>"#;
        let (doc, report) = import_freemind(xml).unwrap();
        let child = &doc.root.children[0];
        assert_eq!(doc.title, "项目");
        assert_eq!(child.collapsed, Some(true));
        let note = child.note.as_deref().unwrap();
        assert!(
            note.contains("https://example.com")
                && note.contains("备注内容")
                && note.contains("assets/diagram.png")
        );
        assert!(report.items.iter().any(|v| v.field == "img.src"));
        assert!(report.items.iter().any(|v| v.field == "POSITION"));
    }

    #[test]
    fn round_trip_preserves_tree_note_task_and_tags() {
        let mut child = node("子节点", vec![]);
        child.note = Some("第一行\n第二行".into());
        child.collapsed = Some(true);
        child.checked = Some(false);
        child.tags = Some(vec!["alpha".into(), "beta".into()]);
        let doc = OutlineDocument {
            id: "doc".into(),
            title: "根节点".into(),
            version: 1,
            created_at: 1,
            updated_at: 1,
            mind_map_layout: None,
            relations: vec![],
            document_references: vec![],
            entity_mentions: vec![],
            root: node("根节点", vec![child]),
        };
        let (got, report) = import_freemind(&export_freemind(&doc)).unwrap();
        let child = &got.root.children[0];
        assert_eq!(got.root.text, "根节点");
        assert_eq!(child.text, "子节点");
        assert_eq!(child.collapsed, Some(true));
        assert_eq!(child.checked, Some(false));
        assert_eq!(
            child.tags.as_ref().unwrap(),
            &vec!["alpha".to_string(), "beta".to_string()]
        );
        assert_eq!(child.note.as_deref(), Some("第一行\n第二行"));
        assert!(report.items.is_empty());
    }

    #[test]
    fn rejects_missing_root() {
        assert!(import_freemind("<map></map>")
            .unwrap_err()
            .to_string()
            .contains("没有根节点"));
    }
}
