use serde_json::Value;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

fn project_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("src-tauri must have a project parent directory")
        .to_path_buf()
}

#[tauri::command]
pub fn execute_interaction(source_capture: Value, interaction: Value) -> Result<Value, String> {
    let root = project_root();
    let script = root.join("engine/cli/execute-interaction.ts");
    let input = serde_json::json!({
        "sourceCapture": source_capture,
        "interaction": interaction,
    });

    let mut child = Command::new("node")
        .arg("--experimental-strip-types")
        .arg(script)
        .current_dir(&root)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to start the interaction engine: {error}"))?;

    child
        .stdin
        .take()
        .ok_or_else(|| "Failed to open interaction engine input.".to_string())?
        .write_all(input.to_string().as_bytes())
        .map_err(|error| format!("Failed to send interaction data to the engine: {error}"))?;

    let output = child
        .wait_with_output()
        .map_err(|error| format!("Failed while waiting for the interaction engine: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "The interaction engine exited without an error message.".to_string()
        } else {
            stderr
        });
    }

    serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Interaction engine returned invalid JSON: {error}"))
}
