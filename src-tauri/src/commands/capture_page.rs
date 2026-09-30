use serde_json::Value;
use std::path::PathBuf;
use std::process::Command;

fn project_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().expect("src-tauri must have a project parent directory").to_path_buf()
}

#[tauri::command]
pub fn capture_page(url: String) -> Result<Value, String> {
    let root = project_root();
    let script = root.join("engine/cli/capture-page.ts");
    let output = Command::new("node").arg("--experimental-strip-types").arg(script).arg(url).current_dir(&root).output().map_err(|error| format!("Failed to start the capture engine: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() { "The capture engine exited without an error message.".to_string() } else { stderr });
    }
    serde_json::from_slice(&output.stdout).map_err(|error| format!("Capture engine returned invalid JSON: {error}"))
}
