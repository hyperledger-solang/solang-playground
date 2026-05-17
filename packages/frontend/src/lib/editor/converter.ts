/**
 * Minimal Monaco <-> LSP Protocol Converter
 * 
 * This is a clean, typed reimplementation of only the converter functions
 * that are actually used in the codebase. Replaces the 1600+ lines of
 * deprecated code from monaco-languageclient v1.x.
 */

import type * as monaco from "monaco-editor";
import * as proto from "vscode-languageserver-protocol";

// ============================================================================
// Monaco -> LSP Protocol Converter
// ============================================================================

export class MonacoToProtocolConverter {
  /**
   * Convert Monaco text document model to LSP TextDocumentIdentifier
   */
  asTextDocumentIdentifier(model: monaco.editor.ITextModel): proto.TextDocumentIdentifier {
    return {
      uri: model.uri.toString(),
    };
  }

  /**
   * Convert Monaco position (1-based) to LSP position (0-based)
   */
  asPosition(column: number, lineNumber: number): proto.Position {
    return {
      line: lineNumber - 1,
      character: column - 1,
    };
  }

  /**
   * Convert Monaco range to LSP range
   */
  asRange(range: monaco.IRange): proto.Range {
    return {
      start: {
        line: range.startLineNumber - 1,
        character: range.startColumn - 1,
      },
      end: {
        line: range.endLineNumber - 1,
        character: range.endColumn - 1,
      },
    };
  }

  /**
   * Convert Monaco completion context to LSP completion context
   */
  asCompletionContext(context: monaco.languages.CompletionContext): proto.CompletionContext {
    let triggerKind: proto.CompletionTriggerKind;
    
    switch (context.triggerKind) {
      case 1: // TriggerCharacter
        triggerKind = proto.CompletionTriggerKind.TriggerCharacter;
        break;
      case 2: // TriggerForIncompleteCompletions
        triggerKind = proto.CompletionTriggerKind.TriggerForIncompleteCompletions;
        break;
      default:
        triggerKind = proto.CompletionTriggerKind.Invoked;
    }

    return {
      triggerKind,
      triggerCharacter: context.triggerCharacter,
    };
  }
}

// ============================================================================
// LSP Protocol -> Monaco Converter
// ============================================================================

export class ProtocolToMonacoConverter {
  /**
   * Convert LSP diagnostics to Monaco marker data
   */
  asDiagnostics(diagnostics: proto.Diagnostic[]): monaco.editor.IMarkerData[] {
    if (!diagnostics) {
      return [];
    }
    return diagnostics.map((diagnostic) => this.asDiagnostic(diagnostic));
  }

  private asDiagnostic(diagnostic: proto.Diagnostic): monaco.editor.IMarkerData {
    return {
      code: typeof diagnostic.code === "number" ? diagnostic.code.toString() : diagnostic.code?.toString(),
      severity: this.asSeverity(diagnostic.severity),
      message: diagnostic.message,
      source: diagnostic.source,
      startLineNumber: diagnostic.range.start.line + 1,
      startColumn: diagnostic.range.start.character + 1,
      endLineNumber: diagnostic.range.end.line + 1,
      endColumn: diagnostic.range.end.character + 1,
      relatedInformation: this.asRelatedInformations(diagnostic.relatedInformation),
      tags: diagnostic.tags,
    };
  }

  private asSeverity(severity?: proto.DiagnosticSeverity): monaco.MarkerSeverity {
    // MarkerSeverity: 1=Hint, 2=Info, 4=Warning, 8=Error
    switch (severity) {
      case proto.DiagnosticSeverity.Error:
        return 8; // MarkerSeverity.Error
      case proto.DiagnosticSeverity.Warning:
        return 4; // MarkerSeverity.Warning
      case proto.DiagnosticSeverity.Information:
        return 2; // MarkerSeverity.Info
      default:
        return 1; // MarkerSeverity.Hint
    }
  }

  private asRelatedInformations(
    relatedInformation?: proto.DiagnosticRelatedInformation[]
  ): monaco.editor.IRelatedInformation[] | undefined {
    if (!relatedInformation) {
      return undefined;
    }
    return relatedInformation.map((item) => ({
      resource: { toString: () => item.location.uri } as monaco.Uri,
      startLineNumber: item.location.range.start.line + 1,
      startColumn: item.location.range.start.character + 1,
      endLineNumber: item.location.range.end.line + 1,
      endColumn: item.location.range.end.character + 1,
      message: item.message,
    }));
  }

  /**
   * Convert LSP completion result to Monaco completion list
   */
  asCompletionResult(
    result: proto.CompletionItem[] | proto.CompletionList | null | undefined,
    defaultRange: monaco.IRange
  ): monaco.languages.CompletionList {
    if (!result) {
      return { incomplete: false, suggestions: [] };
    }

    if (Array.isArray(result)) {
      return {
        incomplete: false,
        suggestions: result.map((item) => this.asCompletionItem(item, defaultRange)),
      };
    }

    return {
      incomplete: result.isIncomplete,
      suggestions: result.items.map((item) => this.asCompletionItem(item, defaultRange)),
    };
  }

  private asCompletionItem(
    item: proto.CompletionItem,
    defaultRange: monaco.IRange
  ): monaco.languages.CompletionItem {
    const insertText = this.getInsertText(item);
    const range = this.getCompletionRange(item, defaultRange);

    const label = typeof item.label === "string" ? item.label : (item.label as { label: string }).label;
    const result: monaco.languages.CompletionItem = {
      label,
      kind: this.asCompletionItemKind(item.kind),
      detail: item.detail,
      documentation: this.asDocumentation(item.documentation),
      sortText: item.sortText,
      filterText: item.filterText,
      insertText: insertText.text,
      range,
      insertTextRules: insertText.isSnippet ? 4 : undefined, // InsertAsSnippet = 4
      preselect: item.preselect,
      commitCharacters: item.commitCharacters,
    };

    if (item.additionalTextEdits) {
      result.additionalTextEdits = this.asTextEdits(item.additionalTextEdits);
    }

    return result;
  }

  private getInsertText(item: proto.CompletionItem): { text: string; isSnippet: boolean } {
    const isSnippet = item.insertTextFormat === proto.InsertTextFormat.Snippet;

    if (item.textEdit) {
      if (proto.TextEdit.is(item.textEdit)) {
        return { text: item.textEdit.newText, isSnippet };
      } else {
        return { text: item.textEdit.newText, isSnippet };
      }
    }

    if (item.insertText) {
      return { text: item.insertText, isSnippet };
    }

    const labelText = typeof item.label === "string" ? item.label : (item.label as { label: string }).label;
    return { text: labelText, isSnippet: false };
  }

  private getCompletionRange(
    item: proto.CompletionItem,
    defaultRange: monaco.IRange
  ): monaco.IRange | { insert: monaco.IRange; replace: monaco.IRange } {
    if (item.textEdit) {
      if (proto.TextEdit.is(item.textEdit)) {
        return this.asRange(item.textEdit.range);
      } else {
        return {
          insert: this.asRange(item.textEdit.insert),
          replace: this.asRange(item.textEdit.replace),
        };
      }
    }
    return defaultRange;
  }

  private asCompletionItemKind(kind?: proto.CompletionItemKind): monaco.languages.CompletionItemKind {
    // Monaco and LSP completion item kinds are mostly aligned (1-indexed in LSP)
    // Monaco: Method=0, Function=1, Constructor=2, etc.
    // LSP: Text=1, Method=2, Function=3, Constructor=4, etc.
    if (kind === undefined || kind === null) {
      return 0; // Method
    }

    // Map LSP kind to Monaco kind (LSP is 1-indexed, Monaco is 0-indexed)
    const kindMap: Record<number, number> = {
      [proto.CompletionItemKind.Text]: 18, // Text
      [proto.CompletionItemKind.Method]: 0, // Method
      [proto.CompletionItemKind.Function]: 1, // Function
      [proto.CompletionItemKind.Constructor]: 2, // Constructor
      [proto.CompletionItemKind.Field]: 3, // Field
      [proto.CompletionItemKind.Variable]: 4, // Variable
      [proto.CompletionItemKind.Class]: 5, // Class
      [proto.CompletionItemKind.Interface]: 7, // Interface
      [proto.CompletionItemKind.Module]: 8, // Module
      [proto.CompletionItemKind.Property]: 9, // Property
      [proto.CompletionItemKind.Unit]: 10, // Unit
      [proto.CompletionItemKind.Value]: 11, // Value
      [proto.CompletionItemKind.Enum]: 12, // Enum
      [proto.CompletionItemKind.Keyword]: 13, // Keyword
      [proto.CompletionItemKind.Snippet]: 14, // Snippet
      [proto.CompletionItemKind.Color]: 15, // Color
      [proto.CompletionItemKind.File]: 16, // File
      [proto.CompletionItemKind.Reference]: 17, // Reference
      [proto.CompletionItemKind.Folder]: 19, // Folder
      [proto.CompletionItemKind.EnumMember]: 20, // EnumMember
      [proto.CompletionItemKind.Constant]: 21, // Constant
      [proto.CompletionItemKind.Struct]: 6, // Struct
      [proto.CompletionItemKind.Event]: 22, // Event
      [proto.CompletionItemKind.Operator]: 23, // Operator
      [proto.CompletionItemKind.TypeParameter]: 24, // TypeParameter
    };

    return kindMap[kind] ?? 9; // Default to Property
  }

  private asDocumentation(
    documentation: string | proto.MarkupContent | undefined
  ): string | monaco.IMarkdownString | undefined {
    if (!documentation) {
      return undefined;
    }
    if (typeof documentation === "string") {
      return documentation;
    }
    if (documentation.kind === proto.MarkupKind.Markdown) {
      return { value: documentation.value };
    }
    return documentation.value;
  }

  private asTextEdits(edits: proto.TextEdit[]): monaco.languages.TextEdit[] {
    return edits.map((edit) => ({
      range: this.asRange(edit.range),
      text: edit.newText,
    }));
  }

  /**
   * Convert LSP symbol information to Monaco document symbols
   */
  asSymbolInformations(
    values: proto.SymbolInformation[] | undefined | null,
    uri?: monaco.Uri
  ): monaco.languages.DocumentSymbol[] {
    if (!values) {
      return [];
    }
    return values.map((info) => this.asSymbolInformation(info, uri));
  }

  private asSymbolInformation(
    item: proto.SymbolInformation,
    uri?: monaco.Uri
  ): monaco.languages.DocumentSymbol {
    const range = this.asRange(item.location.range);
    return {
      name: item.name,
      detail: "",
      containerName: item.containerName,
      kind: this.asSymbolKind(item.kind),
      tags: item.tags || [],
      range,
      selectionRange: range,
    };
  }

  private asSymbolKind(kind: proto.SymbolKind): monaco.languages.SymbolKind {
    // LSP SymbolKind is 1-indexed, Monaco is 0-indexed
    if (kind >= 1 && kind <= 26) {
      return kind - 1;
    }
    return 9; // Property
  }

  /**
   * Convert LSP hover to Monaco hover
   */
  asHover(hover: proto.Hover | undefined | null): monaco.languages.Hover | undefined {
    if (!hover) {
      return undefined;
    }
    return {
      contents: this.asHoverContent(hover.contents),
      range: hover.range ? this.asRange(hover.range) : undefined,
    };
  }

  private asHoverContent(
    contents: proto.MarkedString | proto.MarkedString[] | proto.MarkupContent
  ): monaco.IMarkdownString[] {
    if (Array.isArray(contents)) {
      return contents.map((content) => this.asMarkdownString(content));
    }
    return [this.asMarkdownString(contents)];
  }

  private asMarkdownString(
    content: proto.MarkedString | proto.MarkupContent
  ): monaco.IMarkdownString {
    if (proto.MarkupContent.is(content)) {
      return { value: content.value };
    }
    if (typeof content === "string") {
      return { value: content };
    }
    // MarkedString with language
    const { language, value } = content;
    return { value: "```" + language + "\n" + value + "\n```" };
  }

  /**
   * Convert LSP range to Monaco range
   */
  private asRange(range: proto.Range): monaco.IRange {
    return {
      startLineNumber: range.start.line + 1,
      startColumn: range.start.character + 1,
      endLineNumber: range.end.line + 1,
      endColumn: range.end.character + 1,
    };
  }
}

