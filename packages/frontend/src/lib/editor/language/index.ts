import * as monaco from "monaco-editor";
// import { MonacoToProtocolConverter, ProtocolToMonacoConverter } from "";
import contributes from "./contributes.json";
import { solidityTokensProvider, solidityLanguageConfig } from "./solidity_syntax";
import * as proto from "vscode-languageserver-protocol";
import { Monaco } from "@monaco-editor/react";
import Client from "../client";
import { monacoToProtocol, protocolToMonaco } from "../utils";

const themeType = "vs-dark";
const themeName = "remix-dark";
const formatColor = (name: string): string => {
  let color = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (color.length === 4) {
    color = color.concat(color.substr(1));
  }
  console.log("color ", color);
  return color;
};
// see https://microsoft.github.io/monaco-editor/playground.html#customizing-the-appearence-exposed-colors
const lightColor = formatColor("--light");
const infoColor = formatColor("--info");
const darkColor = formatColor("--dark");
const secondaryColor = formatColor("--secondary");
const primaryColor = formatColor("--primary");
const textColor = formatColor("--text") || darkColor;
const textbackground = formatColor("--text-background") || lightColor;

const blueColor = formatColor("--blue");
const successColor = formatColor("--success");
const warningColor = formatColor("--warning");
const yellowColor = formatColor("--yellow");
const pinkColor = formatColor("--pink");
const locationColor = "#9e7e08";
// const purpleColor = formatColor('--purple')
const dangerColor = formatColor("--danger");
const greenColor = formatColor("--green");
const orangeColor = formatColor("--orange");
const grayColor = formatColor("--gray");

// export const protocolToMonaco = new ProtocolToMonacoConverter(monaco);
// const monacoToProtocol = new MonacoToProtocolConverter(monaco);

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

    monaco.languages.registerCompletionItemProvider(this.id, {
      async provideCompletionItems(model, position, context, token): Promise<monaco.languages.CompletionList> {
        void token;
        try {
          const response = await (client.request(proto.CompletionRequest.type.method, {
            textDocument: monacoToProtocol.asTextDocumentIdentifier(model),
            position: monacoToProtocol.asPosition(position.column, position.lineNumber),
            context: monacoToProtocol.asCompletionContext(context),
          } as proto.CompletionParams) as Promise<proto.CompletionList>);
          console.log(response);

          const word = model.getWordUntilPosition(position);
          const result: monaco.languages.CompletionList = protocolToMonaco.asCompletionResult(response, {
            startLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: word.endColumn,
          });

          return result;
        } catch (error) {
          // LSP error - return empty completion list
          console.log("Completion error:", error);
          return { suggestions: [] };
        }
      },
    });

    monaco.editor.defineTheme(themeName, {
      base: themeType,
      inherit: true, // can also be false to completely replace the builtin rules
      rules: [
        // global variables
        { token: "keyword.abi", foreground: blueColor },
        { token: "keyword.block", foreground: blueColor },
        { token: "keyword.bytes", foreground: blueColor },
        { token: "keyword.msg", foreground: blueColor },
        { token: "keyword.tx", foreground: blueColor },

        // global functions
        { token: "keyword.assert", foreground: blueColor },
        { token: "keyword.require", foreground: blueColor },
        { token: "keyword.revert", foreground: blueColor },
        { token: "keyword.blockhash", foreground: blueColor },
        { token: "keyword.keccak256", foreground: blueColor },
        { token: "keyword.sha256", foreground: blueColor },
        { token: "keyword.ripemd160", foreground: blueColor },
        { token: "keyword.ecrecover", foreground: blueColor },
        { token: "keyword.addmod", foreground: blueColor },
        { token: "keyword.mulmod", foreground: blueColor },
        { token: "keyword.selfdestruct", foreground: blueColor },
        { token: "keyword.type ", foreground: blueColor },
        { token: "keyword.gasleft", foreground: blueColor },

        // specials
        { token: "keyword.super", foreground: infoColor },
        { token: "keyword.this", foreground: infoColor },
        { token: "keyword.virtual", foreground: infoColor },

        // for state variables
        { token: "keyword.constants", foreground: grayColor },
        { token: "keyword.override", foreground: grayColor },
        { token: "keyword.immutable", foreground: grayColor },

        // data location
        { token: "keyword.memory", foreground: locationColor },
        { token: "keyword.storage", foreground: locationColor },
        { token: "keyword.calldata", foreground: locationColor },

        // for Events
        { token: "keyword.indexed", foreground: yellowColor },
        { token: "keyword.anonymous", foreground: yellowColor },

        // for functions
        { token: "keyword.external", foreground: successColor },
        { token: "keyword.internal", foreground: successColor },
        { token: "keyword.private", foreground: successColor },
        { token: "keyword.public", foreground: successColor },
        { token: "keyword.view", foreground: successColor },
        { token: "keyword.pure", foreground: successColor },
        { token: "keyword.payable", foreground: successColor },
        { token: "keyword.nonpayable", foreground: successColor },

        // Errors
        { token: "keyword.Error", foreground: dangerColor },
        { token: "keyword.Panic", foreground: dangerColor },

        // special functions
        { token: "keyword.fallback", foreground: pinkColor },
        { token: "keyword.receive", foreground: pinkColor },
        { token: "keyword.constructor", foreground: pinkColor },

        // identifiers
        { token: "keyword.identifier", foreground: warningColor },
        { token: "keyword.for", foreground: warningColor },
        { token: "keyword.break", foreground: warningColor },
        { token: "keyword.continue", foreground: warningColor },
        { token: "keyword.while", foreground: warningColor },
        { token: "keyword.do", foreground: warningColor },
        { token: "keyword.delete", foreground: warningColor },

        { token: "keyword.if", foreground: yellowColor },
        { token: "keyword.else", foreground: yellowColor },

        { token: "keyword.throw", foreground: orangeColor },
        { token: "keyword.catch", foreground: orangeColor },
        { token: "keyword.try", foreground: orangeColor },

        // returns
        { token: "keyword.returns", foreground: greenColor },
        { token: "keyword.return", foreground: greenColor },
      ],
      colors: {},
    });

    monaco.languages.registerDocumentSymbolProvider(this.id, {
      // eslint-disable-next-line
      async provideDocumentSymbols(model, token): Promise<monaco.languages.DocumentSymbol[]> {
        void token;
        try {
          const response = await (client.request(proto.DocumentSymbolRequest.type.method, {
            textDocument: monacoToProtocol.asTextDocumentIdentifier(model),
          } as proto.DocumentSymbolParams) as Promise<proto.SymbolInformation[]>);

          console.log({ response });

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
          console.log(response);

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const result: monaco.languages.Hover = protocolToMonaco.asHover(response);

          console.log("Hover result: ", result);

          // add handler if hover result is null
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

          return result;
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
