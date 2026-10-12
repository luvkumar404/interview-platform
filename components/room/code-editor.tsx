"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { LANGUAGE_METADATA, type SupportedLanguage } from "@/lib/schemas/room";

// Dynamically import Monaco Editor to never block SSR / initial bundle (PRD Section 6)
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted/20 text-muted-foreground text-xs font-mono">
      <div className="flex items-center gap-2">
        <div className="size-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <span>Loading Monaco Editor...</span>
      </div>
    </div>
  ),
});

interface CodeEditorProps {
  value: string;
  language: SupportedLanguage;
  onChange: (value: string) => void;
  onRun?: () => void;
}

export function CodeEditor({ value, language, onChange, onRun }: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const editorRef = React.useRef<any>(null);
  const monacoRef = React.useRef<any>(null);

  const monacoLang = LANGUAGE_METADATA[language]?.monacoId || "javascript";
  const editorTheme = resolvedTheme === "light" ? "light" : "vs-dark";

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Add keyboard shortcut for Cmd+Enter / Ctrl+Enter to Run code
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        if (onRun) onRun();
      }
    );
  };

  const handleEditorChange = (newValue: string | undefined) => {
    if (typeof newValue === "string") {
      onChange(newValue);
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <Editor
        height="100%"
        language={monacoLang}
        theme={editorTheme}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'Geist Mono', Menlo, Monaco, 'Courier New', monospace",
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          cursorBlinking: "smooth",
          smoothScrolling: true,
          padding: { top: 12, bottom: 12 },
          lineHeight: 22,
          renderLineHighlight: "all",
        }}
      />
    </div>
  );
}
