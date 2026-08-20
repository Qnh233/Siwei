use std::{fs, path::PathBuf};

use tauri::Manager;

use crate::{
    models::OutlineDocument,
    services::{file_service, settings_service},
    utils::error::{AppError, CommandResult},
};

use super::settings::default_document_library_dir;

#[tauri::command]
pub fn new_document() -> OutlineDocument {
    OutlineDocument::new_untitled()
}

#[tauri::command]
pub fn save_document(path: String, doc: OutlineDocument) -> Result<(), String> {
    file_service::save_document(path, &doc).into_command_result()
}

#[tauri::command]
pub fn load_document(path: String) -> Result<OutlineDocument, String> {
    file_service::load_document(path).into_command_result()
}

#[tauri::command]
pub fn prepare_new_document_path(app: tauri::AppHandle, title: String) -> Result<String, String> {
    prepare_new_document_path_inner(&app, &title).into_command_result()
}

fn prepare_new_document_path_inner(
    app: &tauri::AppHandle,
    title: &str,
) -> Result<String, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|source| AppError::Tauri {
            operation: "获取应用数据目录",
            source,
        })?;
    let settings = settings_service::get_settings(app_data_dir)?;
    let settings = settings_service::with_default_document_library_path(
        settings,
        default_document_library_dir(app)?,
    );
    let directory = PathBuf::from(settings.document_library_path);
    fs::create_dir_all(&directory).map_err(|source| AppError::Io {
        operation: "创建文档库目录",
        source,
    })?;

    Ok(unique_document_path(&directory, title)
        .to_string_lossy()
        .to_string())
}

fn unique_document_path(directory: &std::path::Path, title: &str) -> PathBuf {
    let stem = sanitize_file_stem(title);
    let first = directory.join(format!("{stem}.siwei.json"));
    if !first.exists() {
        return first;
    }

    let mut suffix = 2;
    loop {
        let candidate = directory.join(format!("{stem} ({suffix}).siwei.json"));
        if !candidate.exists() {
            return candidate;
        }
        suffix += 1;
    }
}

fn sanitize_file_stem(value: &str) -> String {
    let mut sanitized: String = value
        .chars()
        .map(|ch| {
            if ch.is_control() || matches!(ch, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*')
            {
                ' '
            } else {
                ch
            }
        })
        .collect();
    sanitized = sanitized.split_whitespace().collect::<Vec<_>>().join(" ");
    sanitized = sanitized.trim_end_matches(['.', ' ']).to_string();
    if sanitized.is_empty() {
        sanitized = "未命名文档".to_string();
    }

    let upper = sanitized.to_ascii_uppercase();
    let is_reserved = matches!(upper.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || ((upper.starts_with("COM") || upper.starts_with("LPT"))
            && upper[3..]
                .parse::<u8>()
                .is_ok_and(|number| (1..=9).contains(&number)));
    if is_reserved {
        format!("_{sanitized}")
    } else {
        sanitized
    }
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{sanitize_file_stem, unique_document_path};

    #[test]
    fn sanitizes_windows_filename_characters_and_reserved_names() {
        assert_eq!(sanitize_file_stem("  项目:A/B?  "), "项目 A B");
        assert_eq!(sanitize_file_stem("..."), "未命名文档");
        assert_eq!(sanitize_file_stem("CON"), "_CON");
        assert_eq!(sanitize_file_stem("LPT1"), "_LPT1");
    }

    #[test]
    fn allocates_a_unique_siwei_document_path() {
        let dir = tempdir().unwrap();
        std::fs::write(dir.path().join("未命名文档.siwei.json"), "{}").unwrap();
        std::fs::write(dir.path().join("未命名文档 (2).siwei.json"), "{}").unwrap();

        assert_eq!(
            unique_document_path(dir.path(), "未命名文档")
                .file_name()
                .unwrap()
                .to_string_lossy(),
            "未命名文档 (3).siwei.json"
        );
    }
}
