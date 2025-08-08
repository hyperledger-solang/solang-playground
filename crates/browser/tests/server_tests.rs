use solang::languageserver::{Files, GlobalCache, SolangServer};
use std::collections::HashMap;
use std::str::FromStr;
use tokio::sync::Mutex;
use tower_lsp::lsp_types::{Diagnostic, DiagnosticSeverity, Position, Range};
use tower_lsp::LspService;
use tower_test::mock::Spawn;

use solang::Target;

#[cfg(test)]
mod tests {

    use super::*;

    const INITIALIZE_REQUEST: &'static str = r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"processId":null,"clientInfo":{"name":"demo-language-client"},"capabilities":{},"rootUri":null}}"#;
    const INITIALIZE_EXPECTED_RESPONSE: &'static str = r#"{"jsonrpc":"2.0","result":{"capabilities":{"completionProvider":{"resolveProvider":false,"triggerCharacters":["."]},"declarationProvider":true,"definitionProvider":true,"documentFormattingProvider":true,"executeCommandProvider":{"commands":[]},"hoverProvider":true,"implementationProvider":true,"referencesProvider":true,"renameProvider":true,"signatureHelpProvider":{},"textDocumentSync":2,"typeDefinitionProvider":true,"workspace":{"workspaceFolders":{"changeNotifications":true,"supported":true}},"workspaceSymbolProvider":true}},"id":1}"#;

    const INITALIZED: &str = r#"{"jsonrpc":"2.0","method":"initialized","params":{}}"#;

    const TEXTDOCUMENT_DIDOPEN: &'static str = r#" {"jsonrpc":"2.0","method":"textDocument/didOpen","params":{"textDocument":{"uri":"inmemory://demo.js","languageId":"solidity","version":0,"text":"    // SPDX-License-Identifier: MIT\n    pragma solidity >=0.6.12 <0.9.0;\n    contract HelloWorld {\n      /**\n       * @dev Prints Hello World string\n       */\n      function print() public pure returns (string memory) {\n        return \"Hello World!\";\n      }\n    }\n"}}}"#;

    const DIAGNOSTIC_REQUEST: &str = r#"{"jsonrpc":"2.0","id":3,"method":"textDocument/diagnostic","params":{"textDocument":{"uri":"inmemory://demo.js","languageId":"solidity","version":0,"text":"    // SPDX-License-Identifier: MIT\n    pragma solidity >=0.6.12 <0.9.0;\n    contract HelloWorld {\n      /**\n       * @dev Prints Hello World string\n       */\n      function print() public pure returns (string memory) {\n        return \"Hello World!\";\n      }\n    }\n"}}}"#;

    const CHANGE_DOCUMENT_REQUEST: &str = r#"{"jsonrpc":"2.0","method":"textDocument/didChange","params":{"textDocument":{"version":0,"uri":"inmemory://demo.js"},"contentChanges":[{"range":{"start":{"line":0,"character":0},"end":{"line":11,"character":0}},"text":"    // SPDX-License-Identifier: MIT\n    pragma solidity >=0.6.12 <0.9.0;\n    contract HelloWorld {\n      uint sesa;\n      /**\n       * @dev Prints Hello World string\n       */\n      function print() public pure returns (string memory) {\n        return \"Hello World!\";\n      }\n    }\n"}]}}"#;

    fn create_mock_service() -> Spawn<LspService<SolangServer>> {
        let importpaths = Vec::new();
        let importmaps = Vec::new();

        let (service, _messages) = LspService::new(|client| SolangServer {
            client,
            target: Target::Solana,
            importpaths,
            importmaps,
            files: Mutex::new(Files {
                caches: HashMap::new(),
                text_buffers: HashMap::new(),
                diagnostics: HashMap::new(),
            }),
            global_cache: Mutex::new(GlobalCache {
                definitions: HashMap::new(),
                types: HashMap::new(),
                implementations: HashMap::new(),
                declarations: HashMap::new(),
                properties: HashMap::new(),
            }),
        });

        tower_test::mock::Spawn::new(service)
    }

    #[tokio::test]
    pub async fn language_server_workflow() {
        let mut mock_service = create_mock_service();

        // Step 1: Test initialize request
        let initialize_request = tower_lsp::jsonrpc::Request::from_str(INITIALIZE_REQUEST).unwrap();
        let call_res = mock_service.call(initialize_request).await.unwrap();
        let expected_res = tower_lsp::jsonrpc::Response::from_str(INITIALIZE_EXPECTED_RESPONSE).unwrap();
        assert_eq!(call_res.unwrap(), expected_res);

        // Step 2: Send Initialized notification
        let initialized_request = tower_lsp::jsonrpc::Request::from_str(INITALIZED).unwrap();
        let _call_res = mock_service.call(initialized_request).await.unwrap();

        // Step 3: Test open document request. This calls parse_file and publishes diagnostics
        let open_document_request = tower_lsp::jsonrpc::Request::from_str(TEXTDOCUMENT_DIDOPEN).unwrap();
        let _call_res = mock_service.call(open_document_request).await.unwrap();

        // Step 4: get diagnostics, and check if the diagnostics are as expected
        let diagnostic_request = tower_lsp::jsonrpc::Request::from_str(DIAGNOSTIC_REQUEST);
        let call_res = mock_service.call(diagnostic_request.unwrap()).await.unwrap().unwrap();

        let expected_diagnostics = Diagnostic {
            range: Range {
                start: Position { line: 6, character: 15 },
                end: Position { line: 6, character: 20 },
            },
            severity: Some(DiagnosticSeverity::WARNING),
            code: None,
            code_description: None,
            source: None,
            message: String::from("'print' shadows name of a builtin"),
            related_information: None,
            tags: None,
            data: None,
        };

        let mut binding = call_res.into_parts().1.unwrap();
        let parsed_diags = binding
            .as_object_mut()
            .unwrap()
            .get("items")
            .unwrap()
            .as_array()
            .unwrap()
            .first()
            .unwrap();
        let diags_response: Diagnostic = serde_json::from_value(parsed_diags.clone()).unwrap();

        assert_eq!(diags_response, expected_diagnostics);

        // Step 5: Change the document and check if the diagnostics are updated
        let change_document_request = tower_lsp::jsonrpc::Request::from_str(CHANGE_DOCUMENT_REQUEST).unwrap();
        let _call_res = mock_service.call(change_document_request).await.unwrap();

        // Step 6: get diagnostics, and check if the diagnostics are as expected
        let diagnostic_request = tower_lsp::jsonrpc::Request::from_str(DIAGNOSTIC_REQUEST);
        let call_res = mock_service.call(diagnostic_request.unwrap()).await.unwrap().unwrap();

        let expected_diagnostic_1 = Diagnostic {
            range: Range {
                start: Position { line: 3, character: 6 },
                end: Position { line: 3, character: 15 },
            },
            severity: Some(DiagnosticSeverity::WARNING),
            code: None,
            code_description: None,
            source: None,
            message: String::from("storage variable 'sesa' has never been used"),
            related_information: None,
            tags: None,
            data: None,
        };

        let expected_diagnostic_2 = Diagnostic {
            range: Range {
                start: Position { line: 7, character: 15 },
                end: Position { line: 7, character: 20 },
            },
            severity: Some(DiagnosticSeverity::WARNING),
            code: None,
            code_description: None,
            source: None,
            message: String::from("'print' shadows name of a builtin"),
            related_information: None,
            tags: None,
            data: None,
        };

        let mut binding = call_res.into_parts().1.unwrap();
        let parsed_diags = binding
            .as_object_mut()
            .unwrap()
            .get("items")
            .unwrap()
            .as_array()
            .unwrap();
        let diags_response_1: Diagnostic = serde_json::from_value(parsed_diags[0].clone()).unwrap();
        let diags_response_2: Diagnostic = serde_json::from_value(parsed_diags[1].clone()).unwrap();

        assert_eq!(diags_response_1, expected_diagnostic_1);
        assert_eq!(diags_response_2, expected_diagnostic_2);
    }
}
