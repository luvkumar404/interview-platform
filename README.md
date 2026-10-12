# InterviewLab — Real-Time Technical Interview Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**InterviewLab** is a lightweight, zero-login platform for live technical interviews. An interviewer creates a room in one click and shares the unguessable room ID. Both candidate and interviewer join in under 10 seconds to collaborate with a shared Monaco code editor, peer-to-peer WebRTC video/audio, and an isolated multi-language code execution sandbox in a single browser tab.

---

## ✨ Features

- ⚡ **Zero Setup & No Sign-up Required**: Create a room in 1 second; host identity is securely verified with a client-side host token.
- 💻 **Real-Time Collaborative Monaco Editor**:
  - Full syntax highlighting for **JavaScript**, **TypeScript**, **Python**, **Java**, and **C++**.
  - Live two-way edit synchronization over WebSockets.
  - Keyboard shortcut: `Ctrl+Enter` / `Cmd+Enter` to run code instantly.
  - Dynamically imported to ensure sub-2s landing page load times.
- 🚀 **Isolated Multi-Language Sandbox**:
  - Executes code via Piston with stdout, stderr, exit codes, and execution timings.
  - Interactive **Standard Input (stdin)** tab for custom test cases.
  - Enforced resource caps: 5s execution timeout, 20 KB output cap, and room-level rate limiting.
  - Synchronized output panel: both participants see code execution results in real-time.
- 🎥 **Peer-to-Peer WebRTC Audio & Video**:
  - Encrypted direct browser-to-browser media stream.
  - Floating media controls: mic mute/unmute, camera toggle, and leave call.
  - Pre-join lobby with camera/mic hardware preview and permission fallback.
- 💬 **In-Room Text Chat**:
  - Slide-over real-time chat drawer with timestamped messages and unread indicator.
- 🎨 **Modern Design & Dark/Light Themes**:
  - Sleek glassmorphic dark mode and light mode toggle powered by `next-themes`.
  - Built with Tailwind CSS v4, Motion, and shadcn/ui primitives.
- 🛡️ **End-to-End Zod Validation**:
  - Every API route, form input, and incoming WebSocket payload is validated strictly against shared Zod schemas.

---

## 🏗️ Technical Architecture

```
 Interviewer Browser  <------ WebRTC (P2P media) ------>  Candidate Browser
        |                                                        |
        |------------ Socket.IO (signaling + editor sync) -------|
                                  |
                       Next.js + Socket.IO server (server.ts)
                          |                |
                     Prisma 7          Sandbox API
                    (PostgreSQL /     (Piston Engine)
                    Local Store)
```

### Tech Stack

| Layer | Choice |
|---|---|
| **Framework** | Next.js 16 (App Router, React 19, TypeScript) |
| **Real-time Server** | Socket.IO on custom Node.js HTTP server (`server.ts`) |
| **Styling** | Tailwind CSS v4 + shadcn/ui components |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Video & Audio** | Native WebRTC (`RTCPeerConnection` + STUN) |
| **Validation** | Zod (shared schemas in `lib/schemas/room.ts`) |
| **Database & ORM** | Prisma 7 (`@prisma/adapter-pg` + resilient local fallback) |
| **Sandbox Runner** | Piston Code Execution API |
| **Toasts** | Sonner |

---

## 📁 Repository Structure

```
interview-platform/
├── app/
│   ├── api/
│   │   └── rooms/
│   │       ├── route.ts                 # POST /api/rooms (create room)
│   │       └── [code]/
│   │           ├── route.ts             # GET /api/rooms/[code] (room state)
│   │           ├── end/route.ts         # POST /api/rooms/[code]/end (conclude)
│   │           └── run/route.ts         # POST /api/rooms/[code]/run (sandbox execution)
│   ├── room/
│   │   └── [code]/
│   │       └── page.tsx                 # Dynamic room route (lobby + workspace)
│   ├── globals.css                      # Tailwind v4 theme & token definitions
│   ├── layout.tsx                       # Root layout (ThemeProvider, Toaster)
│   └── page.tsx                         # Landing page with hero & interactive preview
├── components/
│   ├── room/
│   │   ├── code-editor.tsx              # Monaco editor with auto-sync & shortcuts
│   │   ├── output-panel.tsx             # Tabs for stdout/stderr and stdin
│   │   ├── video-panel.tsx              # Local & remote WebRTC video feeds
│   │   ├── chat-drawer.tsx              # In-room text chat
│   │   ├── room-lobby.tsx               # Pre-join camera/mic hardware check
│   │   └── room-workspace.tsx           # Unified live interview workspace
│   ├── theme-provider.tsx               # next-themes context provider
│   ├── theme-toggle.tsx                 # Light/Dark toggle button
│   └── ui/                              # shadcn/ui primitives
├── lib/
│   ├── db.ts                            # Resilient Prisma 7 + fallback persistence
│   ├── nanoid.ts                        # Room code and token generator
│   ├── sandbox.ts                       # Piston sandbox runner with timeouts & limits
│   ├── socket-server.ts                 # Real-time WebSocket event handler
│   └── schemas/
│       └── room.ts                      # Shared Zod validation schemas
├── prisma/
│   ├── schema.prisma                    # Room, Run, and RoomStatus Prisma models
│   └── migrations/
├── server.ts                            # Custom server unifying Next.js & Socket.IO
├── prisma7.config.ts                    # Prisma 7 config
└── package.json
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20+ (v22 recommended)
- **npm** or **bun**

### 2. Installation

```bash
git clone <repo-url>
cd interview-platform
npm install
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Run Development Server

```bash
npm run dev
```

The custom development server will boot on [http://localhost:3000](http://localhost:3000) with both Next.js and Socket.IO active.

---

## 📡 API Endpoints

| Route | Method | Description |
|---|---|---|
| `/api/rooms` | `POST` | Create a new room; generates a 10-char room ID and host token |
| `/api/rooms/:code` | `GET` | Validate room existence, expiration, and host role |
| `/api/rooms/:code/run` | `POST` | Execute code in sandbox with language and optional stdin |
| `/api/rooms/:code/end` | `POST` | Conclude interview session (requires host token) |

---

## 🔌 Socket Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `room:join` | Client ➔ Server | `{ roomId, isHost, participantName }` | Join room channel |
| `room:joined` | Server ➔ Client | `{ roomId, content, language, ... }` | Joined confirmation |
| `room:peer-joined` | Server ➔ Client | `{ participantName, isHost }` | Peer joined presence |
| `room:peer-left` | Server ➔ Client | `{ participantName }` | Peer disconnected |
| `editor:change` | Both | `{ roomId, content }` | Real-time code change |
| `editor:language` | Both | `{ roomId, language }` | Language switch |
| `rtc:signal` | Both | `{ roomId, data }` | WebRTC offer/answer/ICE candidate |
| `run:broadcast` | Client ➔ Server | `{ roomId, result }` | Execution result broadcast |
| `chat:message` | Both | `{ roomId, sender, text, timestamp }` | Text message |

---

## 🔒 Security & Privacy

- **No Personal Data**: No email, passwords, or personal accounts required.
- **P2P Encryption**: Video and audio streams travel directly between participants via WebRTC and are never recorded on the server.
- **Auto-Expiration**: All rooms automatically expire after 24 hours.
- **Sandbox Isolation**: Code execution runs inside an isolated container with strict timeouts and output size restrictions.

---

## 📄 License

MIT &copy; 2026 InterviewLab
