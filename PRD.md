# PRD: Interview Platform

**Version:** 1.0
**Status:** Draft

---

## 1. Overview

A lightweight, no-login platform for live technical interviews. An interviewer creates a room and shares the room ID. The candidate joins with that ID. Both get a shared code editor, video/audio call, and a sandboxed code runner in one browser tab.

## 2. Goals & Non-Goals

### Goals
- Create a room and join it in under 10 seconds, with zero sign-up.
- Real-time shared code editor visible to both participants.
- Peer-to-peer video/audio via WebRTC.
- Run code safely in an isolated sandbox and show output to both participants.
- A polished landing page that explains the product and gets users into a room fast.
- A clean, smooth, distraction-free UI with consistent motion and no layout jank.
- Every input (API, socket, form) validated with Zod.

### Non-Goals (v1)
- Authentication, user accounts, or profiles.
- Interview scheduling, calendars, or email invites.
- Recording or playback of sessions.
- Scoring, question banks, or AI evaluation.
- More than two participants per room.

## 3. Users

| Role | Description |
|---|---|
| **Interviewer** | Creates the room, shares the ID, controls the session (language, ending the room). |
| **Candidate** | Joins using the room ID, writes and runs code, talks over video. |

Roles are determined by how a person enters (create vs. join), not by login.

## 4. User Flows

### 4.1 Interviewer
1. Opens the home page and clicks **Create Room**.
2. Is redirected to `/room/[roomId]` as host.
3. Copies the room ID / link and shares it with the candidate.
4. Waits for the candidate; conducts the interview; clicks **End Interview**.

### 4.2 Candidate
1. Opens the home page, enters the room ID, clicks **Join Room**.
2. Grants camera/mic permission.
3. Lands in the same room and starts collaborating.

### 4.3 Edge cases
- Invalid or expired room ID → clear error on the join screen.
- Room already has two participants → "Room is full".
- Participant disconnects → peer sees status change; can rejoin with the same ID.
- Camera/mic denied → the user can still join with the editor and chat only.

## 5. Functional Requirements

### 5.0 Landing Page
- **FR-L1:** Public landing page at `/` with a hero: headline, one-line value prop, and two primary actions (**Create Room**, **Join with ID**).
- **FR-L2:** "How it works" section in 3 steps: create a room, share the ID, interview together.
- **FR-L3:** Feature highlights: live code editor, run code in a sandbox, built-in video call, no sign-up.
- **FR-L4:** A product preview (static screenshot or animated mock of the room UI).
- **FR-L5:** Footer with minimal links (GitHub, privacy note).
- **FR-L6:** Join-by-ID input on the landing page validates the format inline and redirects to `/room/[roomId]`.
- **FR-L7:** Light and dark theme with a toggle; respects system preference.

### 5.1 Room Management
- **FR-1:** Interviewer can create a room; system generates a short, unguessable ID (e.g. 8-10 chars, nanoid).
- **FR-2:** Candidate can join by ID or shareable link (`/room/[roomId]`).
- **FR-3:** Max 2 participants per room.
- **FR-4:** Host-only controls: change language, end room.
- **FR-5:** Rooms auto-expire after a set period (default 24h) or when the host ends them.
- **FR-6:** Host identity is proven by a host token issued at creation and stored in the browser (cookie/localStorage). No accounts.
- **FR-6a:** Room ID format is validated with Zod on the client and again on the server before any database lookup.

### 5.2 Code Editor
- **FR-7:** Monaco-based editor with syntax highlighting.
- **FR-8:** Edits sync in real time between both participants; both can type.
- **FR-9:** Language selector (v1: JavaScript, TypeScript, Python, Java, C++). Selection syncs to both.
- **FR-10:** Latest code snapshot is saved to the database so a refresh or rejoin restores state.
- **FR-11:** Remote cursor/selection indicators (nice to have).

### 5.3 Code Execution (Sandbox)
- **FR-12:** A **Run** button executes the current code in an isolated sandbox.
- **FR-13:** Optional stdin input.
- **FR-14:** stdout, stderr, exit code, and execution time shown in an output panel, synced to both participants.
- **FR-15:** Limits enforced: execution timeout (e.g. 5s), memory cap, no network access, output size cap.
- **FR-16:** Rate limiting per room to prevent abuse.

### 5.4 Real-Time Communication
- **FR-17:** Peer-to-peer audio/video using WebRTC.
- **FR-18:** A signaling server relays offer/answer/ICE candidates between the two peers.
- **FR-19:** STUN servers by default; TURN server configurable for restrictive networks.
- **FR-20:** Mute/unmute mic, toggle camera, leave call.
- **FR-21:** Basic in-room text chat (nice to have).
- **FR-22:** Presence indicators (joined, left, reconnecting).

### 5.5 Validation (Zod)
- **FR-23:** All API route bodies and params are parsed with Zod; invalid input returns `400` with structured field errors.
- **FR-24:** Every incoming socket event payload is parsed with Zod before being handled or broadcast. Invalid payloads are dropped and the sender gets an error event.
- **FR-25:** Schemas live in a shared `src/lib/schemas/` module and are used by both client and server so types and rules never drift (`z.infer` for TypeScript types).
- **FR-26:** Environment variables are validated at startup with a Zod schema; the app fails fast if config is missing.
- **FR-27:** Limits enforced via schemas: room ID format, language allow-list, source code max size, stdin max size, chat message length.

Example schemas:

```ts
export const roomCodeSchema = z.string().regex(/^[A-Za-z0-9_-]{8,12}$/);
export const languageSchema = z.enum(["javascript", "typescript", "python", "java", "cpp"]);
export const runRequestSchema = z.object({
  language: languageSchema,
  source: z.string().min(1).max(50_000),
  stdin: z.string().max(5_000).optional(),
});
```

## 6. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Latency** | Editor sync under ~150 ms; video call setup under 3 s on normal networks. |
| **Security** | Sandbox fully isolated from the host; code never runs on the app server process. Room IDs unguessable. Input validated server-side. |
| **Reliability** | Auto-reconnect for signaling socket; ICE restart on connection drop. |
| **Privacy** | No personal data collected. Video/audio is peer-to-peer and not stored. |
| **Browser support** | Latest Chrome, Edge, Firefox, Safari. |
| **Responsiveness** | Landing page fully responsive (mobile to desktop). Room view desktop-first; usable on tablet. |
| **Performance** | Landing page LCP under 2 s; Monaco loaded lazily (dynamic import) so it never blocks the landing page. |
| **Accessibility** | Keyboard navigable, visible focus states, WCAG AA contrast, `prefers-reduced-motion` respected. |

## 7. Technical Architecture

### 7.1 Stack
| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| UI | shadcn/ui + Tailwind CSS |
| Animation | Motion (`motion/react`) |
| Validation | Zod (shared schemas for forms, API routes, socket events) |
| Forms | React Hook Form + `@hookform/resolvers` (Zod resolver) |
| Editor | Monaco (`@monaco-editor/react`) |
| Real-time | Socket.IO via a custom Node server (signaling + editor sync) |
| Video/Audio | Native WebRTC APIs |
| Database | PostgreSQL |
| ORM | Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Sandbox | Self-hosted Judge0 CE or Piston (Docker) |

### 7.2 High-Level Diagram

```
 Interviewer Browser  <------ WebRTC (P2P media) ------>  Candidate Browser
        |                                                        |
        |------------ Socket.IO (signaling + editor sync) -------|
                                  |
                      Next.js + Socket.IO server
                         |                |
                    Prisma 7          Sandbox API
                         |           (Judge0 / Piston)
                    PostgreSQL
```

### 7.3 Key Design Decisions
- **Custom server for WebSockets:** Next.js route handlers on serverless platforms do not hold long-lived WebSocket connections, so Socket.IO runs in a custom Node server alongside Next.js (or as a separate service).
- **Editor sync:** v1 broadcasts changes through Socket.IO with last-write-wins on small diffs. If conflicts become a problem, upgrade to Yjs (CRDT) with `y-monaco`.
- **Sandbox is a separate service:** The app calls its HTTP API; untrusted code never executes inside the Next.js process.
- **Execution flow:** Client → Next.js API route (validates, rate-limits) → sandbox → result → broadcast to the room.

### 7.4 Data Model (Prisma)

```prisma
model Room {
  id          String    @id @default(cuid())
  code        String    @unique          // public room ID shared with candidate
  hostToken   String                     // secret proving host identity
  language    String    @default("javascript")
  content     String    @default("")     // latest editor snapshot
  status      RoomStatus @default(ACTIVE)
  createdAt   DateTime  @default(now())
  expiresAt   DateTime
  runs        Run[]
}

model Run {
  id         String   @id @default(cuid())
  roomId     String
  room       Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  language   String
  source     String
  stdin      String?
  stdout     String?
  stderr     String?
  exitCode   Int?
  timeMs     Int?
  createdAt  DateTime @default(now())
}

enum RoomStatus {
  ACTIVE
  ENDED
}
```

### 7.5 Socket Events

| Event | Direction | Purpose |
|---|---|---|
| `room:join` | client → server | Join a room channel |
| `room:peer-joined` / `room:peer-left` | server → client | Presence |
| `rtc:offer` / `rtc:answer` / `rtc:ice` | both | WebRTC signaling |
| `editor:change` | both | Code diffs |
| `editor:language` | both | Language change |
| `run:started` / `run:result` | server → client | Execution status and output |
| `chat:message` | both | Text chat |

### 7.6 API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/rooms` | POST | Create room, return code + host token |
| `/api/rooms/[code]` | GET | Validate room exists and is joinable |
| `/api/rooms/[code]/run` | POST | Execute code in sandbox |
| `/api/rooms/[code]/end` | POST | End room (host token required) |

## 8. UI / UX

### 8.1 Design Principles
- **Clean:** generous whitespace, a neutral palette with one accent color, restrained typography (one sans font plus one mono font for code).
- **Smooth:** short, purposeful transitions (150-300 ms, ease-out). Page and panel transitions fade/slide gently; buttons and tiles have subtle hover and press states.
- **Consistent:** use shadcn/ui components and a single set of design tokens (colors, radius, spacing, shadows) for both themes.
- **Calm during interviews:** no pop-ups or motion inside the room that distracts from the candidate's work.
- **Stable layout:** skeleton loaders and fixed panel sizes so nothing jumps while Monaco, video, or data loads.
- **Reduced motion:** all animation disabled or simplified when `prefers-reduced-motion` is set.

### 8.2 Screens

1. **Landing page (`/`)**
   - Sticky minimal navbar: logo, theme toggle, *Create Room* button.
   - Hero: large headline, short subtext, primary CTA (*Create Room*), secondary join input (*Enter room ID*). Soft entrance animation on load.
   - Product preview: framed mock of the room (editor + video tiles) with a subtle scroll reveal.
   - How it works: 3 numbered steps.
   - Features grid: editor, sandbox, video call, no sign-up.
   - Final CTA band and footer.
2. **Create / Join flow**
   - Create: one click creates the room, then shows a confirmation card with the copyable ID/link before entering.
   - Join: ID input with inline Zod validation, loading state, clear error messages (not found, full, ended).
3. **Pre-join lobby**
   - Camera/mic preview, device selection, mute toggles, **Join** button. Works even if permissions are denied.
4. **Room**
   - Left: Monaco editor with language selector and Run button.
   - Bottom: output panel with *Output* and *Stdin* tabs; resizable.
   - Right: video tiles (self and peer), mic/camera/leave controls, optional chat.
   - Top bar: room ID with copy button, connection status badge, End Interview (host only).
   - Resizable panels; layout remembered per browser.
5. **State screens:** room not found, room full, room ended, connection lost (with reconnect indicator). Each is a simple centered card with one action.

### 8.3 Interaction Details
- Toasts (sonner) for copy confirmations, join/leave events, and errors.
- Run button shows a spinner and disables during execution; output streams in with a fade.
- Peer join/leave animates the video tile in/out instead of snapping.
- Dark and light themes via `next-themes`, no flash on load.

## 9. Success Metrics

- Time from landing to both participants in a room: < 30 s.
- Successful WebRTC connection rate: > 90%.
- Code run success (sandbox returns a result): > 99%.
- Editor sync round-trip: < 150 ms p95.
- Landing page: Lighthouse performance and accessibility scores of 90+.

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Sandbox abuse (crypto mining, fork bombs, escapes) | Resource limits, no network, isolated containers, rate limits |
| WebRTC fails behind strict NATs/firewalls | Configure TURN fallback |
| Anyone with the ID can join | Long unguessable IDs, 2-person cap, auto-expiry |
| Concurrent edit conflicts | Start with simple sync; move to Yjs if needed |
| WebSockets unsupported on target host | Deploy on a Node-capable host (VPS, Railway, Fly.io, Render) |

## 11. Milestones

| Phase | Scope |
|---|---|
| **M1** | Project setup, design tokens, **landing page**, Zod schemas, room create/join, DB schema |
| **M2** | Monaco editor with real-time sync, language switching |
| **M3** | Sandbox integration, output panel, limits |
| **M4** | WebRTC video/audio, signaling, controls |
| **M5** | Polish: animations, lobby, reconnects, error states, chat, expiry, accessibility pass, deployment |

## 12. Open Questions

- Which sandbox: Judge0 CE or Piston (hosting cost vs. language coverage)?
- Is a TURN server needed from day one, or only after testing on real networks?
- Should the host be able to lock the editor (read-only for the candidate)?
- Room lifetime: 24h default, or configurable by the host?