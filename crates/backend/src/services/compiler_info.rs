use std::process::Command;

use actix_web::{rt::task::spawn_blocking, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use typescript_type_def::TypeDef;

use crate::services::solang_image::{digest_from_image_ref, solang_docker_image};

#[derive(Deserialize, Serialize, TypeDef, Debug, Clone)]
pub struct CompilerInfoResponse {
    pub compiler_name: String,
    pub compiler_version: String,
    pub image: String,
    pub image_digest: String,
    pub target: String,
    pub output: String,
}

pub async fn route_compiler_info() -> impl Responder {
    let info = spawn_blocking(build_compiler_info)
        .await
        .expect("compiler info task panicked");
    HttpResponse::Ok().json(info)
}

fn build_compiler_info() -> CompilerInfoResponse {
    let image = solang_docker_image();
    let image_digest =
        digest_from_image_ref(&image).or_else(|| detect_image_digest(&image)).unwrap_or_else(|| "Unavailable".to_string());
    let compiler_version = detect_compiler_version(&image).unwrap_or_else(|| "Unavailable".to_string());

    CompilerInfoResponse {
        compiler_name: "Solang".to_string(),
        compiler_version,
        image,
        image_digest,
        target: "Soroban (Stellar Smart Contracts)".to_string(),
        output: "WASM bytecode + ABI JSON".to_string(),
    }
}

fn detect_image_digest(image: &str) -> Option<String> {
    let output = Command::new("docker")
        .args(["image", "inspect", "--format", "{{join .RepoDigests \",\"}}", image])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let digests = String::from_utf8_lossy(&output.stdout);
    digests
        .split(',')
        .find_map(|item| item.split_once('@').map(|(_, digest)| digest.trim().to_string()))
        .filter(|digest| digest.starts_with("sha256:"))
}

fn detect_compiler_version(image: &str) -> Option<String> {
    if let Some(version) = inspect_image_version_label(image) {
        return Some(version);
    }

    let output = Command::new("docker")
        .args(["run", "--rm", "--entrypoint", "solang", image, "--version"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    if let Some(version) = parse_version(&stdout) {
        return Some(version);
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    parse_version(&stderr)
}

fn inspect_image_version_label(image: &str) -> Option<String> {
    let output = Command::new("docker")
        .args([
            "image",
            "inspect",
            "--format",
            "{{ index .Config.Labels \"org.opencontainers.image.version\" }}",
            image,
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let label = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if label.is_empty() || label == "<no value>" {
        None
    } else {
        parse_version(&label).or(Some(label))
    }
}

fn parse_version(output: &str) -> Option<String> {
    let output = output.trim();
    if output.is_empty() {
        return None;
    }

    let re = regex::Regex::new(r"v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.\-]+)?").ok()?;
    re.find(output).map(|m| normalize_version(m.as_str()))
}

fn normalize_version(version: &str) -> String {
    let trimmed = version.trim();
    if trimmed.starts_with('v') {
        trimmed.to_string()
    } else {
        format!("v{trimmed}")
    }
}
