use tauri::Manager;

use crate::{
    models::AppSettings,
    services::settings_service,
    utils::error::{AppError, CommandResult},
};

#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    app_data_dir(&app)
        .and_then(settings_service::get_settings)
        .and_then(|settings| {
            default_document_library_dir(&app).map(|default_dir| {
                settings_service::with_default_document_library_path(settings, default_dir)
            })
        })
        .into_command_result()
}

#[tauri::command]
pub fn update_settings(
    app: tauri::AppHandle,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    app_data_dir(&app)
        .and_then(|dir| {
            default_document_library_dir(&app).and_then(|default_dir| {
                let settings =
                    settings_service::with_default_document_library_path(settings, default_dir);
                settings_service::update_settings(dir, settings)
            })
        })
        .into_command_result()
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, AppError> {
    app.path().app_data_dir().map_err(|source| AppError::Tauri {
        operation: "获取应用数据目录",
        source,
    })
}

pub(crate) fn default_document_library_dir(
    app: &tauri::AppHandle,
) -> Result<std::path::PathBuf, AppError> {
    app.path()
        .document_dir()
        .map(|path| path.join("Siwei"))
        .map_err(|source| AppError::Tauri {
            operation: "获取系统文档目录",
            source,
        })
}
