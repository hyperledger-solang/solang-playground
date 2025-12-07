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
      console.log(`Document ${uri} is already open, skipping didOpen`);
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

    console.log(`Sending didOpen for ${uri}`);
    this.client.notify(DidOpenTextDocumentNotification.type.method, params);
  }

  /**
   * Notify the LSP server that a document was closed
   */
  public fileClosed(uri: string): void {
    // Don't send didClose if not open
    if (!this.#openDocuments.has(uri)) {
      console.log(`Document ${uri} is not open, skipping didClose`);
      return;
    }

    this.#openDocuments.delete(uri);
    
    const params: DidCloseTextDocumentParams = {
      textDocument: {
        uri: uri,
      },
    };

    console.log(`Sending didClose for ${uri}`);
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
      console.log(`Document ${uri} not open, opening before change notification`);
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

    console.log(`Sending didChange for ${uri} (version ${version})`);
    this.client.notify(DidChangeTextDocumentNotification.type.method, params);
  }

  /**
   * Handle switching from one file to another
   * This ensures proper lifecycle notifications are sent
   */
  public switchFile(oldModel: editor.ITextModel | null, newModel: editor.ITextModel): void {
    // Close the old document if it exists
    if (oldModel) {
      const oldUri = oldModel.uri.toString();
      this.fileClosed(oldUri);
    }

    // Open the new document
    this.fileOpened(newModel);
  }
}
