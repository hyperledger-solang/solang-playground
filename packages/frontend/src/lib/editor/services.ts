import { Monaco } from "@monaco-editor/react";
import Client from "./client";
import {
  DidChangeTextDocumentNotification,
  DidChangeTextDocumentParams,
  DidOpenTextDocumentNotification,
  DidOpenTextDocumentParams,
  DidCloseTextDocumentNotification,
  DidCloseTextDocumentParams,
} from "vscode-languageserver-protocol";
import { editor } from "monaco-editor-core";
import Language from "./language";
import { monacoToProtocol } from "./utils";

// Convert a state file path to a URI that the LSP understands
// Monaco creates file:// URIs from paths, so we need to match that format
function filePathToUri(filePath: string): string {
  // Extract just the filename from paths like "explorer.items.src.items['main.sol']"
  const match = filePath.match(/\['([^']+)'\]$/);
  const filename = match ? match[1] : filePath;
  // Use the same URI format that Monaco creates: file:///workspace/filename.sol
  return `file:///workspace/${filename}`;
}

export class EditorService {
  // Track document versions per URI
  #documentVersions: Map<string, number> = new Map();
  
  // Track which documents are currently open in the LSP
  #openDocuments: Set<string> = new Set();

  constructor(private client: Client) {}

  /**
   * Get and increment the version for a document
   */
  private getNextVersion(uri: string): number {
    const currentVersion = this.#documentVersions.get(uri) || 0;
    const nextVersion = currentVersion + 1;
    this.#documentVersions.set(uri, nextVersion);
    return nextVersion;
  }

  /**
   * Get current version without incrementing
   */
  public getVersion(uri: string): number {
    return this.#documentVersions.get(uri) || 0;
  }

  /**
   * Check if a document is open in the LSP
   */
  public isDocumentOpen(uri: string): boolean {
    return this.#openDocuments.has(uri);
  }

  /**
   * Notify the LSP server that a document was opened
   */
  public fileOpened(model: editor.ITextModel): void {
    const uri = model.uri.toString();
    
    // Don't send didOpen if already open
    if (this.#openDocuments.has(uri)) {
      return;
    }

    // Reset version for newly opened documents
    this.#documentVersions.set(uri, 1);
    this.#openDocuments.add(uri);

    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri: uri,
        languageId: model.getLanguageId(),
        version: 1,
        text: model.getValue(),
      },
    };

    this.client.notify(DidOpenTextDocumentNotification.type.method, params);
  }

  /**
   * Notify the LSP server that a document was closed
   */
  public fileClosed(uri: string): void {
    // Don't send didClose if not open
    if (!this.#openDocuments.has(uri)) {
      return;
    }

    this.#openDocuments.delete(uri);
    
    const params: DidCloseTextDocumentParams = {
      textDocument: {
        uri: uri,
      },
    };

    this.client.notify(DidCloseTextDocumentNotification.type.method, params);
    
    // Clear diagnostics for closed document
    this.client.clearDiagnostics(uri);
  }

  /**
   * Notify the LSP server that a document's content changed
   */
  public fileChanged(model: editor.ITextModel): void {
    const uri = model.uri.toString();
    const content = model.getValue();

    // If document isn't open yet, open it first
    if (!this.#openDocuments.has(uri)) {
      this.fileOpened(model);
      return; // fileOpened already sends the content
    }

    // Clear cached diagnostics - they're now stale
    // New diagnostics will arrive when the server processes the change
    this.client.clearDiagnostics(uri);

    const version = this.getNextVersion(uri);

    const params: DidChangeTextDocumentParams = {
      textDocument: {
        uri: uri,
        version: version,
      },
      contentChanges: [
        {
          range: monacoToProtocol.asRange(model.getFullModelRange()),
          text: content,
        },
      ],
    };

    this.client.notify(DidChangeTextDocumentNotification.type.method, params);
  }

  /**
   * Handle switching from one file to another
   * Keep both files open in the LSP for import resolution
   */
  public switchFile(oldModel: editor.ITextModel | null, newModel: editor.ITextModel): void {
    // Don't close the old document - keep it open for import resolution
    // Just open the new document if not already open
    this.fileOpened(newModel);
  }

  /**
   * Open a file by path and content (for workspace sync)
   * This allows opening files that don't have a Monaco model yet
   */
  public openFileByPath(filePath: string, content: string, languageId: string = "solidity"): void {
    const uri = filePathToUri(filePath);
    
    // Don't send didOpen if already open
    if (this.#openDocuments.has(uri)) {
      return;
    }

    // Reset version for newly opened documents
    this.#documentVersions.set(uri, 1);
    this.#openDocuments.add(uri);

    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri: uri,
        languageId: languageId,
        version: 1,
        text: content,
      },
    };

    this.client.notify(DidOpenTextDocumentNotification.type.method, params);
  }

  /**
   * Update file content by path (for files without Monaco model)
   */
  public updateFileByPath(filePath: string, content: string): void {
    const uri = filePathToUri(filePath);

    // If document isn't open yet, open it first
    if (!this.#openDocuments.has(uri)) {
      this.openFileByPath(filePath, content);
      return;
    }

    const version = this.getNextVersion(uri);

    const params: DidChangeTextDocumentParams = {
      textDocument: {
        uri: uri,
        version: version,
      },
      contentChanges: [
        {
          text: content,
        },
      ],
    };

    this.client.notify(DidChangeTextDocumentNotification.type.method, params);
  }

  /**
   * Open all workspace files in the LSP
   * Call this after LSP initialization to enable import resolution
   */
  public openWorkspaceFiles(files: Record<string, string>): void {
    const solFiles = Object.entries(files).filter(([path]) => path.includes(".sol"));
    
    for (const [filePath, content] of solFiles) {
      this.openFileByPath(filePath, content);
    }
  }

  /**
   * Get the list of open document URIs
   */
  public getOpenDocuments(): string[] {
    return Array.from(this.#openDocuments);
  }
}
