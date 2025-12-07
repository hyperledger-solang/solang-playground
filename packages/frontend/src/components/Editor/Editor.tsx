"use client";

import MonacoEditor from "@monaco-editor/react";
import Spinner from "../Spinner";
import { useTheme } from "next-themes";
import { init, mountService } from "@/lib/editor";
import { useFileContent } from "@/state/hooks";
import { store } from "@/state";
import { useSelector } from "@xstate/store/react";

function Editor() {
  const { resolvedTheme } = useTheme();
  const theme = { dark: "vs-dark", light: "vs-light" }[resolvedTheme!] || resolvedTheme;
  const code = useFileContent();
  const { fontSize } = useSelector(store, (state) => state.context.preferences);
  
  // Get current file path for proper model management
  const currentPath = useSelector(store, (state) => state.context.currentFile);
  
  // Create a stable path for Monaco's internal model management
  // This ensures each file gets its own model with a unique URI
  const modelPath = currentPath 
    ? `inmemory://solang/${currentPath.replace(/[^a-zA-Z0-9]/g, '_')}.sol`
    : 'inmemory://solang/default.sol';

  return (
    <div className="bg-[#0F0F23] h-full relative [&_.monaco-editor]:!bg-[#0F0F23] [&_.monaco-editor-background]:!bg-[#0F0F23] [&_.monaco-editor_.margin]:!bg-[#0F0F23] [&_.monaco-editor_.glyph-margin]:!bg-[#0F0F23] [&_.monaco-editor_.lines-content]:!bg-[#0F0F23]">
      <MonacoEditor
        value={code}
        path={modelPath}
        beforeMount={init}
        onMount={mountService}
        height="calc(100vh - 243px)"
        defaultLanguage="solidity"
        theme={theme}
        loading={<Spinner />}
        onChange={(value) => store.send({ type: "changeContent", content: value || "" })}
        options={{
          fontSize,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          theme: "vs-dark",
          padding: { top: 10, bottom: 10 },
          renderWhitespace: 'none',
          wordWrap: 'off',
          selectOnLineNumbers: true,
          roundedSelection: false,
          readOnly: false,
          cursorStyle: 'line',
          // Enhanced editing experience
          tabSize: 4,
          insertSpaces: true,
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,
          // Bracket matching
          matchBrackets: 'always',
          bracketPairColorization: { enabled: true },
          // Auto-closing
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          autoSurround: 'languageDefined',
          // Suggestions
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          wordBasedSuggestions: 'currentDocument',
          // Code folding
          folding: true,
          foldingStrategy: 'auto',
          showFoldingControls: 'mouseover',
          // Line numbers and guides
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          guides: {
            bracketPairs: true,
            indentation: true
          },
          // Smooth scrolling
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          // Parameter hints
          parameterHints: { enabled: true },
          // Hover
          hover: { enabled: true, delay: 300 }
        }}
      />
    </div>
  );
}

export default Editor;
