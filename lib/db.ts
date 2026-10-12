import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Room, type Run } from "@/src/generated/prisma/client";

export type { Room, Run };

// Database storage abstraction
interface StorageAdapter {
  createRoom(code: string, hostToken: string, language: string, expiresAt: Date): Promise<Room>;
  getRoom(code: string): Promise<Room | null>;
  endRoom(code: string): Promise<boolean>;
  updateRoomContent(code: string, content: string): Promise<void>;
  updateRoomLanguage(code: string, language: string): Promise<void>;
  recordRun(roomId: string, data: {
    language: string;
    source: string;
    stdin?: string;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    timeMs?: number;
  }): Promise<Run>;
  getRoomRuns(roomId: string): Promise<Run[]>;
}

// Memory & File-backed fallback store when Postgres is offline
class LocalFallbackStore implements StorageAdapter {
  private rooms: Map<string, Room> = new Map();
  private runs: Map<string, Run[]> = new Map();
  private storageFilePath: string;

  constructor() {
    const dir = path.join(process.cwd(), ".data");
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        // ignore
      }
    }
    this.storageFilePath = path.join(dir, "rooms.json");
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.rooms)) {
          for (const r of parsed.rooms) {
            this.rooms.set(r.code, {
              ...r,
              createdAt: new Date(r.createdAt),
              expiresAt: new Date(r.expiresAt),
            });
          }
        }
        if (parsed.runs && typeof parsed.runs === "object") {
          for (const [roomId, runList] of Object.entries(parsed.runs)) {
            if (Array.isArray(runList)) {
              this.runs.set(
                roomId,
                runList.map((run: any) => ({
                  ...run,
                  createdAt: new Date(run.createdAt),
                }))
              );
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  private persist() {
    try {
      const payload = {
        rooms: Array.from(this.rooms.values()),
        runs: Object.fromEntries(this.runs.entries()),
      };
      fs.writeFileSync(this.storageFilePath, JSON.stringify(payload, null, 2), "utf-8");
    } catch {
      // ignore
    }
  }

  async createRoom(code: string, hostToken: string, language: string, expiresAt: Date): Promise<Room> {
    const room: Room = {
      id: "room_" + Math.random().toString(36).substring(2, 10),
      code,
      hostToken,
      language,
      content: "",
      status: "ACTIVE",
      createdAt: new Date(),
      expiresAt,
    };
    this.rooms.set(code, room);
    this.persist();
    return room;
  }

  async getRoom(code: string): Promise<Room | null> {
    const room = this.rooms.get(code);
    if (!room) return null;
    return room;
  }

  async endRoom(code: string): Promise<boolean> {
    const room = this.rooms.get(code);
    if (!room) return false;
    room.status = "ENDED";
    this.rooms.set(code, room);
    this.persist();
    return true;
  }

  async updateRoomContent(code: string, content: string): Promise<void> {
    const room = this.rooms.get(code);
    if (room) {
      room.content = content;
      this.rooms.set(code, room);
      this.persist();
    }
  }

  async updateRoomLanguage(code: string, language: string): Promise<void> {
    const room = this.rooms.get(code);
    if (room) {
      room.language = language;
      this.rooms.set(code, room);
      this.persist();
    }
  }

  async recordRun(roomId: string, data: {
    language: string;
    source: string;
    stdin?: string;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    timeMs?: number;
  }): Promise<Run> {
    const run: Run = {
      id: "run_" + Math.random().toString(36).substring(2, 10),
      roomId,
      language: data.language,
      source: data.source,
      stdin: data.stdin ?? null,
      stdout: data.stdout ?? null,
      stderr: data.stderr ?? null,
      exitCode: data.exitCode ?? 0,
      timeMs: data.timeMs ?? 0,
      createdAt: new Date(),
    };
    const list = this.runs.get(roomId) || [];
    list.push(run);
    this.runs.set(roomId, list);
    this.persist();
    return run;
  }

  async getRoomRuns(roomId: string): Promise<Run[]> {
    return this.runs.get(roomId) || [];
  }
}

// Prisma Store when Postgres is accessible
class PrismaStore implements StorageAdapter {
  private client: PrismaClient;

  constructor(client: PrismaClient) {
    this.client = client;
  }

  async createRoom(code: string, hostToken: string, language: string, expiresAt: Date): Promise<Room> {
    return this.client.room.create({
      data: {
        code,
        hostToken,
        language,
        expiresAt,
      },
    });
  }

  async getRoom(code: string): Promise<Room | null> {
    return this.client.room.findUnique({
      where: { code },
    });
  }

  async endRoom(code: string): Promise<boolean> {
    const res = await this.client.room.updateMany({
      where: { code, status: "ACTIVE" },
      data: { status: "ENDED" },
    });
    return res.count > 0;
  }

  async updateRoomContent(code: string, content: string): Promise<void> {
    await this.client.room.updateMany({
      where: { code },
      data: { content },
    });
  }

  async updateRoomLanguage(code: string, language: string): Promise<void> {
    await this.client.room.updateMany({
      where: { code },
      data: { language },
    });
  }

  async recordRun(roomId: string, data: {
    language: string;
    source: string;
    stdin?: string;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    timeMs?: number;
  }): Promise<Run> {
    return this.client.run.create({
      data: {
        roomId,
        language: data.language,
        source: data.source,
        stdin: data.stdin,
        stdout: data.stdout,
        stderr: data.stderr,
        exitCode: data.exitCode,
        timeMs: data.timeMs,
      },
    });
  }

  async getRoomRuns(roomId: string): Promise<Run[]> {
    return this.client.run.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
    });
  }
}

// Singleton storage resolver with resilient fallback
const fallbackStore = new LocalFallbackStore();
let prismaStore: PrismaStore | null = null;
let usePrisma = false;

if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("randompassword")) {
  try {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    const client = new PrismaClient({ adapter });
    prismaStore = new PrismaStore(client);
    usePrisma = true;
  } catch (err) {
    console.warn("[DB] Prisma init error, using local fallback store:", err);
  }
}

export const db: StorageAdapter = {
  async createRoom(code, hostToken, language, expiresAt) {
    if (usePrisma && prismaStore) {
      try {
        return await prismaStore.createRoom(code, hostToken, language, expiresAt);
      } catch {
        return fallbackStore.createRoom(code, hostToken, language, expiresAt);
      }
    }
    return fallbackStore.createRoom(code, hostToken, language, expiresAt);
  },

  async getRoom(code) {
    if (usePrisma && prismaStore) {
      try {
        return await prismaStore.getRoom(code);
      } catch {
        return fallbackStore.getRoom(code);
      }
    }
    return fallbackStore.getRoom(code);
  },

  async endRoom(code) {
    if (usePrisma && prismaStore) {
      try {
        return await prismaStore.endRoom(code);
      } catch {
        return fallbackStore.endRoom(code);
      }
    }
    return fallbackStore.endRoom(code);
  },

  async updateRoomContent(code, content) {
    if (usePrisma && prismaStore) {
      try {
        return await prismaStore.updateRoomContent(code, content);
      } catch {
        return fallbackStore.updateRoomContent(code, content);
      }
    }
    return fallbackStore.updateRoomContent(code, content);
  },

  async updateRoomLanguage(code, language) {
    if (usePrisma && prismaStore) {
      try {
        return await prismaStore.updateRoomLanguage(code, language);
      } catch {
        return fallbackStore.updateRoomLanguage(code, language);
      }
    }
    return fallbackStore.updateRoomLanguage(code, language);
  },

  async recordRun(roomId, data) {
    if (usePrisma && prismaStore) {
      try {
        return await prismaStore.recordRun(roomId, data);
      } catch {
        return fallbackStore.recordRun(roomId, data);
      }
    }
    return fallbackStore.recordRun(roomId, data);
  },

  async getRoomRuns(roomId) {
    if (usePrisma && prismaStore) {
      try {
        return await prismaStore.getRoomRuns(roomId);
      } catch {
        return fallbackStore.getRoomRuns(roomId);
      }
    }
    return fallbackStore.getRoomRuns(roomId);
  },
};
