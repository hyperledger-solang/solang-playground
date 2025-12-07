import monaco from "monaco-editor";
import { loader, Monaco } from "@monaco-editor/react";
import Server from "./server";
import { FromServer, IntoServer } from "./codec";
import Client from "./client";
import Language from "./language";
import { EditorService } from "./services";
import debounce from "debounce";
import { protocolToMonaco } from "./utils";
import { store } from "@/state";
import { defaultCode } from "@/state/initstate";
import initState from "@/state/inistate";

const intoServer = new IntoServer();
const fromServer = FromServer.create();
const client = new Client(fromServer, intoServer);
const editorService = new EditorService(client);

let language: Language;
let monacoInstance: Monaco;
let currentEditor: monaco.editor.IStandaloneCodeEditor | null = null;
let currentModel: monaco.editor.ITextModel | null = null;
let contentChangeDisposable: monaco.IDisposable | null = null;
let diagnosticUnsubscribe: (() => void) | null = null;
let previousFileKeys: Set<string> = new Set();
let isLspInitialized = false;

export async function init(monaco: Monaco) {
  store.send({ type: "setMonaco", monaco });
  monacoInstance = monaco;
  initState();
  const server = await Server.initialize(intoServer, fromServer);
  language = Language.initialize(client, monaco);

  return await Promise.all([server.start(), client.start()]);
}

/**
 * Set up diagnostic subscription for the current model
 */
function setupDiagnosticSubscription(model: monaco.editor.ITextModel, monaco: Monaco) {
  // Clean up previous subscription
  if (diagnosticUnsubscribe) {
    diagnosticUnsubscribe();
  }

  const modelUri = model.uri.toString();

  // Clear any stale diagnostics from previous sessions
  // New diagnostics will come from the server after didOpen/didChange
  monaco.editor.setModelMarkers(model, "solidity", []);

  // Subscribe to diagnostic updates
  diagnosticUnsubscribe = client.onDiagnosticsUpdate((uri, diagnostics) => {
    // Only update markers if the diagnostics are for the current model
    if (uri === modelUri) {
      const markers = protocolToMonaco.asDiagnostics(diagnostics);
      monaco.editor.setModelMarkers(model, "solidity", markers);
    }
  });
}

/**
 * Set up content change handler for the current model
 */
function setupContentChangeHandler(model: monaco.editor.ITextModel, monaco: Monaco) {
  // Clean up previous handler
  if (contentChangeDisposable) {
    contentChangeDisposable.dispose();
  }

  // Create debounced change handler for sending to LSP
  const debouncedChange = debounce(() => {
    editorService.fileChanged(model);
  }, 200);

  // Subscribe to content changes
  contentChangeDisposable = model.onDidChangeContent(() => {
    // Clear stale markers immediately when content changes
    // New markers will arrive when the server responds
    monaco.editor.setModelMarkers(model, "solidity", []);
    
    // Send change to LSP (debounced)
    debouncedChange();
  });
}

/**
 * Handle when the editor switches to a different model
 */
function handleModelChange(editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) {
  const newModel = editor.getModel();
  
  if (!newModel) {
    console.warn("No model attached to editor");
    return;
  }

  const oldModel = currentModel;
  currentModel = newModel;

  // Notify the LSP about the file switch
  if (oldModel && oldModel !== newModel) {
    editorService.switchFile(oldModel, newModel);
  } else if (!oldModel) {
    // First model, just open it
    editorService.fileOpened(newModel);
  }

  // Set up handlers for the new model
  setupContentChangeHandler(newModel, monaco);
  setupDiagnosticSubscription(newModel, monaco);
  
  // Force re-parse when switching files to restore diagnostics
  // This ensures errors are shown even when returning to a previously viewed file
  if (isLspInitialized && oldModel !== newModel) {
    setTimeout(() => {
      editorService.fileChanged(newModel);
    }, 50);
  }
}

export async function mountService(editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) {
  currentEditor = editor;
  const model = editor.getModel()!;
  currentModel = model;

  // Register the initial file open as an after-init hook
  client.pushAfterInitializeHook(async () => {
    // First, open ALL workspace files so the LSP knows about them for imports
    const state = store.getSnapshot();
    const files = state.context.files;
    editorService.openWorkspaceFiles(files);
    
    // Track which files exist for detecting new ones
    previousFileKeys = new Set(Object.keys(files));
    isLspInitialized = true;
    
    // Open the current file - this triggers initial parsing with all imports available
    editorService.fileOpened(model);
    
    // Force a re-parse by sending a "change" notification with the same content
    // This ensures the LSP re-analyzes the file now that all imports are loaded
    setTimeout(() => {
      editorService.fileChanged(model);
    }, 100);
    
    // Set up diagnostic subscription after initialization
    setupDiagnosticSubscription(model, monaco);
    
    // Subscribe to state changes to detect new files
    store.subscribe((state) => {
      if (!isLspInitialized) return;
      
      const currentFiles = state.context.files;
      const currentKeys = new Set(Object.keys(currentFiles));
      
      // Find newly added files
      for (const key of currentKeys) {
        if (!previousFileKeys.has(key) && key.includes(".sol")) {
          editorService.openFileByPath(key, currentFiles[key]);
        }
      }
      
      // Update tracking
      previousFileKeys = currentKeys;
    });
  });

  // Set up content change handler
  setupContentChangeHandler(model, monaco);

  // Listen for model changes (when switching files)
  editor.onDidChangeModel(() => {
    handleModelChange(editor, monaco);
  });
}

/**
 * Manually trigger a file open notification for the current model
 * Useful when external code changes the model content
 */
export function notifyFileOpened() {
  if (currentModel) {
    editorService.fileOpened(currentModel);
  }
}

/**
 * Get the current editor instance
 */
export function getEditor(): monaco.editor.IStandaloneCodeEditor | null {
  return currentEditor;
}

/**
 * Get the current model
 */
export function getCurrentModel(): monaco.editor.ITextModel | null {
  return currentModel;
}

/**
 * Get the client instance (for advanced usage)
 */
export function getClient(): Client {
  return client;
}

/**
 * Get the editor service (for workspace file management)
 */
export function getEditorService(): EditorService {
  return editorService;
}

/**
 * Notify the LSP that a new file was created in the workspace
 */
export function notifyFileCreated(filePath: string, content: string): void {
  editorService.openFileByPath(filePath, content);
}

/**
 * Notify the LSP that a file's content changed (for non-active files)
 */
export function notifyFileChanged(filePath: string, content: string): void {
  editorService.updateFileByPath(filePath, content);
}
