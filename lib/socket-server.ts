import { Server as SocketIOServer, Socket } from "socket.io";
import { db } from "@/lib/db";
import {
  joinRoomPayloadSchema,
  editorChangePayloadSchema,
  languageChangePayloadSchema,
  rtcSignalPayloadSchema,
  chatMessagePayloadSchema,
} from "@/lib/schemas/room";

// Room participant tracking: roomId -> Map<socketId, { isHost: boolean; name: string }>
const roomParticipants = new Map<string, Map<string, { isHost: boolean; name: string }>>();

// Debounce timer for persisting editor snapshot to DB
const saveDebounce = new Map<string, NodeJS.Timeout>();

export function initSocketServer(io: SocketIOServer) {
  io.on("connection", (socket: Socket) => {
    let currentRoomId: string | null = null;

    // Room join event
    socket.on("room:join", async (rawPayload) => {
      const parsed = joinRoomPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        socket.emit("room:error", {
          message: "Invalid join payload",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const { roomId, isHost = false, participantName = "Anonymous" } = parsed.data;

      const room = await db.getRoom(roomId);
      if (!room) {
        socket.emit("room:error", { message: "Room does not exist" });
        return;
      }

      if (room.status === "ENDED") {
        socket.emit("room:ended", { message: "Interview has concluded" });
        return;
      }

      let participants = roomParticipants.get(roomId);
      if (!participants) {
        participants = new Map();
        roomParticipants.set(roomId, participants);
      }

      // Max 2 participants check (FR-3)
      if (participants.size >= 2 && !participants.has(socket.id)) {
        socket.emit("room:full", {
          message: "Room has reached maximum capacity (2 participants)",
        });
        return;
      }

      currentRoomId = roomId;
      socket.join(roomId);
      participants.set(socket.id, { isHost, name: participantName });

      // Notify the joining client of current state
      socket.emit("room:joined", {
        roomId,
        participantCount: participants.size,
        content: room.content,
        language: room.language,
        participants: Array.from(participants.values()),
      });

      // If peer already exists in room, notify existing peer and current user
      if (participants.size === 2) {
        socket.to(roomId).emit("room:peer-joined", {
          participantName,
          isHost,
          participantCount: 2,
        });

        // Let current joiner know peer is present
        const peerEntry = Array.from(participants.entries()).find(([id]) => id !== socket.id);
        if (peerEntry) {
          socket.emit("room:peer-present", {
            peerName: peerEntry[1].name,
            peerIsHost: peerEntry[1].isHost,
          });
        }
      }
    });

    // Real-time editor code sync
    socket.on("editor:change", (rawPayload) => {
      const parsed = editorChangePayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        socket.emit("room:error", { message: "Invalid editor change payload" });
        return;
      }

      const { roomId, content } = parsed.data;
      // Broadcast to peer in room
      socket.to(roomId).emit("editor:change", { content });

      // Debounce DB snapshot save (save 1 second after last change)
      const existingTimeout = saveDebounce.get(roomId);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeout = setTimeout(async () => {
        try {
          await db.updateRoomContent(roomId, content);
        } catch (err) {
          console.error("[Socket] Failed to persist room content:", err);
        }
      }, 1000);

      saveDebounce.set(roomId, timeout);
    });

    // Language change
    socket.on("editor:language", async (rawPayload) => {
      const parsed = languageChangePayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        socket.emit("room:error", { message: "Invalid language payload" });
        return;
      }

      const { roomId, language } = parsed.data;
      // Broadcast to peer
      socket.to(roomId).emit("editor:language", { language });

      try {
        await db.updateRoomLanguage(roomId, language);
      } catch (err) {
        console.error("[Socket] Failed to update room language:", err);
      }
    });

    // WebRTC signaling
    socket.on("rtc:signal", (rawPayload) => {
      const parsed = rtcSignalPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        socket.emit("room:error", { message: "Invalid RTC signal payload" });
        return;
      }

      const { roomId, data } = parsed.data;
      // Relay signal to peer in the room
      socket.to(roomId).emit("rtc:signal", data);
    });

    // Code execution broadcast
    socket.on("run:broadcast", (rawPayload) => {
      if (!rawPayload?.roomId) return;
      socket.to(rawPayload.roomId).emit("run:result", rawPayload);
    });

    // Chat message
    socket.on("chat:message", (rawPayload) => {
      const parsed = chatMessagePayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        socket.emit("room:error", { message: "Invalid chat payload" });
        return;
      }

      const message = {
        id: parsed.data.id || Math.random().toString(36).substring(2, 9),
        sender: parsed.data.sender,
        text: parsed.data.text,
        timestamp: parsed.data.timestamp || Date.now(),
      };

      // Broadcast to all participants in room including sender
      io.to(parsed.data.roomId).emit("chat:message", message);
    });

    // Disconnect cleanup
    socket.on("disconnect", () => {
      if (currentRoomId) {
        const participants = roomParticipants.get(currentRoomId);
        if (participants) {
          const leavingUser = participants.get(socket.id);
          participants.delete(socket.id);

          if (participants.size === 0) {
            roomParticipants.delete(currentRoomId);
          } else {
            socket.to(currentRoomId).emit("room:peer-left", {
              participantName: leavingUser?.name || "Participant",
              participantCount: participants.size,
            });
          }
        }
      }
    });
  });
}
