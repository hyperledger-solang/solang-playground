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
      console.log(`Received diagnostics for current model ${uri}:`, diagnostics);
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

  console.log(`Model changed: ${oldModel?.uri.toString() ?? "null"} -> ${newModel.uri.toString()}`);

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
}

export async function mountService(editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) {
  currentEditor = editor;
  const model = editor.getModel()!;
  currentModel = model;

  // Register the initial file open as an after-init hook
  client.pushAfterInitializeHook(async () => {
    editorService.fileOpened(model);
    
    // Set up diagnostic subscription after initialization
    setupDiagnosticSubscription(model, monaco);
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
