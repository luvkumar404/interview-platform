"use client";

import * as React from "react";
import { Terminal, Clock, CheckCircle2, XCircle, Trash2, Keyboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OutputPanelProps {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timeMs: number | null;
  isRunning: boolean;
  stdin: string;
  onStdinChange: (val: string) => void;
  onClear: () => void;
}

export function OutputPanel({
  stdout,
  stderr,
  exitCode,
  timeMs,
  isRunning,
  stdin,
  onStdinChange,
  onClear,
}: OutputPanelProps) {
  const [activeTab, setActiveTab] = React.useState<"output" | "stdin">("output");

  const hasOutput = Boolean(stdout || stderr || isRunning);

  return (
    <div className="h-full flex flex-col bg-background/95 border-t border-border/50 font-mono text-xs select-text">
      {/* Panel Tab Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/40 px-3 bg-muted/20">
        <div className="flex items-center gap-1.5 font-sans">
          <button
            onClick={() => setActiveTab("output")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "output"
                ? "bg-background text-foreground shadow-xs border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="size-3.5 text-indigo-400" />
            <span>Execution Output</span>
            {isRunning && (
              <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("stdin")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "stdin"
                ? "bg-background text-foreground shadow-xs border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Keyboard className="size-3.5 text-muted-foreground" />
            <span>Standard Input (stdin)</span>
            {stdin && (
              <span className="size-1.5 rounded-full bg-indigo-400" />
            )}
          </button>
        </div>

        {/* Status badges & action buttons */}
        <div className="flex items-center gap-2 font-sans">
          {isRunning ? (
            <Badge
              variant="outline"
              className="h-5 text-[10px] text-amber-400 border-amber-500/30 gap-1 bg-amber-500/10"
            >
              <div className="size-2 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              <span>Running...</span>
            </Badge>
          ) : (
            <>
              {exitCode !== null && (
                <Badge
                  variant="outline"
                  className={`h-5 text-[10px] gap-1 ${
                    exitCode === 0
                      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                      : "text-rose-400 border-rose-500/30 bg-rose-500/10"
                  }`}
                >
                  {exitCode === 0 ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <XCircle className="size-3" />
                  )}
                  <span>Exit: {exitCode}</span>
                </Badge>
              )}

              {timeMs !== null && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="size-3 text-muted-foreground" />
                  <span>{(timeMs / 1000).toFixed(2)}s</span>
                </div>
              )}
            </>
          )}

          {hasOutput && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground h-6 w-6"
              title="Clear Console"
            >
              <Trash2 className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Panel Tab Content */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === "output" ? (
          <div>
            {isRunning ? (
              <div className="flex items-center gap-2 text-muted-foreground italic py-2">
                <div className="size-3 animate-spin rounded-full border border-indigo-400 border-t-transparent" />
                <span>Executing code in isolated sandbox...</span>
              </div>
            ) : !hasOutput ? (
              <div className="text-muted-foreground/60 italic py-2 text-xs">
                Press &quot;Run Code&quot; (or Cmd/Ctrl + Enter) to compile and execute your program.
              </div>
            ) : (
              <div className="space-y-2">
                {stdout && (
                  <pre className="text-foreground whitespace-pre-wrap leading-relaxed">
                    {stdout}
                  </pre>
                )}
                {stderr && (
                  <pre className="text-rose-400/90 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 whitespace-pre-wrap leading-relaxed">
                    {stderr}
                  </pre>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <textarea
              value={stdin}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder="Enter stdin text passed to your code (optional)..."
              className="w-full h-full min-h-[90px] p-2 rounded-lg bg-muted/30 border border-border/50 text-foreground text-xs font-mono resize-none focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        )}
      </div>
    </div>
  );
}
