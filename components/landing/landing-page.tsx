"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ArrowRight, Copy, Monitor, Play, RefreshCw } from "lucide-react";
import { roomPath, roomInviteUrl } from "@/lib/room-links";
import "./landing.css";

type CreateActionProps = { onCreate: () => void; isCreating: boolean };

export function Nav({ onCreate, isCreating }: CreateActionProps) {
  return <header className="lab-nav"><a className="lab-logo" href="#"><span className="lab-live-dot" />InterviewLab</a><button className="lab-button lab-outline" onClick={onCreate} disabled={isCreating}>{isCreating ? "Creating room…" : "Create a room"} <ArrowRight size={16} aria-hidden="true" /></button></header>;
}

export function Hero({ onCreate, isCreating }: CreateActionProps) {
  return <section className="lab-hero" aria-labelledby="hero-title"><h1 id="hero-title">Interview in<br />one <span>tab.</span></h1><p>Run live coding interviews with a shared editor, face-to-face video and safe code execution. No accounts, no installs. Send one room link and start.</p><div className="lab-hero-actions"><button className="lab-button lab-primary" onClick={onCreate} disabled={isCreating}>{isCreating ? "Creating room…" : "Start an interview"} <ArrowRight size={18} aria-hidden="true" /></button><span className="lab-mono lab-hint">Ready in under 10 seconds</span></div></section>;
}

const code = [
  "// Return indices of two numbers that add up to target",
  "function twoSum(nums, target) {",
  "  const seen = new Map();",
  "  for (let i = 0; i < nums.length; i++) {",
  "    const need = target - nums[i];",
  "    if (seen.has(need)) return [seen.get(need), i];",
  "    seen.set(nums[i], i);",
  "  }", "}", "",
  "console.log(twoSum([2, 7, 11, 15], 9));",
];

function highlight(line: string) {
  if (line.startsWith("//")) return <span className="syntax-comment">{line}</span>;
  return line.split(/(\b(?:function|const|new|for|let|if|return)\b|\b\d+\b|\b\w+(?=\())/g).map((part, i) => {
    const kind = /^(function|const|new|for|let|if|return)$/.test(part) ? "keyword" : /^\d+$/.test(part) ? "number" : /^\w+$/.test(part) ? "function" : "plain";
    return <span key={i} className={`syntax-${kind}`}>{part}</span>;
  });
}

export function Editor() {
  return <div className="lab-editor"><div className="lab-editor-heading lab-mono"><span><span className="lab-file-mark">JS</span> two-sum.js</span><span>JavaScript</span></div><div className="lab-code-scroll" tabIndex={0} role="region" aria-label="JavaScript code preview, scroll horizontally to see all code"><pre className="lab-code"><code>{code.map((line, i) => <span className="lab-code-line" key={i}><span className="lab-line-number" aria-hidden="true">{i + 1}</span><span>{highlight(line)}{(i === 5 || i === 10) && <span className={`lab-cursor ${i === 5 ? "candidate" : "interviewer"}`}><span>{i === 5 ? "Candidate" : "Interviewer"}</span></span>}</span>{"\n"}</span>)}</code></pre></div><div className="lab-editor-footer lab-mono"><span><span className="lab-static-dot" /> 2 people in this room</span><span>All changes synced</span></div></div>;
}

export function VideoTile({ initial, name, tone }: { initial: string; name: string; tone: "mint" | "yellow" }) {
  return <div className={`lab-video ${tone}`}><span className="lab-peer lab-mono"><span className="lab-static-dot" /> peer-to-peer</span><div className="lab-avatar" aria-hidden="true">{initial}</div><span className="lab-video-name lab-mono">{name}</span></div>;
}

export function OutputPanel() {
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function run() {
    if (timer.current) clearTimeout(timer.current);
    setStatus("running");
    timer.current = setTimeout(() => setStatus("done"), 700);
  }
  return <section className="lab-output" aria-label="Code output"><div className="lab-output-heading"><span className="lab-mono">Output</span><button className="lab-button lab-run" onClick={run} disabled={status === "running"}><Play size={12} fill="currentColor" aria-hidden="true" />{status === "running" ? "Running…" : "Run code"}</button></div><div className="lab-output-text lab-mono" role="status" aria-live="polite">{status === "idle" ? "Output appears here for both of you." : status === "running" ? "Running in sandbox…" : <><span className="lab-result">[0, 1]</span><span className="lab-finished">✓ finished in 38 ms</span></>}</div></section>;
}

export function DemoWindow({ roomId, roomUrl }: { roomId: string; roomUrl?: string }) {
  return <section className="lab-demo" aria-label="Interactive interview demo"><div className="lab-titlebar lab-mono"><span className="lab-live">● live</span><span className="lab-demo-url">{roomUrl || `interviewlab.app/r/${roomId}`}</span><span className="lab-timer">00:24:18</span></div><div className="lab-demo-body"><Editor /><aside className="lab-sidebar" aria-label="Video and output"><VideoTile initial="A" name="Interviewer" tone="yellow" /><VideoTile initial="R" name="Candidate" tone="mint" /><OutputPanel /></aside></div></section>;
}

export function FeatureRow({ title, children }: { title: string; children: ReactNode }) {
  return <article className="lab-feature-row"><h3>{title}</h3><p>{children}</p></article>;
}

export function StepCard({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return <article className="lab-step"><span className="lab-step-label lab-mono">Step {step}</span><h3>{title}</h3><p>{children}</p></article>;
}

export function RoomBlock({ roomId, hostPath, isCreating, onNewRoom, notify }: { roomId: string; hostPath: string; isCreating: boolean; onNewRoom: () => void; notify: (message: string) => void }) {
  const link = roomId;
  const field = useRef<HTMLInputElement>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      notify("Link copied");
    } catch {
      field.current?.focus();
      field.current?.select();
      notify("Select the link and copy it");
    }
  }
  return <section className="lab-room" id="room" aria-labelledby="room-title"><h2 id="room-title">{link ? "Your room is ready." : "Your next interview starts here."}</h2><p>{link ? "Share this link with your candidate, then open the room to start." : "Create a room, share one link and start coding together."}</p><div className="lab-room-actions"><input ref={field} aria-label="Room link" className="lab-room-link lab-mono" value={link} placeholder="Create a room to get your invite link" readOnly onFocus={(event) => event.currentTarget.select()} /><button className="lab-button lab-light" onClick={copy} disabled={!link || isCreating}><Copy size={16} aria-hidden="true" />Copy room link</button><button className="lab-button lab-room-outline" onClick={onNewRoom} disabled={isCreating}><RefreshCw size={16} aria-hidden="true" />{isCreating ? "Creating…" : "New room"}</button>{link && <a className="lab-button lab-light" href={hostPath}>Open room <ArrowRight size={16} aria-hidden="true" /></a>}</div></section>;
}

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  return <div className={`lab-toast lab-mono ${visible ? "is-visible" : ""}`} role="status" aria-live="polite" aria-atomic="true">{visible ? message : ""}</div>;
}

export function Footer() {
  const { setTheme } = useTheme();
  return <footer className="lab-footer"><span className="lab-footer-brand">InterviewLab</span><label className="lab-theme"><Monitor size={14} aria-hidden="true" /><select aria-label="Color theme" defaultValue="" onChange={(event) => setTheme(event.target.value)}><option value="" disabled>Theme</option><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label><span>Interview in one tab.</span></footer>;
}

export function LandingPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const creating = useRef(false);
  async function createRoom(enter: boolean) {
    if (creating.current) return;
    creating.current = true;
    setIsCreating(true);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "javascript" }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.room?.code || !data.hostToken) {
        throw new Error(data.error || "Couldn’t create a room. Please try again.");
      }
      // The API also sets a host cookie, so restricted storage does not block joining.
      try { localStorage.setItem(`host_token_${data.room.code}`, data.hostToken); } catch {}
      const path = roomPath(data.room.code, "interviewer");
      setRoomId(data.room.code);
      setRoomUrl(roomInviteUrl(data.room.code, window.location.origin));
      notify("New room created");
      if (enter) router.push(path);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Couldn’t create a room. Please try again.");
    } finally {
      creating.current = false;
      setIsCreating(false);
    }
  }
  const [toast, setToast] = useState({ message: "", visible: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function notify(message: string) {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, visible: true });
    timer.current = setTimeout(() => setToast((current) => ({ ...current, visible: false })), 1800);
  }
  return <div className="lab-page"><div className="lab-container"><Nav onCreate={() => void createRoom(true)} isCreating={isCreating} /><main><Hero onCreate={() => void createRoom(true)} isCreating={isCreating} /><DemoWindow roomId={roomId ?? "k7x-p2m-9qd"} roomUrl={roomUrl} /><section className="lab-features" aria-labelledby="features-title"><h2 id="features-title">Everything a technical interview needs, nothing it doesn’t.</h2><div className="lab-feature-list"><FeatureRow title="Shared Monaco editor">The same editor VS Code uses. Both people type at once, see each other’s cursors and get syntax highlighting for the language you pick.</FeatureRow><FeatureRow title="Peer-to-peer video">Video and audio go directly between browsers over <code className="lab-chip">WebRTC</code>. There’s no call to schedule and no app to install, so you talk while the candidate codes.</FeatureRow><FeatureRow title="Isolated code execution">Press Run and the code executes in a sandbox, away from your machine and the candidate’s. Output shows up for both of you at the same time.</FeatureRow><FeatureRow title="One link, no accounts">Rooms use long unguessable IDs instead of logins. Whoever has the link joins, and the room is gone when you leave.</FeatureRow></div></section><section className="lab-steps" aria-labelledby="steps-title"><h2 id="steps-title">From link to first line of code.</h2><div className="lab-step-grid"><StepCard step={1} title="Create a room">One click gives you a fresh room with an unguessable ID.</StepCard><StepCard step={2} title="Share the link">Send it by email or chat. The candidate opens it in any modern browser.</StepCard><StepCard step={3} title="Code together">Pick a language, set the problem, talk it through and run the code live.</StepCard></div></section><RoomBlock roomId={roomUrl} hostPath={roomId ? roomPath(roomId, "interviewer") : ""} isCreating={isCreating} onNewRoom={() => void createRoom(false)} notify={notify} /></main><Footer /></div><Toast {...toast} /></div>;
}
