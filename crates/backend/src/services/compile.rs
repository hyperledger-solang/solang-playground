use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use actix_web::{rt::task::spawn_blocking, web::Json, HttpResponse, Responder};
use typescript_type_def::TypeDef;

use crate::services::sandbox::Sandbox;

/// Request to compile a contract
#[derive(Deserialize, Serialize, TypeDef, Debug, Clone)]
pub struct CompilationRequest {
    /// The source code of the main contract file
    pub source: String,
    /// The name of the main file to compile (optional, defaults to "input.sol")
    #[serde(default)]
    pub main_file: Option<String>,
    /// Additional files in the workspace (filename -> content)
    #[serde(default)]
    pub files: Option<HashMap<String, String>>,
    /// Extra compiler flags (for example "--optimize")
    #[serde(default)]
    pub compiler_flags: Option<Vec<String>>,
}

/// Response from compiling a contract
#[derive(Deserialize, Serialize, TypeDef, PartialEq, Debug, Clone, Eq)]
#[serde(tag = "type", content = "payload", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CompilationResult {
    Success {
        /// The compiled contract
        wasm: Vec<u8>,
        /// The standard output of the docker command   
        stdout: String,
        /// The standard error of the docker command
        stderr: String,
        /// The standard output of the compile command
        compile_stdout: String,
        /// The standard error of the compile command
        compile_stderr: String,
    },
    Error {
        /// The standard output of the docker command
        stdout: String,
        /// The standard error of the docker command
        stderr: String,
        /// The standard output of the compile command
        compile_stdout: String,
        /// The standard error of the compile command
        compile_stderr: String,
    },
}

/// Compile a contract
///
/// This function is called when a POST request is made to `/compile`
pub async fn route_compile(req: Json<CompilationRequest>) -> impl Responder {
    let compile_result = spawn_blocking(move || {
        let sandbox = Sandbox::new()?;
        sandbox.compile(&CompilationRequest {
            source: req.source.clone(),
            main_file: req.main_file.clone(),
            files: req.files.clone(),
            compiler_flags: req.compiler_flags.clone(),
        })
    })
    .await
    .expect("Contract compilation panicked");

    match compile_result {
        Ok(result) => {
            let compile_result = serde_json::to_string(&result).unwrap();
            HttpResponse::Ok().body(compile_result)
        },
        Err(err) => {
            eprintln!("{:?}", err);
            HttpResponse::InternalServerError().finish()
        },
    }
}
