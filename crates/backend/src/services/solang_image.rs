use std::env;

pub const SOLANG_DOCKER_IMAGE_ENV: &str = "SOLANG_DOCKER_IMAGE";
pub const DEFAULT_SOLANG_DOCKER_IMAGE: &str =
    "ghcr.io/hyperledger-solang/solang:latest";

pub fn solang_docker_image() -> String {
    env::var(SOLANG_DOCKER_IMAGE_ENV)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_SOLANG_DOCKER_IMAGE.to_string())
}

pub fn digest_from_image_ref(image_ref: &str) -> Option<String> {
    let (_, digest) = image_ref.split_once('@')?;
    let digest = digest.trim();
    if digest.starts_with("sha256:") && digest.len() > "sha256:".len() {
        Some(digest.to_string())
    } else {
        None
    }
}
