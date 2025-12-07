import * as monaco from "monaco-editor";
import contributes from "./contributes.json";
import { solidityTokensProvider, solidityLanguageConfig } from "./solidity_syntax";
import * as proto from "vscode-languageserver-protocol";
import { Monaco } from "@monaco-editor/react";
import Client from "../client";
import { monacoToProtocol, protocolToMonaco } from "../utils";
import { store } from "@/state";

const THEME_NAME = "solidity-dark";

// Extract filename from LSP URI like file:///workspace/utils.sol -> utils.sol
function extractFilenameFromUri(uri: string): string {
  return uri.replace('file:///workspace/', '');
}

// Find the state path for a given filename by searching through workspace files
function findFilePathInWorkspace(filename: string): string | null {
  const state = store.getSnapshot();
  const files = state.context.files;
  
  for (const path of Object.keys(files)) {
    // Path format: explorer.items.src.items['main.sol']
    if (path.endsWith(`['${filename}']`)) {
      return path;
    }
  }
  return null;
}

let language: null | Language;

export default class Language implements monaco.languages.ILanguageExtensionPoint {
  readonly id: string;
  readonly aliases: string[];
  readonly extensions: string[];
  readonly mimetypes: string[];

  private constructor(client: Client, monaco: Monaco) {
    const { id, aliases, extensions, mimetypes } = Language.extensionPoint();
    this.id = id;
    this.aliases = aliases;
    this.extensions = extensions;
    this.mimetypes = mimetypes;
    this.registerLanguage(client, monaco);
  }

  static extensionPoint(): monaco.languages.ILanguageExtensionPoint & {
    aliases: string[];
    extensions: string[];
    mimetypes: string[];
  } {
    const id = contributes.contributes.languages[0].id;
    const aliases = contributes.contributes.languages[0].aliases;
    const extensions = contributes.contributes.languages[0].extensions;
    const mimetypes = ["text/x-solidity"]; // This is a common MIME type for Solidity, but you may need to adjust it

    return { id, extensions, aliases, mimetypes };
  }

  private registerLanguage(client: Client, monaco: Monaco): void {
    void client;
    monaco.languages.register({ id: "solidity" });

    monaco.languages.setMonarchTokensProvider("solidity", solidityTokensProvider as any);
    monaco.languages.setLanguageConfiguration("solidity", solidityLanguageConfig as any);

    // LSP Completion Provider
    // Note: Member completions for imported libraries (e.g., MathUtils.add after typing "MathUtils.")
    // is a known limitation of the Solang WASM LSP. The LSP may not return member completions
    // for symbols defined in other files. This would require changes to the upstream Solang
    // compiler's LSP implementation at https://github.com/hyperledger/solang
    monaco.languages.registerCompletionItemProvider(this.id, {
      triggerCharacters: ['.', '(', ',', ' '],
      async provideCompletionItems(model, position, context, token): Promise<monaco.languages.CompletionList> {
        void token;
        try {
          const response = await (client.request(proto.CompletionRequest.type.method, {
            textDocument: monacoToProtocol.asTextDocumentIdentifier(model),
            position: monacoToProtocol.asPosition(position.column, position.lineNumber),
            context: monacoToProtocol.asCompletionContext(context),
          } as proto.CompletionParams) as Promise<proto.CompletionList>);

          const word = model.getWordUntilPosition(position);
          const result: monaco.languages.CompletionList = protocolToMonaco.asCompletionResult(response, {
            startLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: word.endColumn,
          });

          return result;
        } catch (error) {
          console.log("Completion error:", error);
          return { suggestions: [] };
        }
      },
    });

    // Go to Definition with cross-file navigation support
    monaco.languages.registerDefinitionProvider(this.id, {
      async provideDefinition(model, position, token): Promise<monaco.languages.Definition | null> {
        void token;
        try {
          const response = await (client.request(proto.DefinitionRequest.type.method, {
            textDocument: monacoToProtocol.asTextDocumentIdentifier(model),
            position: monacoToProtocol.asPosition(position.column, position.lineNumber),
          } as proto.DefinitionParams) as Promise<proto.Location | proto.Location[] | null>);

          if (!response) return null;

          const locations = Array.isArray(response) ? response : [response];
          const currentUri = model.uri.toString();
          
          // Process each location
          return locations.map(loc => {
            const targetUri = loc.uri;
            
            // Check if we need to navigate to a different file
            if (targetUri !== currentUri) {
              const filename = extractFilenameFromUri(targetUri);
              const workspacePath = findFilePathInWorkspace(filename);
              
              if (workspacePath) {
                // Schedule file switch - use setTimeout to avoid blocking the definition response
                setTimeout(() => {
                  store.send({ type: "setCurrentPath", path: workspacePath });
                }, 10);
              }
            }
            
            return {
              uri: monaco.Uri.parse(loc.uri),
              range: {
                startLineNumber: loc.range.start.line + 1,
                startColumn: loc.range.start.character + 1,
                endLineNumber: loc.range.end.line + 1,
                endColumn: loc.range.end.character + 1,
              }
            };
          });
        } catch (error) {
          console.log("Definition error:", error);
          return null;
        }
      }
    });

    // Find References
    monaco.languages.registerReferenceProvider(this.id, {
      async provideReferences(model, position, context, token): Promise<monaco.languages.Location[]> {
        void token;
        try {
          const response = await (client.request(proto.ReferencesRequest.type.method, {
            textDocument: monacoToProtocol.asTextDocumentIdentifier(model),
            position: monacoToProtocol.asPosition(position.column, position.lineNumber),
            context: { includeDeclaration: context.includeDeclaration }
          } as proto.ReferenceParams) as Promise<proto.Location[] | null>);

          if (!response) return [];

          return response.map(loc => ({
            uri: monaco.Uri.parse(loc.uri),
            range: {
              startLineNumber: loc.range.start.line + 1,
              startColumn: loc.range.start.character + 1,
              endLineNumber: loc.range.end.line + 1,
              endColumn: loc.range.end.character + 1,
            }
          }));
        } catch (error) {
          console.log("References error:", error);
          return [];
        }
      }
    });

    // Signature Help (function parameter hints)
    monaco.languages.registerSignatureHelpProvider(this.id, {
      signatureHelpTriggerCharacters: ['(', ','],
      signatureHelpRetriggerCharacters: [','],
      async provideSignatureHelp(model, position, token, context): Promise<monaco.languages.SignatureHelpResult | null> {
        void token;
        void context;
        try {
          const response = await (client.request(proto.SignatureHelpRequest.type.method, {
            textDocument: monacoToProtocol.asTextDocumentIdentifier(model),
            position: monacoToProtocol.asPosition(position.column, position.lineNumber),
          } as proto.SignatureHelpParams) as Promise<proto.SignatureHelp | null>);

          if (!response || !response.signatures.length) return null;

          return {
            value: {
              signatures: response.signatures.map(sig => ({
                label: sig.label,
                documentation: sig.documentation ? 
                  (typeof sig.documentation === 'string' ? sig.documentation : sig.documentation.value) : 
                  undefined,
                parameters: (sig.parameters || []).map(param => ({
                  label: param.label as string,
                  documentation: param.documentation ?
                    (typeof param.documentation === 'string' ? param.documentation : param.documentation.value) :
                    undefined
                }))
              })),
              activeSignature: response.activeSignature ?? 0,
              activeParameter: response.activeParameter ?? 0
            },
            dispose: () => {}
          };
        } catch (error) {
          console.log("SignatureHelp error:", error);
          return null;
        }
      }
    });

    // Import Path Completion Provider
    // Suggests files from workspace when typing import paths like import "./ut"
    monaco.languages.registerCompletionItemProvider(this.id, {
      triggerCharacters: ['"', "'", '/', '.'],
      provideCompletionItems: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const textUntilPosition = lineContent.substring(0, position.column - 1);
        
        // Check if we're inside an import statement string
        const importMatch = textUntilPosition.match(/import\s+["']([^"']*)$/);
        if (!importMatch) {
          return { suggestions: [] };
        }
        
        const partialPath = importMatch[1]; // e.g., "./ut" or "ut"
        
        // Get all .sol files from the workspace
        const state = store.getSnapshot();
        const files = state.context.files;
        const solFiles: string[] = [];
        
        for (const path of Object.keys(files)) {
          // Extract filename from path like explorer.items.src.items['main.sol']
          const match = path.match(/\['([^']+\.sol)'\]$/);
          if (match) {
            solFiles.push(match[1]);
          }
        }
        
        // Filter files that match the partial path
        const searchTerm = partialPath.replace(/^\.\//, '').toLowerCase();
        const matchingFiles = solFiles.filter(file => 
          file.toLowerCase().includes(searchTerm)
        );
        
        // Calculate the range to replace (the partial path)
        const startColumn = position.column - partialPath.length;
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: startColumn,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        };
        
        // Create completion items
        const suggestions: monaco.languages.CompletionItem[] = matchingFiles.map(file => ({
          label: file,
          kind: monaco.languages.CompletionItemKind.File,
          insertText: `./${file}`,
          documentation: `Import ${file}`,
          range,
          sortText: '0' + file, // Sort files first
        }));
        
        return { suggestions };
      }
    });

    // Solidity Code Snippets
    monaco.languages.registerCompletionItemProvider(this.id, {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        };

        const snippets: monaco.languages.CompletionItem[] = [
          {
            label: 'contract',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'contract ${1:ContractName} {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a new contract',
            range,
          },
          {
            label: 'function',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'function ${1:name}(${2:params}) ${3:public} ${4:returns (${5:type})} {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a new function',
            range,
          },
          {
            label: 'constructor',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'constructor(${1:params}) {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a constructor',
            range,
          },
          {
            label: 'modifier',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'modifier ${1:name}(${2:params}) {\n\t${3:require(${4:condition}, "${5:error message}");}\n\t_;\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a modifier',
            range,
          },
          {
            label: 'event',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'event ${1:EventName}(${2:params});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create an event',
            range,
          },
          {
            label: 'struct',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'struct ${1:StructName} {\n\t${2:uint256 value;}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a struct',
            range,
          },
          {
            label: 'enum',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'enum ${1:EnumName} {\n\t${2:Value1},\n\t${3:Value2}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create an enum',
            range,
          },
          {
            label: 'mapping',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'mapping(${1:address} => ${2:uint256}) ${3:public} ${4:name};',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a mapping',
            range,
          },
          {
            label: 'require',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'require(${1:condition}, "${2:error message}");',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Add a require statement',
            range,
          },
          {
            label: 'emit',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'emit ${1:EventName}(${2:params});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Emit an event',
            range,
          },
          {
            label: 'ifelse',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'if (${1:condition}) {\n\t$2\n} else {\n\t$3\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'If-else statement',
            range,
          },
          {
            label: 'forloop',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'for (uint256 ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'For loop',
            range,
          },
          {
            label: 'pragma',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'pragma solidity ^${1:0.8.0};',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Pragma directive',
            range,
          },
          {
            label: 'import',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'import "${1:path}";',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Import statement',
            range,
          },
          {
            label: 'error',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'error ${1:ErrorName}(${2:params});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Custom error definition',
            range,
          },
        ];

        return { suggestions: snippets };
      }
    });

    // Keyword and Type Completion Provider
    monaco.languages.registerCompletionItemProvider(this.id, {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        };

        // Type keywords with documentation
        const typeCompletions: monaco.languages.CompletionItem[] = [
          // Integer types
          ...['uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uint128', 'uint256'].map(t => ({
            label: t,
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            insertText: t,
            documentation: `Unsigned integer type (${t === 'uint' ? '256 bits' : t.replace('uint', '') + ' bits'})`,
            range,
            sortText: '0' + t, // Sort types first
          })),
          ...['int', 'int8', 'int16', 'int32', 'int64', 'int128', 'int256'].map(t => ({
            label: t,
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            insertText: t,
            documentation: `Signed integer type (${t === 'int' ? '256 bits' : t.replace('int', '') + ' bits'})`,
            range,
            sortText: '0' + t,
          })),
          // Bytes types
          { label: 'bytes', kind: monaco.languages.CompletionItemKind.TypeParameter, insertText: 'bytes', documentation: 'Dynamic byte array', range, sortText: '0bytes' },
          ...Array.from({ length: 32 }, (_, i) => ({
            label: `bytes${i + 1}`,
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            insertText: `bytes${i + 1}`,
            documentation: `Fixed-size byte array (${i + 1} bytes)`,
            range,
            sortText: `0bytes${String(i + 1).padStart(2, '0')}`,
          })),
          // Other types
          { label: 'address', kind: monaco.languages.CompletionItemKind.TypeParameter, insertText: 'address', documentation: 'Ethereum address (20 bytes)', range, sortText: '0address' },
          { label: 'bool', kind: monaco.languages.CompletionItemKind.TypeParameter, insertText: 'bool', documentation: 'Boolean type (true/false)', range, sortText: '0bool' },
          { label: 'string', kind: monaco.languages.CompletionItemKind.TypeParameter, insertText: 'string', documentation: 'Dynamic string type', range, sortText: '0string' },
        ];

        // Visibility and modifier keywords
        const visibilityCompletions: monaco.languages.CompletionItem[] = [
          { label: 'public', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'public', documentation: 'Visible externally and internally', range, sortText: '1public' },
          { label: 'private', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'private', documentation: 'Only visible in current contract', range, sortText: '1private' },
          { label: 'internal', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'internal', documentation: 'Only visible internally (current contract and derived)', range, sortText: '1internal' },
          { label: 'external', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'external', documentation: 'Only visible externally (called via this.f() internally)', range, sortText: '1external' },
          { label: 'view', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'view', documentation: 'Function does not modify state', range, sortText: '1view' },
          { label: 'pure', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'pure', documentation: 'Function does not read or modify state', range, sortText: '1pure' },
          { label: 'payable', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'payable', documentation: 'Function can receive Ether', range, sortText: '1payable' },
          { label: 'virtual', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'virtual', documentation: 'Function can be overridden', range, sortText: '1virtual' },
          { label: 'override', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'override', documentation: 'Function overrides a base function', range, sortText: '1override' },
          { label: 'immutable', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'immutable', documentation: 'Variable set once in constructor', range, sortText: '1immutable' },
          { label: 'constant', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'constant', documentation: 'Compile-time constant', range, sortText: '1constant' },
          { label: 'indexed', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'indexed', documentation: 'Event parameter is indexed for filtering', range, sortText: '1indexed' },
        ];

        // Storage location keywords
        const storageCompletions: monaco.languages.CompletionItem[] = [
          { label: 'memory', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'memory', documentation: 'Data stored in memory (temporary)', range, sortText: '1memory' },
          { label: 'storage', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'storage', documentation: 'Data stored in contract storage (persistent)', range, sortText: '1storage' },
          { label: 'calldata', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'calldata', documentation: 'Read-only data location for function parameters', range, sortText: '1calldata' },
        ];

        // Definition keywords
        const definitionCompletions: monaco.languages.CompletionItem[] = [
          { label: 'contract', kind: monaco.languages.CompletionItemKind.Class, insertText: 'contract', documentation: 'Define a contract', range, sortText: '2contract' },
          { label: 'interface', kind: monaco.languages.CompletionItemKind.Interface, insertText: 'interface', documentation: 'Define an interface', range, sortText: '2interface' },
          { label: 'library', kind: monaco.languages.CompletionItemKind.Module, insertText: 'library', documentation: 'Define a library', range, sortText: '2library' },
          { label: 'abstract', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'abstract', documentation: 'Abstract contract (cannot be deployed directly)', range, sortText: '2abstract' },
          { label: 'function', kind: monaco.languages.CompletionItemKind.Function, insertText: 'function', documentation: 'Define a function', range, sortText: '2function' },
          { label: 'constructor', kind: monaco.languages.CompletionItemKind.Constructor, insertText: 'constructor', documentation: 'Contract constructor', range, sortText: '2constructor' },
          { label: 'modifier', kind: monaco.languages.CompletionItemKind.Function, insertText: 'modifier', documentation: 'Define a modifier', range, sortText: '2modifier' },
          { label: 'event', kind: monaco.languages.CompletionItemKind.Event, insertText: 'event', documentation: 'Define an event', range, sortText: '2event' },
          { label: 'error', kind: monaco.languages.CompletionItemKind.Event, insertText: 'error', documentation: 'Define a custom error', range, sortText: '2error' },
          { label: 'struct', kind: monaco.languages.CompletionItemKind.Struct, insertText: 'struct', documentation: 'Define a struct', range, sortText: '2struct' },
          { label: 'enum', kind: monaco.languages.CompletionItemKind.Enum, insertText: 'enum', documentation: 'Define an enum', range, sortText: '2enum' },
          { label: 'mapping', kind: monaco.languages.CompletionItemKind.TypeParameter, insertText: 'mapping', documentation: 'Define a mapping (key-value store)', range, sortText: '2mapping' },
        ];

        // Control flow keywords
        const controlCompletions: monaco.languages.CompletionItem[] = [
          { label: 'if', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'if', documentation: 'Conditional statement', range, sortText: '3if' },
          { label: 'else', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'else', documentation: 'Else branch', range, sortText: '3else' },
          { label: 'for', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'for', documentation: 'For loop', range, sortText: '3for' },
          { label: 'while', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'while', documentation: 'While loop', range, sortText: '3while' },
          { label: 'do', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'do', documentation: 'Do-while loop', range, sortText: '3do' },
          { label: 'break', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'break', documentation: 'Break out of loop', range, sortText: '3break' },
          { label: 'continue', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'continue', documentation: 'Continue to next iteration', range, sortText: '3continue' },
          { label: 'return', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'return', documentation: 'Return from function', range, sortText: '3return' },
          { label: 'returns', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'returns', documentation: 'Declare return types', range, sortText: '3returns' },
          { label: 'try', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'try', documentation: 'Try block for external calls', range, sortText: '3try' },
          { label: 'catch', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'catch', documentation: 'Catch block for error handling', range, sortText: '3catch' },
          { label: 'revert', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'revert', documentation: 'Revert transaction', range, sortText: '3revert' },
          { label: 'require', kind: monaco.languages.CompletionItemKind.Function, insertText: 'require', documentation: 'Require condition (reverts if false)', range, sortText: '3require' },
          { label: 'assert', kind: monaco.languages.CompletionItemKind.Function, insertText: 'assert', documentation: 'Assert condition (for internal errors)', range, sortText: '3assert' },
        ];

        // Other keywords
        const otherCompletions: monaco.languages.CompletionItem[] = [
          { label: 'pragma', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'pragma', documentation: 'Compiler version directive', range, sortText: '4pragma' },
          { label: 'import', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'import', documentation: 'Import statement', range, sortText: '4import' },
          { label: 'using', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'using', documentation: 'Using directive for libraries', range, sortText: '4using' },
          { label: 'is', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'is', documentation: 'Contract inheritance', range, sortText: '4is' },
          { label: 'new', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'new', documentation: 'Create new contract instance', range, sortText: '4new' },
          { label: 'delete', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'delete', documentation: 'Reset variable to default value', range, sortText: '4delete' },
          { label: 'emit', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'emit', documentation: 'Emit an event', range, sortText: '4emit' },
          { label: 'this', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'this', documentation: 'Current contract instance', range, sortText: '4this' },
          { label: 'super', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'super', documentation: 'Parent contract', range, sortText: '4super' },
          { label: 'true', kind: monaco.languages.CompletionItemKind.Constant, insertText: 'true', documentation: 'Boolean true', range, sortText: '4true' },
          { label: 'false', kind: monaco.languages.CompletionItemKind.Constant, insertText: 'false', documentation: 'Boolean false', range, sortText: '4false' },
        ];

        // Built-in globals
        const builtinCompletions: monaco.languages.CompletionItem[] = [
          { label: 'msg', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'msg', documentation: 'Message context (msg.sender, msg.value, msg.data)', range, sortText: '5msg' },
          { label: 'block', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'block', documentation: 'Block info (block.number, block.timestamp)', range, sortText: '5block' },
          { label: 'tx', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'tx', documentation: 'Transaction info (tx.origin, tx.gasprice)', range, sortText: '5tx' },
          { label: 'abi', kind: monaco.languages.CompletionItemKind.Module, insertText: 'abi', documentation: 'ABI encoding/decoding functions', range, sortText: '5abi' },
          { label: 'keccak256', kind: monaco.languages.CompletionItemKind.Function, insertText: 'keccak256', documentation: 'Keccak-256 hash function', range, sortText: '5keccak256' },
          { label: 'sha256', kind: monaco.languages.CompletionItemKind.Function, insertText: 'sha256', documentation: 'SHA-256 hash function', range, sortText: '5sha256' },
          { label: 'ecrecover', kind: monaco.languages.CompletionItemKind.Function, insertText: 'ecrecover', documentation: 'Recover address from signature', range, sortText: '5ecrecover' },
          { label: 'selfdestruct', kind: monaco.languages.CompletionItemKind.Function, insertText: 'selfdestruct', documentation: 'Destroy contract and send funds', range, sortText: '5selfdestruct' },
          { label: 'gasleft', kind: monaco.languages.CompletionItemKind.Function, insertText: 'gasleft', documentation: 'Remaining gas', range, sortText: '5gasleft' },
          { label: 'blockhash', kind: monaco.languages.CompletionItemKind.Function, insertText: 'blockhash', documentation: 'Hash of a block (last 256 blocks)', range, sortText: '5blockhash' },
        ];

        return {
          suggestions: [
            ...typeCompletions,
            ...visibilityCompletions,
            ...storageCompletions,
            ...definitionCompletions,
            ...controlCompletions,
            ...otherCompletions,
            ...builtinCompletions,
          ]
        };
      }
    });

    // Define a beautiful Solidity theme with distinct colors
    monaco.editor.defineTheme(THEME_NAME, {
      base: "vs-dark",
      inherit: true,
      rules: [
        // Types (uint32, address, bool, etc.) - Cyan/Teal
        { token: "type", foreground: "4EC9B0", fontStyle: "" },
        
        // Definition keywords (contract, function, struct, etc.) - Blue
        { token: "keyword.definition", foreground: "569CD6", fontStyle: "" },
        
        // Control flow (if, else, for, while, return, etc.) - Magenta/Purple
        { token: "keyword.control", foreground: "C586C0", fontStyle: "" },
        
        // Visibility modifiers (public, private, view, pure, etc.) - Light Blue
        { token: "keyword.visibility", foreground: "9CDCFE", fontStyle: "" },
        
        // Storage keywords (memory, storage, calldata) - Orange
        { token: "keyword.storage", foreground: "CE9178", fontStyle: "italic" },
        
        // Other keywords (pragma, import, etc.) - Blue
        { token: "keyword", foreground: "569CD6", fontStyle: "" },
        
        // Constants (true, false, wei, ether, etc.) - Light orange
        { token: "constant", foreground: "B5CEA8", fontStyle: "" },
        
        // Built-in objects and functions (msg, block, require, etc.) - Light Yellow
        { token: "variable.predefined", foreground: "DCDCAA", fontStyle: "" },
        
        // Identifiers (variable names) - Light blue/white
        { token: "identifier", foreground: "9CDCFE", fontStyle: "" },
        
        // Operators - White
        { token: "operator", foreground: "D4D4D4", fontStyle: "" },
        
        // Delimiters (braces, brackets, etc.)
        { token: "delimiter", foreground: "D4D4D4", fontStyle: "" },
        
        // Numbers - Light green
        { token: "number", foreground: "B5CEA8", fontStyle: "" },
        { token: "number.hex", foreground: "B5CEA8", fontStyle: "" },
        { token: "number.float", foreground: "B5CEA8", fontStyle: "" },
        
        // Strings - Orange
        { token: "string", foreground: "CE9178", fontStyle: "" },
        { token: "string.escape", foreground: "D7BA7D", fontStyle: "" },
        
        // Comments - Green
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "comment.doc", foreground: "6A9955", fontStyle: "italic" },
        { token: "comment.doc.tag", foreground: "569CD6", fontStyle: "" },
        
        // Annotations (@param, @return in NatSpec) - Gold
        { token: "annotation", foreground: "DCDCAA", fontStyle: "" },
        
        // ===== Legacy rules for backward compatibility =====
        // global variables
        { token: "keyword.abi", foreground: "DCDCAA" },
        { token: "keyword.block", foreground: "DCDCAA" },
        { token: "keyword.bytes", foreground: "4EC9B0" },
        { token: "keyword.msg", foreground: "DCDCAA" },
        { token: "keyword.tx", foreground: "DCDCAA" },

        // global functions
        { token: "keyword.assert", foreground: "DCDCAA" },
        { token: "keyword.require", foreground: "DCDCAA" },
        { token: "keyword.revert", foreground: "C586C0" },
        { token: "keyword.blockhash", foreground: "DCDCAA" },
        { token: "keyword.keccak256", foreground: "DCDCAA" },
        { token: "keyword.sha256", foreground: "DCDCAA" },
        { token: "keyword.ripemd160", foreground: "DCDCAA" },
        { token: "keyword.ecrecover", foreground: "DCDCAA" },
        { token: "keyword.addmod", foreground: "DCDCAA" },
        { token: "keyword.mulmod", foreground: "DCDCAA" },
        { token: "keyword.selfdestruct", foreground: "DCDCAA" },
        { token: "keyword.gasleft", foreground: "DCDCAA" },

        // specials
        { token: "keyword.super", foreground: "C586C0" },
        { token: "keyword.this", foreground: "C586C0" },
        { token: "keyword.virtual", foreground: "9CDCFE" },

        // for state variables
        { token: "keyword.constants", foreground: "9CDCFE" },
        { token: "keyword.override", foreground: "9CDCFE" },
        { token: "keyword.immutable", foreground: "9CDCFE" },

        // data location
        { token: "keyword.memory", foreground: "CE9178", fontStyle: "italic" },
        { token: "keyword.storage", foreground: "CE9178", fontStyle: "italic" },
        { token: "keyword.calldata", foreground: "CE9178", fontStyle: "italic" },

        // for Events
        { token: "keyword.indexed", foreground: "9CDCFE" },
        { token: "keyword.anonymous", foreground: "9CDCFE" },

        // visibility
        { token: "keyword.external", foreground: "9CDCFE" },
        { token: "keyword.internal", foreground: "9CDCFE" },
        { token: "keyword.private", foreground: "9CDCFE" },
        { token: "keyword.public", foreground: "9CDCFE" },
        { token: "keyword.view", foreground: "9CDCFE" },
        { token: "keyword.pure", foreground: "9CDCFE" },
        { token: "keyword.payable", foreground: "9CDCFE" },
        { token: "keyword.nonpayable", foreground: "9CDCFE" },

        // Errors
        { token: "keyword.Error", foreground: "F44747" },
        { token: "keyword.Panic", foreground: "F44747" },

        // special functions
        { token: "keyword.fallback", foreground: "DCDCAA" },
        { token: "keyword.receive", foreground: "DCDCAA" },
        { token: "keyword.constructor", foreground: "DCDCAA" },

        // control flow
        { token: "keyword.for", foreground: "C586C0" },
        { token: "keyword.break", foreground: "C586C0" },
        { token: "keyword.continue", foreground: "C586C0" },
        { token: "keyword.while", foreground: "C586C0" },
        { token: "keyword.do", foreground: "C586C0" },
        { token: "keyword.delete", foreground: "C586C0" },
        { token: "keyword.if", foreground: "C586C0" },
        { token: "keyword.else", foreground: "C586C0" },
        { token: "keyword.throw", foreground: "C586C0" },
        { token: "keyword.catch", foreground: "C586C0" },
        { token: "keyword.try", foreground: "C586C0" },

        // returns
        { token: "keyword.returns", foreground: "C586C0" },
        { token: "keyword.return", foreground: "C586C0" },
      ],
      colors: {
        // Editor colors
        "editor.background": "#0F0F23",
        "editor.foreground": "#D4D4D4",
        "editor.lineHighlightBackground": "#1A1A3E",
        "editor.selectionBackground": "#264F78",
        "editorCursor.foreground": "#AEAFAD",
        "editorWhitespace.foreground": "#3B3B3B",
        "editorIndentGuide.background": "#404040",
        "editorIndentGuide.activeBackground": "#707070",
        "editor.selectionHighlightBackground": "#ADD6FF26",
      },
    });

    monaco.languages.registerDocumentSymbolProvider(this.id, {
      // eslint-disable-next-line
      async provideDocumentSymbols(model, token): Promise<monaco.languages.DocumentSymbol[]> {
        void token;
        try {
          const response = await (client.request(proto.DocumentSymbolRequest.type.method, {
            textDocument: monacoToProtocol.asTextDocumentIdentifier(model),
          } as proto.DocumentSymbolParams) as Promise<proto.SymbolInformation[]>);

          const uri = model.uri;

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const result: monaco.languages.DocumentSymbol[] = protocolToMonaco.asSymbolInformations(response, uri);

          return result;
        } catch (error) {
          // Method not supported by the LSP server - return empty array
          console.log("DocumentSymbol not supported by LSP server");
          return [];
        }
      },
    });

    monaco.languages.registerHoverProvider(this.id, {
      // eslint-disable-next-line
      async provideHover(model, position, token): Promise<monaco.languages.Hover | null> {
        void token;
        try {
          const response = await (client.request(proto.HoverRequest.type.method, {
            textDocument: monacoToProtocol.asTextDocumentIdentifier(model),
            position: monacoToProtocol.asPosition(position.column, position.lineNumber),
          } as proto.HoverParams) as Promise<proto.Hover>);

          const result = protocolToMonaco.asHover(response);

          // Handle hover result
          let message = "";
          if (result == null) {
            message = "";
          } else {
            message = result.contents[0].value;
          }

          // Create a decoration with the hover result
          const decoration: monaco.editor.IModelDeltaDecoration = {
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            options: {
              hoverMessage: { value: message },
            },
          };

          // Apply the decoration to the editor
          model.deltaDecorations([], [decoration]);

          return result ?? null;
        } catch (error) {
          // LSP error - return null (no hover)
          console.log("Hover error:", error);
          return null;
        }
      },
    });

    // NOTE: Diagnostic handling is now done in the editor index.ts via subscription
    // to diagnostic updates. This ensures diagnostics are properly scoped to the
    // correct file and updated in real-time when the LSP server responds.
  }

  static initialize(client: Client, monaco: Monaco): Language {
    if (null == language) {
      language = new Language(client, monaco);
    } else {
      console.warn("Language already initialized; ignoring");
    }
    return language;
  }
}
