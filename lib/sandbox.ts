import { LANGUAGE_METADATA, type SupportedLanguage } from "@/lib/schemas/room";

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  error?: string;
}

// In-memory rate limiting per room
const rateLimits: Map<string, number> = new Map();
const RATE_LIMIT_WINDOW_MS = 1500; // 1.5 seconds between runs per room

export async function executeCode(
  roomId: string,
  language: SupportedLanguage,
  source: string,
  stdin: string = ""
): Promise<ExecutionResult> {
  // Rate limiting check
  const now = Date.now();
  const lastRun = rateLimits.get(roomId);
  if (lastRun && now - lastRun < RATE_LIMIT_WINDOW_MS) {
    const waitSec = ((RATE_LIMIT_WINDOW_MS - (now - lastRun)) / 1000).toFixed(1);
    return {
      stdout: "",
      stderr: `Rate limit: Please wait ${waitSec}s before running code again.`,
      exitCode: 429,
      timeMs: 0,
      error: "Rate limited",
    };
  }
  rateLimits.set(roomId, now);

  const meta = LANGUAGE_METADATA[language];
  const startTime = Date.now();

  try {
    const pistonUrl = process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s overall timeout

    const fileExtension: Record<SupportedLanguage, string> = {
      javascript: "js",
      typescript: "ts",
      python: "py",
      java: "java",
      cpp: "cpp",
    };

    const fileName = language === "java" ? "Main.java" : `solution.${fileExtension[language]}`;

    const response = await fetch(`${pistonUrl}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: meta.pistonLang,
        version: meta.pistonVersion,
        files: [
          {
            name: fileName,
            content: source,
          },
        ],
        stdin: stdin || "",
        run_timeout: 5000,
        compile_timeout: 5000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      return {
        stdout: "",
        stderr: `Sandbox error (${response.status}): ${errText || "Execution failed"}`,
        exitCode: response.status,
        timeMs: elapsed,
      };
    }

    const data = await response.json();
    const run = data.run || {};
    const compile = data.compile || {};

    let stdout = run.stdout || "";
    let stderr = (compile.stderr ? compile.stderr + "\n" : "") + (run.stderr || "");
    const exitCode = typeof run.code === "number" ? run.code : compile.code ?? 0;

    // Output size cap (max 20 KB)
    if (stdout.length > 20_000) {
      stdout = stdout.substring(0, 20_000) + "\n...[Output truncated: exceeded 20KB cap]";
    }
    if (stderr.length > 20_000) {
      stderr = stderr.substring(0, 20_000) + "\n...[Error output truncated]";
    }

    return {
      stdout,
      stderr,
      exitCode,
      timeMs: elapsed,
    };
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    if (err.name === "AbortError") {
      return {
        stdout: "",
        stderr: "Execution timed out (exceeded 5s limit).",
        exitCode: 124,
        timeMs: elapsed,
      };
    }

    // Fallback if Piston API is offline or network is disconnected:
    // Safe evaluation for JavaScript
    if (language === "javascript") {
      return runSafeLocalJS(source, elapsed);
    }

    return {
      stdout: "",
      stderr: `Sandbox service unreachable: ${err?.message || "Network error"}. Please check your internet connection or Piston service.`,
      exitCode: 1,
      timeMs: elapsed,
    };
  }
}

// Local JS sandbox fallback
function runSafeLocalJS(code: string, initialElapsed: number): ExecutionResult {
  const start = Date.now();
  const logs: string[] = [];
  const errors: string[] = [];

  const mockConsole = {
    log: (...args: any[]) => logs.push(args.map(formatArg).join(" ")),
    error: (...args: any[]) => errors.push(args.map(formatArg).join(" ")),
    warn: (...args: any[]) => logs.push("[WARN] " + args.map(formatArg).join(" ")),
    info: (...args: any[]) => logs.push(args.map(formatArg).join(" ")),
  };

  try {
    const fn = new Function("console", `"use strict";\n${code}`);
    fn(mockConsole);
    return {
      stdout: logs.join("\n"),
      stderr: errors.join("\n"),
      exitCode: 0,
      timeMs: initialElapsed + (Date.now() - start),
    };
  } catch (err: any) {
    return {
      stdout: logs.join("\n"),
      stderr: err.toString(),
      exitCode: 1,
      timeMs: initialElapsed + (Date.now() - start),
    };
  }
}

function formatArg(arg: any): string {
  if (typeof arg === "object" && arg !== null) {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}
