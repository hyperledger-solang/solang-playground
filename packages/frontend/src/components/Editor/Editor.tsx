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

  return (
    <div className="bg-[#0F0F23] h-full relative [&_.monaco-editor]:!bg-[#0F0F23] [&_.monaco-editor-background]:!bg-[#0F0F23] [&_.monaco-editor_.margin]:!bg-[#0F0F23] [&_.monaco-editor_.glyph-margin]:!bg-[#0F0F23] [&_.monaco-editor_.lines-content]:!bg-[#0F0F23]">
      <MonacoEditor
        value={code}
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
          padding: { top: 0, bottom: 0 },
          renderWhitespace: 'none',
          wordWrap: 'off',
          selectOnLineNumbers: true,
          roundedSelection: false,
          readOnly: false,
          cursorStyle: 'line'
        }}
      />
    </div>
  );
}

export default Editor;
