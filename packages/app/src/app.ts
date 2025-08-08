import debounce from "debounce";
import * as monaco from "monaco-editor-core";
import { MonacoToProtocolConverter, ProtocolToMonacoConverter } from "monaco-languageclient";
import * as proto from "vscode-languageserver-protocol";

import Client from "./client";
import { FromServer, IntoServer } from "./codec";
import Language from "./language";
import Server from "./server";
import Common from '@solangide/commontypes';


export type CompileApiRequest = Common.CompilationRequest;
export type CompileApiResponse =
  | {
    type: 'OK';
    payload: Common.CompilationResult;
  }
  | {
    type: 'NETWORK_ERROR';
  }
  | {
    type: 'SERVER_ERROR';
    payload: { status: number };
  };
export type Config = {
  compileUrl: string;
};
const mapResponse = async (response: Response): Promise<CompileApiResponse> =>
  response.status === 200
    ? {
      type: 'OK',
      payload: await response.json(),
    }
    : {
      type: 'SERVER_ERROR',
      payload: { status: response.status },
    };

export const compileRequest = (
  config: Config,
  request: CompileApiRequest
): Promise<CompileApiResponse> => {
  const opts: RequestInit = {
    method: 'POST',
    mode: 'cors',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  };

  return fetch(config.compileUrl || '', opts)
    .then(mapResponse)
    .catch(() => ({ type: 'NETWORK_ERROR' }));
};

export const downloadBlob = (code: number[]): void => {
  const blob = new Blob([new Uint8Array(code).buffer]);

  const a = document.createElement('a');
  a.download = 'result.wasm';
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = ['application/json', a.download, a.href].join(':');
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 1500);
};



class Environment implements monaco.Environment {
  getWorkerUrl(moduleId: string, label: string) {
    if (label === "editorWorkerService") {
      return "./editor.worker.bundle.js";
    }
    throw new Error(`getWorkerUrl: unexpected ${JSON.stringify({ moduleId, label })}`);
  }
}

//export const monacoToProtocol = new MonacoToProtocolConverter(monaco);
export const protocolToMonaco = new ProtocolToMonacoConverter(monaco);
const monacoToProtocol = new MonacoToProtocolConverter(monaco);

export default class App {
  readonly #window: Window & monaco.Window & typeof globalThis = self;

  readonly #intoServer: IntoServer = new IntoServer();
  readonly #fromServer: FromServer = FromServer.create();

  initializeMonaco(): void {
    this.#window.MonacoEnvironment = new Environment();
  }

  createModel(client: Client): monaco.editor.ITextModel {
    const language = Language.initialize(client);



    // FIXME: There should be a way to load the initial code from a file. `fs` is not available in the browser.
    const value =
      `contract flipper {
  bool private value;

  /// Constructor that initializes the \`bool\` value to the given \`init_value\`.
  constructor(bool initvalue) {
    value = initvalue;
  }

  /// A message that can be called on instantiated contracts.
  /// This one flips the value of the stored \`bool\` from \`true\`
  /// to \`false\` and vice versa.
  function flip() public {
    value = !value;
  }

  /// Simply returns the current value of our \`bool\`.
  function get() public view returns (bool) {
    return value;
  }
}
`;


    const id = language.id;
    const uri = monaco.Uri.parse("inmemory://demo.js");

    const model = monaco.editor.createModel(value, id, uri);

    model.onDidChangeContent(
      debounce(() => {
        const text = model.getValue();
        client.notify(proto.DidChangeTextDocumentNotification.type.method, {
          textDocument: {
            version: 0,
            uri: model.uri.toString(),
          },
          contentChanges: [
            {
              range: monacoToProtocol.asRange(model.getFullModelRange()),
              text,
            },
          ],
        } as proto.DidChangeTextDocumentParams);

        // Wait for a bit before publishing diagnostics
        setTimeout(() => {
          let diagnostic = client.diagnostic;

          let markers = protocolToMonaco.asDiagnostics(diagnostic.diagnostics);

          monaco.editor.setModelMarkers(model, "solidity", markers);
        }, 500); // Adjust delay as needed
      }, 200),
    );

    document.querySelector("#compile")!.addEventListener("click", () => {
      let code = model.getValue();
      console.log("Compiling code: ", code);
      client.printToConsole(proto.MessageType.Info, "Compiling contract...");

      (async () => {
        const result = await compileRequest(
          // FIXME: This should be configurable
          { compileUrl: "http://localhost:4444/compile" },
          { source: code }
        );

        console.log("Compilation result: ", result);
        client.printToConsole(proto.MessageType.Info, "Compilation result: " + JSON.stringify(result));

        // If the compilation was successful, download the wasm blob and print a success message
        if (result.type === 'OK') {
          if (result.payload.type === 'SUCCESS') {
            client.printToConsole(proto.MessageType.Info, "Compilation successful");
            const wasm = result.payload.payload.wasm;
            downloadBlob(wasm);
          }
          else {
            let message = result.payload.payload.compile_stderr;
            client.printToConsole(proto.MessageType.Error, message);
          }
        } else {
          let message = result.type === 'SERVER_ERROR'
            ? `Server error: ${result.payload.status}`
            : 'Network error';
          client.printToConsole(proto.MessageType.Error, message);
        }


      })();
    });

    document.querySelector("#interact")!.addEventListener("click", () => {
      console.log("Redirecting to https://ui.use.ink/");
      window.open("https://ui.use.ink/");
    });

    document.querySelector("#docs")!.addEventListener("click", () => {
      console.log("Redirecting to https://solang.readthedocs.io/");
      window.open("https://solang.readthedocs.io/");
    });

    document.querySelector("#github")!.addEventListener("click", () => {
      console.log("Redirecting to github.com/hyperledger-labs/solang-playground");
      window.open("https://github.com/hyperledger-labs/solang-playground");
    });


    // eslint-disable-next-line @typescript-eslint/require-await
    client.pushAfterInitializeHook(async () => {
      client.notify(proto.DidOpenTextDocumentNotification.type.method, {
        textDocument: {
          uri: model.uri.toString(),
          languageId: language.id,
          version: 0,
          text: model.getValue(),
        },
      } as proto.DidOpenTextDocumentParams);
    });

    return model;
  }

  createEditor(client: Client): void {
    const container = document.getElementById("editor")!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    this.initializeMonaco();
    const model = this.createModel(client);
    monaco.editor.create(container, {
      model,
      automaticLayout: true,
    });
  }

  async run(): Promise<void> {
    const client = new Client(this.#fromServer, this.#intoServer);
    const server = await Server.initialize(this.#intoServer, this.#fromServer);
    this.createEditor(client);
    await Promise.all([server.start(), client.start()]);
  }
}
