use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    models::AppSettings,
    utils::error::{AppError, AppResult},
};

const SETTINGS_FILE: &str = "settings.json";

pub fn get_settings(app_data_dir: impl AsRef<Path>) -> AppResult<AppSettings> {
    let path = settings_path(app_data_dir.as_ref());
    if !path.exists() {
        return Ok(AppSettings::default());
    }

    let content = fs::read_to_string(&path).map_err(|source| AppError::Io {
        operation: "读取应用设置",
        source,
    })?;

    let settings = match serde_json::from_str::<AppSettings>(&content) {
        Ok(settings) => settings,
        Err(_) => return Ok(AppSettings::default()),
    };

    if settings.validate().is_err() {
        return Ok(AppSettings::default());
    }

    Ok(settings)
}

pub fn update_settings(
    app_data_dir: impl AsRef<Path>,
    settings: AppSettings,
) -> AppResult<AppSettings> {
    settings.validate().map_err(AppError::Validation)?;

    fs::create_dir_all(app_data_dir.as_ref()).map_err(|source| AppError::Io {
        operation: "创建应用数据目录",
        source,
    })?;

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|error| AppError::JsonParse(error.to_string()))?;
    fs::write(settings_path(app_data_dir.as_ref()), content).map_err(|source| AppError::Io {
        operation: "写入应用设置",
        source,
    })?;

    Ok(settings)
}

pub fn with_default_document_library_path(
    mut settings: AppSettings,
    default_path: impl AsRef<Path>,
) -> AppSettings {
    if settings.document_library_path.trim().is_empty() {
        settings.document_library_path = default_path.as_ref().to_string_lossy().to_string();
    }
    settings
}

fn settings_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(SETTINGS_FILE)
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use crate::models::{
        settings::{DefaultViewMode, ThemeMode},
        AppSettings,
    };

    use super::{get_settings, update_settings, with_default_document_library_path};

    #[test]
    fn returns_defaults_when_settings_file_is_missing() {
        let dir = tempdir().unwrap();

        let settings = get_settings(dir.path()).unwrap();

        assert_eq!(settings, AppSettings::default());
    }

    #[test]
    fn persists_and_reads_settings() {
        let dir = tempdir().unwrap();
        let settings = AppSettings {
            auto_save_enabled: false,
            auto_save_interval_ms: 2_500,
            document_library_path: "D:\\Siwei".to_string(),
            default_view_mode: DefaultViewMode::Split,
            sidebar_collapsed: true,
            theme: ThemeMode::Dark,
            focus_mode: true,
            experimental_mind_map_layout_engine: true,
            mind_map_appearance: Default::default(),
            keybindings: Default::default(),
            agent: Default::default(),
        };

        update_settings(dir.path(), settings.clone()).unwrap();

        assert_eq!(get_settings(dir.path()).unwrap(), settings);
    }

    #[test]
    fn reads_legacy_settings_without_theme_fields() {
        let dir = tempdir().unwrap();
        std::fs::write(
            dir.path().join("settings.json"),
            r#"{
              "autoSaveEnabled": false,
              "autoSaveIntervalMs": 2500,
              "defaultViewMode": "split",
              "sidebarCollapsed": true,
              "agent": {
                "enabled": false,
                "provider": "openai-compatible",
                "model": "gpt-4.1",
                "baseUrl": "https://api.openai.com/v1",
                "thinkingLevel": "medium",
                "contextScope": "currentDocument"
              }
            }"#,
        )
        .unwrap();

        let settings = get_settings(dir.path()).unwrap();

        assert_eq!(settings.default_view_mode, DefaultViewMode::Split);
        assert!(settings.document_library_path.is_empty());
        assert_eq!(settings.theme, ThemeMode::System);
        assert!(!settings.focus_mode);
        assert!(!settings.experimental_mind_map_layout_engine);
        assert_eq!(settings.mind_map_appearance, Default::default());
        assert!(settings.keybindings.overrides.is_empty());
    }

    #[test]
    fn fills_new_mind_map_appearance_fields_from_legacy_partial_settings() {
        let dir = tempdir().unwrap();
        std::fs::write(
            dir.path().join("settings.json"),
            r##"{
              "autoSaveEnabled": true,
              "autoSaveIntervalMs": 1500,
              "defaultViewMode": "mindmap",
              "sidebarCollapsed": false,
              "mindMapAppearance": {
                "canvasBackground": "grid",
                "hierarchyLineStyle": "orthogonal"
              },
              "agent": {
                "enabled": false,
                "provider": "openai-compatible",
                "model": "gpt-4.1",
                "baseUrl": "https://api.openai.com/v1",
                "thinkingLevel": "medium",
                "contextScope": "currentDocument"
              }
            }"##,
        )
        .unwrap();

        let settings = get_settings(dir.path()).unwrap();

        assert_eq!(
            settings.mind_map_appearance.canvas_background,
            crate::models::settings::MindMapCanvasBackground::Grid
        );
        assert_eq!(
            settings.mind_map_appearance.hierarchy_line_style,
            crate::models::settings::MindMapHierarchyLineStyle::Orthogonal
        );
        assert_eq!(
            settings.mind_map_appearance.hierarchy_line_pattern,
            crate::models::settings::MindMapHierarchyLinePattern::Solid
        );
        assert_eq!(settings.mind_map_appearance.hierarchy_line_color, "#AA8C72");
        assert_eq!(
            settings.mind_map_appearance.node_shape,
            crate::models::settings::MindMapNodeShape::Rounded
        );
    }

    #[test]
    fn persists_keybinding_overrides() {
        let dir = tempdir().unwrap();
        let mut settings = AppSettings::default();
        settings
            .keybindings
            .overrides
            .insert("mindmap.insertChild".to_string(), vec!["Tab".to_string()]);

        update_settings(dir.path(), settings.clone()).unwrap();

        assert_eq!(get_settings(dir.path()).unwrap(), settings);
    }

    #[test]
    fn corrupted_settings_file_falls_back_to_defaults() {
        let dir = tempdir().unwrap();
        std::fs::write(dir.path().join("settings.json"), "{ broken json").unwrap();

        let settings = get_settings(dir.path()).unwrap();

        assert_eq!(settings, AppSettings::default());
    }

    #[test]
    fn rejects_auto_save_interval_outside_allowed_range() {
        let dir = tempdir().unwrap();
        let settings = AppSettings {
            auto_save_interval_ms: 100,
            ..AppSettings::default()
        };

        let error = update_settings(dir.path(), settings)
            .unwrap_err()
            .to_string();

        assert!(error.contains("自动保存延迟必须在 500-10000 毫秒之间"));
    }

    #[test]
    fn rejects_invalid_mind_map_colors() {
        let dir = tempdir().unwrap();
        let mut settings = AppSettings::default();
        settings.mind_map_appearance.hierarchy_line_color = "not-a-color".to_string();

        let error = update_settings(dir.path(), settings)
            .unwrap_err()
            .to_string();

        assert!(error.contains("#RRGGBB"));
    }

    #[test]
    fn fills_legacy_empty_document_library_path_with_platform_default() {
        let settings = with_default_document_library_path(
            AppSettings::default(),
            std::path::Path::new("C:\\Users\\tester\\Documents\\Siwei"),
        );

        assert_eq!(
            settings.document_library_path,
            "C:\\Users\\tester\\Documents\\Siwei"
        );
    }
}
