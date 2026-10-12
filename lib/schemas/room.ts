import { z } from "zod";

export const SUPPORTED_LANGUAGES = ["javascript", "typescript", "python", "java", "cpp"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_METADATA: Record<
  SupportedLanguage,
  {
    name: string;
    monacoId: string;
    pistonLang: string;
    pistonVersion: string;
    defaultCode: string;
  }
> = {
  javascript: {
    name: "JavaScript",
    monacoId: "javascript",
    pistonLang: "javascript",
    pistonVersion: "18.15.0",
    defaultCode: `// Write your JavaScript solution here\nfunction solution() {\n  console.log("Hello from Interview Platform!");\n}\n\nsolution();\n`,
  },
  typescript: {
    name: "TypeScript",
    monacoId: "typescript",
    pistonLang: "typescript",
    pistonVersion: "5.0.3",
    defaultCode: `// Write your TypeScript solution here\ninterface User {\n  id: number;\n  name: string;\n}\n\nfunction greet(user: User): string {\n  return \`Welcome, \${user.name}!\`;\n}\n\nconsole.log(greet({ id: 1, name: "Candidate" }));\n`,
  },
  python: {
    name: "Python 3",
    monacoId: "python",
    pistonLang: "python",
    pistonVersion: "3.10.0",
    defaultCode: `# Write your Python solution here\ndef solution():\n    print("Hello from Interview Platform!")\n\nif __name__ == "__main__":\n    solution()\n`,
  },
  java: {
    name: "Java",
    monacoId: "java",
    pistonLang: "java",
    pistonVersion: "15.0.2",
    defaultCode: `// Write your Java solution here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Interview Platform!");\n    }\n}\n`,
  },
  cpp: {
    name: "C++",
    monacoId: "cpp",
    pistonLang: "c++",
    pistonVersion: "10.2.0",
    defaultCode: `// Write your C++ solution here\n#include <iostream>\n\nint main() {\n    std::cout << "Hello from Interview Platform!" << std::endl;\n    return 0;\n}\n`,
  },
};

// PRD Section 5.5: Room Code schema (8-12 alphanumeric / underscore / dash characters)
export const roomCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{8,12}$/, "Room ID must be 8-12 characters (alphanumeric, -, _)");

// Language enum schema
export const languageSchema = z.enum(SUPPORTED_LANGUAGES);

// Sandbox run request schema
export const runRequestSchema = z.object({
  language: languageSchema,
  source: z.string().min(1, "Code cannot be empty").max(50_000, "Code exceeds maximum size of 50,000 characters"),
  stdin: z.string().max(5_000, "stdin exceeds 5,000 characters limit").optional().default(""),
});

// Create room schema
export const createRoomSchema = z.object({
  language: languageSchema.optional().default("javascript"),
});

// End room schema
export const endRoomSchema = z.object({
  hostToken: z.string().min(1, "Host token is required"),
});

// Join room socket payload
export const joinRoomPayloadSchema = z.object({
  roomId: roomCodeSchema,
  isHost: z.boolean().optional(),
  participantName: z.string().max(50).optional(),
});

// Editor change socket payload
export const editorChangePayloadSchema = z.object({
  roomId: roomCodeSchema,
  content: z.string().max(50_000),
});

// Language change socket payload
export const languageChangePayloadSchema = z.object({
  roomId: roomCodeSchema,
  language: languageSchema,
  hostToken: z.string().optional(),
});

// RTC signal socket payload
export const rtcSignalPayloadSchema = z.object({
  roomId: roomCodeSchema,
  data: z.any(),
});

// Chat message socket payload
export const chatMessagePayloadSchema = z.object({
  roomId: roomCodeSchema,
  id: z.string().optional(),
  sender: z.string().min(1).max(50),
  text: z.string().min(1).max(2000),
  timestamp: z.number().optional(),
});

// Types inferred from schemas
export type RoomCode = z.infer<typeof roomCodeSchema>;
export type RunRequest = z.infer<typeof runRequestSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type EndRoomInput = z.infer<typeof endRoomSchema>;
export type JoinRoomPayload = z.infer<typeof joinRoomPayloadSchema>;
export type EditorChangePayload = z.infer<typeof editorChangePayloadSchema>;
export type LanguageChangePayload = z.infer<typeof languageChangePayloadSchema>;
export type RtcSignalPayload = z.infer<typeof rtcSignalPayloadSchema>;
export type ChatMessagePayload = z.infer<typeof chatMessagePayloadSchema>;
