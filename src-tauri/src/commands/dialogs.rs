use std::{path::Path, process::Command};

use tauri_plugin_dialog::DialogExt;

use crate::utils::error::{AppError, CommandResult};

#[tauri::command]
pub fn open_file_dialog(app: tauri::AppHandle, filters: Vec<String>) -> Option<String> {
    let mut dialog = app.dialog().file();
    if !filters.is_empty() {
        let extensions: Vec<&str> = filters.iter().map(String::as_str).collect();
        dialog = dialog.add_filter("Supported files", &extensions);
    }

    dialog
        .blocking_pick_file()
        .and_then(|path| path.as_path().map(|path| path.display().to_string()))
}

#[tauri::command]
pub fn save_file_dialog(app: tauri::AppHandle, default_name: String) -> Option<String> {
    app.dialog()
        .file()
        .set_file_name(&default_name)
        .blocking_save_file()
        .and_then(|path| path.as_path().map(|path| path.display().to_string()))
}

#[tauri::command]
pub fn open_directory_dialog(app: tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .blocking_pick_folder()
        .and_then(|path| path.as_path().map(|path| path.display().to_string()))
}

#[tauri::command]
pub fn open_file_location(path: String) -> Result<(), String> {
    open_file_location_inner(Path::new(&path)).into_command_result()
}

fn open_file_location_inner(path: &Path) -> Result<(), AppError> {
    let directory = file_location_directory(path)?;

    #[cfg(target_os = "windows")]
    let child = if path.is_file() {
        Command::new("explorer.exe")
            .arg("/select,")
            .arg(path)
            .spawn()
    } else {
        Command::new("explorer.exe").arg(directory).spawn()
    };

    #[cfg(target_os = "macos")]
    let child = if path.is_file() {
        Command::new("open").arg("-R").arg(path).spawn()
    } else {
        Command::new("open").arg(directory).spawn()
    };

    #[cfg(all(unix, not(target_os = "macos")))]
    let child = Command::new("xdg-open").arg(directory).spawn();

    child.map(|_| ()).map_err(|source| AppError::Io {
        operation: "打开文件位置",
        source,
    })
}

fn file_location_directory(path: &Path) -> Result<&Path, AppError> {
    if path.is_dir() {
        return Ok(path);
    }

    path.parent()
        .filter(|parent| parent.exists())
        .ok_or_else(|| AppError::FileNotFound {
            path: path.to_path_buf(),
        })
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::file_location_directory;

    #[test]
    fn uses_parent_directory_for_existing_or_missing_document_files() {
        let dir = tempdir().unwrap();
        let existing = dir.path().join("demo.siwei.json");
        std::fs::write(&existing, "{}").unwrap();
        let missing = dir.path().join("missing.siwei.json");

        assert_eq!(file_location_directory(&existing).unwrap(), dir.path());
        assert_eq!(file_location_directory(&missing).unwrap(), dir.path());
        assert_eq!(file_location_directory(dir.path()).unwrap(), dir.path());
    }
}
