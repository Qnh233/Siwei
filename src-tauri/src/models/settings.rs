use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub auto_save_enabled: bool,
    pub auto_save_interval_ms: u64,
    #[serde(default)]
    pub document_library_path: String,
    pub default_view_mode: DefaultViewMode,
    pub sidebar_collapsed: bool,
    #[serde(default = "default_theme_mode")]
    pub theme: ThemeMode,
    #[serde(default)]
    pub focus_mode: bool,
    #[serde(default)]
    pub experimental_mind_map_layout_engine: bool,
    #[serde(default)]
    pub mind_map_appearance: MindMapAppearanceSettings,
    #[serde(default)]
    pub keybindings: KeybindingSettings,
    pub agent: AgentSettings,
}

#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeybindingSettings {
    #[serde(default)]
    pub overrides: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MindMapAppearanceSettings {
    #[serde(default)]
    pub canvas_background: MindMapCanvasBackground,
    #[serde(default)]
    pub hierarchy_line_style: MindMapHierarchyLineStyle,
    #[serde(default)]
    pub hierarchy_line_pattern: MindMapHierarchyLinePattern,
    #[serde(default = "default_hierarchy_line_color")]
    pub hierarchy_line_color: String,
    #[serde(default)]
    pub node_shape: MindMapNodeShape,
    #[serde(default = "default_node_border_color")]
    pub node_border_color: String,
    #[serde(default = "default_node_fill_color")]
    pub node_fill_color: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MindMapCanvasBackground {
    Paper,
    Dots,
    Grid,
    Plain,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MindMapHierarchyLineStyle {
    Curve,
    Orthogonal,
    Straight,
}

impl Default for MindMapHierarchyLineStyle {
    fn default() -> Self {
        Self::Curve
    }
}

impl Default for MindMapCanvasBackground {
    fn default() -> Self {
        Self::Paper
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MindMapHierarchyLinePattern {
    Solid,
    Dashed,
}

impl Default for MindMapHierarchyLinePattern {
    fn default() -> Self {
        Self::Solid
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MindMapNodeShape {
    Rounded,
    Pill,
    Square,
}

impl Default for MindMapNodeShape {
    fn default() -> Self {
        Self::Rounded
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DefaultViewMode {
    Outline,
    Mindmap,
    Split,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ThemeMode {
    Light,
    Dark,
    System,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSettings {
    pub enabled: bool,
    pub provider: String,
    pub model: String,
    pub base_url: String,
    pub thinking_level: AgentThinkingLevel,
    pub context_scope: AgentContextScope,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AgentThinkingLevel {
    Off,
    Minimal,
    Low,
    Medium,
    High,
    Xhigh,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AgentContextScope {
    CurrentDocument,
}

pub const MIN_AUTO_SAVE_INTERVAL_MS: u64 = 500;
pub const MAX_AUTO_SAVE_INTERVAL_MS: u64 = 10_000;
pub const DEFAULT_AUTO_SAVE_INTERVAL_MS: u64 = 1_500;

fn default_theme_mode() -> ThemeMode {
    ThemeMode::System
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            auto_save_enabled: true,
            auto_save_interval_ms: DEFAULT_AUTO_SAVE_INTERVAL_MS,
            document_library_path: String::new(),
            default_view_mode: DefaultViewMode::Outline,
            sidebar_collapsed: false,
            theme: ThemeMode::System,
            focus_mode: false,
            experimental_mind_map_layout_engine: false,
            mind_map_appearance: MindMapAppearanceSettings::default(),
            keybindings: KeybindingSettings::default(),
            agent: AgentSettings::default(),
        }
    }
}

impl Default for MindMapAppearanceSettings {
    fn default() -> Self {
        Self {
            canvas_background: MindMapCanvasBackground::Paper,
            hierarchy_line_style: MindMapHierarchyLineStyle::Curve,
            hierarchy_line_pattern: MindMapHierarchyLinePattern::Solid,
            hierarchy_line_color: default_hierarchy_line_color(),
            node_shape: MindMapNodeShape::Rounded,
            node_border_color: default_node_border_color(),
            node_fill_color: default_node_fill_color(),
        }
    }
}

fn default_hierarchy_line_color() -> String {
    "#AA8C72".to_string()
}

fn default_node_border_color() -> String {
    "#B79272".to_string()
}

fn default_node_fill_color() -> String {
    "#FAF6EC".to_string()
}

impl AppSettings {
    pub fn validate(&self) -> Result<(), String> {
        if !(MIN_AUTO_SAVE_INTERVAL_MS..=MAX_AUTO_SAVE_INTERVAL_MS)
            .contains(&self.auto_save_interval_ms)
        {
            return Err(format!(
                "自动保存延迟必须在 {MIN_AUTO_SAVE_INTERVAL_MS}-{MAX_AUTO_SAVE_INTERVAL_MS} 毫秒之间"
            ));
        }

        for (label, color) in [
            ("层级线颜色", &self.mind_map_appearance.hierarchy_line_color),
            ("节点边框颜色", &self.mind_map_appearance.node_border_color),
            ("节点填充颜色", &self.mind_map_appearance.node_fill_color),
        ] {
            if !is_hex_color(color) {
                return Err(format!("{label}必须是 #RRGGBB 格式"));
            }
        }

        self.agent.validate()?;

        Ok(())
    }
}

fn is_hex_color(value: &str) -> bool {
    value.len() == 7
        && value.starts_with('#')
        && value[1..]
            .chars()
            .all(|character| character.is_ascii_hexdigit())
}

impl Default for AgentSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            provider: "openai-compatible".to_string(),
            model: "gpt-4.1".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            thinking_level: AgentThinkingLevel::Medium,
            context_scope: AgentContextScope::CurrentDocument,
        }
    }
}

impl AgentSettings {
    fn validate(&self) -> Result<(), String> {
        if self.provider.trim().is_empty() {
            return Err("第三方模型 Provider 不能为空".to_string());
        }
        if self.model.trim().is_empty() {
            return Err("第三方模型 ID 不能为空".to_string());
        }
        if self.base_url.trim().is_empty() {
            return Err("第三方模型接口地址不能为空".to_string());
        }

        Ok(())
    }
}
