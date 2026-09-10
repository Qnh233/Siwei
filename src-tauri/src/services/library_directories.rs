use std::{fs, path::Path};

use crate::utils::error::{AppError, AppResult};

const MAX_LIBRARY_DIRECTORIES: usize = 5_000;
const MAX_LIBRARY_DIRECTORY_DEPTH: usize = 64;

pub fn list_library_directories(root: impl AsRef<Path>) -> AppResult<Vec<String>> {
    let root = root.as_ref();
    if !root.exists() {
        return Ok(Vec::new());
    }
    if !root.is_dir() {
        return Err(AppError::Validation("文档库路径不是文件夹".into()));
    }

    let mut directories = Vec::new();
    collect_directories(root, root, 0, &mut directories)?;
    directories.sort();
    Ok(directories)
}

fn collect_directories(
    root: &Path,
    current: &Path,
    depth: usize,
    directories: &mut Vec<String>,
) -> AppResult<()> {
    if depth >= MAX_LIBRARY_DIRECTORY_DEPTH || directories.len() >= MAX_LIBRARY_DIRECTORIES {
        return Ok(());
    }

    let entries = fs::read_dir(current).map_err(|source| AppError::Io {
        operation: "读取文档库目录",
        source,
    })?;

    for entry in entries {
        if directories.len() >= MAX_LIBRARY_DIRECTORIES {
            break;
        }
        let entry = entry.map_err(|source| AppError::Io {
            operation: "读取文档库目录项",
            source,
        })?;
        let file_type = entry.file_type().map_err(|source| AppError::Io {
            operation: "读取文档库目录项类型",
            source,
        })?;

        // 不跟随符号链接，避免扫描逃逸出配置的文档库根目录或形成循环。
        if !file_type.is_dir() || file_type.is_symlink() {
            continue;
        }

        let path = entry.path();
        let relative = path.strip_prefix(root).unwrap_or(&path);
        directories.push(relative.to_string_lossy().replace('\\', "/"));
        collect_directories(root, &path, depth + 1, directories)?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::list_library_directories;

    #[test]
    fn lists_empty_and_nested_subdirectories() {
        let temp = tempdir().unwrap();
        fs::create_dir_all(temp.path().join("Work/Daily")).unwrap();
        fs::create_dir_all(temp.path().join("Empty")).unwrap();
        fs::write(temp.path().join("root.siwei.json"), "{}").unwrap();

        let directories = list_library_directories(temp.path()).unwrap();

        assert_eq!(directories, vec!["Empty", "Work", "Work/Daily"]);
    }

    #[test]
    fn missing_library_root_returns_empty_list() {
        let temp = tempdir().unwrap();
        let directories = list_library_directories(temp.path().join("missing")).unwrap();
        assert!(directories.is_empty());
    }
}
