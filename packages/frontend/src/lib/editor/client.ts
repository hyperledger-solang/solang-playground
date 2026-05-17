import * as jsrpc from "json-rpc-2.0";
import * as proto from "vscode-languageserver-protocol";

import { Codec, FromServer, IntoServer } from "./codec";
import { store } from "@/state";

type DiagnosticListener = (uri: string, diagnostics: proto.Diagnostic[]) => void;

export default class Client extends jsrpc.JSONRPCServerAndClient {
  afterInitializedHooks: (() => Promise<void>)[] = [];
  #fromServer: FromServer;
  
  // Store diagnostics per URI for multi-file support
  #diagnosticsMap: Map<string, proto.Diagnostic[]> = new Map();
  
  // Event listeners for diagnostic updates
  #diagnosticListeners: Set<DiagnosticListener> = new Set();

  constructor(fromServer: FromServer, intoServer: IntoServer) {
    super(
      new jsrpc.JSONRPCServer(),
      new jsrpc.JSONRPCClient(async (json: jsrpc.JSONRPCRequest) => {
        const encoded = Codec.encode(json);
        intoServer.enqueue(encoded);
        console.log({ json });
        if (null != json.id) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const response = await fromServer.responses.get(json.id)!;
          console.log({ response });
          this.client.receive(response as jsrpc.JSONRPCResponse);
        }
      }),
    );
    this.#fromServer = fromServer;
  }

  async start(): Promise<void> {
    // process "window/logMessage": client <- server
    this.addMethod(proto.LogMessageNotification.type.method, (params) => {
      const { type, message } = params as { type: proto.MessageType; message: string };
      store.send({ type: "addLog", message: message, logType: type });
    });

    // request "initialize": client <-> server
    await (this.request(proto.InitializeRequest.type.method, {
      processId: null,
      clientInfo: {
        name: "demo-language-client",
      },
      capabilities: {},
      rootUri: null,
    } as proto.InitializeParams) as Promise<jsrpc.JSONRPCResponse>);

    // notify "initialized": client --> server
    this.notify(proto.InitializedNotification.type.method, {});

    await Promise.all(this.afterInitializedHooks.map((f: () => Promise<void>) => f()));
    await Promise.all([this.processNotifications(), this.processRequests()]);
  }

  async processNotifications(): Promise<void> {
    console.log("processNotifications called");
    for await (const notification of this.#fromServer.notifications) {
      console.log("notification: ", notification);
      if (notification.method == "textDocument/publishDiagnostics") {
        const params = notification.params as proto.PublishDiagnosticsParams;
        const uri = params.uri;
        const diagnostics = params.diagnostics;
        
        // Store diagnostics by URI
        this.#diagnosticsMap.set(uri, diagnostics);
        
        console.log("diagnostics for", uri, ":", diagnostics);
        
        // Notify all listeners about the update
        this.#diagnosticListeners.forEach(listener => {
          listener(uri, diagnostics);
        });
      }

      await this.receiveAndSend(notification);
    }
  }

  async processRequests(): Promise<void> {
    for await (const request of this.#fromServer.requests) {
      console.log(request);
      await this.receiveAndSend(request);
    }
  }

  /**
   * Get diagnostics for a specific URI
   */
  getDiagnostics(uri: string): proto.Diagnostic[] {
    return this.#diagnosticsMap.get(uri) || [];
  }

  /**
   * Clear diagnostics for a specific URI
   */
  clearDiagnostics(uri: string): void {
    this.#diagnosticsMap.delete(uri);
    this.#diagnosticListeners.forEach(listener => {
      listener(uri, []);
    });
  }

  /**
   * Subscribe to diagnostic updates
   * Returns an unsubscribe function
   */
  onDiagnosticsUpdate(listener: DiagnosticListener): () => void {
    this.#diagnosticListeners.add(listener);
    return () => {
      this.#diagnosticListeners.delete(listener);
    };
  }

  printToConsole(type: proto.MessageType, message: string): void {
    console.log({ type, message });
  }

  pushAfterInitializeHook(...hooks: (() => Promise<void>)[]): void {
    this.afterInitializedHooks.push(...hooks);
  }
}
