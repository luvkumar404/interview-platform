"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { BeforeMount } from "@monaco-editor/react";
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
  const editorRef = React.useRef<any>(null);
  const monacoRef = React.useRef<any>(null);

  const monacoLang = LANGUAGE_METADATA[language]?.monacoId || "javascript";
  const editorTheme = "interviewlab";
  const defineTheme: BeforeMount = (monaco) => {
    const tokens = getComputedStyle(document.documentElement);
    const color = (name: string) => tokens.getPropertyValue(name).trim();
    monaco.editor.defineTheme("interviewlab", {
      base: "vs-dark", inherit: true,
      rules: [
        { token: "keyword", foreground: color("--keyword").slice(1) },
        { token: "string", foreground: color("--number").slice(1) },
        { token: "number", foreground: color("--number").slice(1) },
        { token: "comment", foreground: color("--code-muted").slice(1) },
        { token: "type.identifier", foreground: color("--function").slice(1) },
      ],
      colors: {
        "editor.background": color("--code"), "editor.foreground": color("--code-text"),
        "editorLineNumber.foreground": color("--code-muted"),
        "editorCursor.foreground": color("--function"),
        "editor.lineHighlightBackground": color("--code-panel"),
      },
    });
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.updateOptions({ fontFamily: `${getComputedStyle(document.documentElement).getPropertyValue("--font-plex")}, monospace` });

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
        beforeMount={defineTheme}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "var(--font-plex), monospace",
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          cursorBlinking: "solid",
          smoothScrolling: false,
          padding: { top: 12, bottom: 12 },
          lineHeight: 24.5,
          renderLineHighlight: "all",
        }}
      />
    </div>
  );
}
