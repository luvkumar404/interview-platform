"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Code2,
  Video,
  Play,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
  Users2,
  Clock,
  ExternalLink,
  Laptop,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { roomCodeSchema } from "@/lib/schemas/room";

export default function LandingPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = React.useState("");
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [createdRoom, setCreatedRoom] = React.useState<{
    code: string;
    hostToken: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [currentYear, setCurrentYear] = React.useState<number>(2026);

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Handle Create Room
  const handleCreateRoom = async () => {
    try {
      setIsCreating(true);
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "javascript" }),
      });

      if (!res.ok) {
        throw new Error("Failed to create room");
      }

      const data = await res.json();
      if (data.success && data.room?.code) {
        // Save host token locally
        if (typeof window !== "undefined") {
          localStorage.setItem(`host_token_${data.room.code}`, data.hostToken);
        }
        setCreatedRoom({ code: data.room.code, hostToken: data.hostToken });
        toast.success("Room created successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  // Validate and Join Room
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinCode.trim();
    const result = roomCodeSchema.safeParse(trimmed);

    if (!result.success) {
      setJoinError("Room ID must be 8-12 alphanumeric characters");
      return;
    }

    setJoinError(null);
    router.push(`/room/${trimmed}`);
  };

  const copyToClipboard = async (text: string, isCode = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isCode) {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const roomUrl = createdRoom
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/room/${createdRoom.code}`
    : "";

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-indigo-500/20">
      {/* Sticky Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20">
              <Code2 className="size-5" />
            </div>
            <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              InterviewLab
            </span>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex text-[11px] font-normal border-indigo-500/20 text-indigo-400 bg-indigo-500/10 ml-1.5"
            >
              v1.0 Zero-Login
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-500/25 gap-1.5 font-medium px-4 h-9"
            >
              {isCreating ? (
                <>
                  <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>Create Room</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
          {/* Subtle Ambient Background Gradients */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-500/15 via-violet-500/10 to-transparent blur-3xl dark:from-indigo-500/20 dark:via-purple-500/15" />
          <div className="pointer-events-none absolute top-1/2 left-1/4 -z-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="container mx-auto max-w-5xl px-4 sm:px-6 text-center">
            {/* Pill Announcement */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-3.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm mb-6"
            >
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time technical interview environment</span>
              <span className="text-border">|</span>
              <span className="text-indigo-400 font-semibold">Zero sign-up</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl max-w-4xl mx-auto leading-[1.12]"
            >
              Conduct live coding interviews{" "}
              <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400 bg-clip-text text-transparent">
                in one browser tab.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Instant collaborative Monaco code editor, peer-to-peer WebRTC
              video, and isolated sandbox code execution. No accounts, no installs,
              just one shareable room link.
            </motion.p>

            {/* Primary Action Buttons & Join Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row max-w-xl mx-auto"
            >
              {/* Create Room Button */}
              <Button
                size="lg"
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full sm:w-auto h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all text-base gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Spinning up room...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    <span>Create Free Room</span>
                    <ArrowRight className="size-4 ml-1" />
                  </>
                )}
              </Button>

              <div className="text-xs text-muted-foreground uppercase font-medium">
                or
              </div>

              {/* Join Room Form */}
              <form
                onSubmit={handleJoinRoom}
                className="w-full sm:w-auto flex flex-col sm:flex-row gap-2"
              >
                <div className="relative">
                  <Input
                    placeholder="Enter Room ID"
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value);
                      if (joinError) setJoinError(null);
                    }}
                    className={`h-12 w-full sm:w-48 rounded-xl bg-background/80 border-border/80 text-sm font-mono tracking-wide placeholder:font-sans ${
                      joinError ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                  {joinError && (
                    <span className="absolute -bottom-5 left-1 text-[11px] text-destructive">
                      {joinError}
                    </span>
                  )}
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-xl px-5 border-border/80 font-medium hover:bg-muted"
                >
                  Join
                </Button>
              </form>
            </motion.div>

            {/* Quick Metrics */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-indigo-400" />
                <span>Ready in &lt; 5 seconds</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span>Encrypted P2P Media</span>
              </div>
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-sky-400" />
                <span>5 Supported Languages</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Product UI Interactive Mock Preview */}
        <section className="container mx-auto max-w-6xl px-4 sm:px-6 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-2xl backdrop-blur-xl"
          >
            {/* Mock Window Header */}
            <div className="flex h-11 items-center justify-between border-b border-border/50 bg-muted/40 px-4">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-rose-500/80" />
                <div className="size-3 rounded-full bg-amber-500/80" />
                <div className="size-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  room/9kL2xQ4v7p &bull; TypeScript
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium"
                >
                  <span className="size-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                  Live (2/2 Connected)
                </Badge>
              </div>
            </div>

            {/* Mock Room Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px] font-mono text-xs">
              {/* Code Editor Mock (Col 8) */}
              <div className="lg:col-span-8 border-b lg:border-b-0 lg:border-r border-border/40 p-4 bg-background/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/30 text-muted-foreground text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Solution.ts</span>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">
                        Interviewer typing...
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-sans text-xs">● Synced</span>
                    </div>
                  </div>
                  <pre className="text-zinc-300 leading-relaxed overflow-x-auto">
                    <code>
                      {`// Implement twoSum function with optimal O(n) runtime
function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
}

// Test verification
console.log("Result:", twoSum([2, 7, 11, 15], 9)); // [0, 1]`}
                    </code>
                  </pre>
                </div>

                <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-sans">
                    <Terminal className="size-3.5 text-indigo-400" />
                    <span>Run output: 0.12s elapsed</span>
                  </div>
                  <Badge variant="outline" className="text-[11px] text-emerald-400 border-emerald-500/30">
                    Exit Code: 0 (Success)
                  </Badge>
                </div>
              </div>

              {/* Video & Terminal Preview (Col 4) */}
              <div className="lg:col-span-4 p-4 flex flex-col gap-3 bg-muted/20">
                {/* Video Tile 1: Peer */}
                <div className="relative rounded-xl border border-border/50 bg-zinc-900/90 h-36 flex flex-col items-center justify-center overflow-hidden group">
                  <div className="size-14 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                    JD
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 px-2 py-0.5 rounded text-[10px] text-white">
                    <Video className="size-3 text-emerald-400" />
                    <span>John (Candidate)</span>
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] border border-emerald-500/30">
                    HD P2P
                  </div>
                </div>

                {/* Video Tile 2: Self */}
                <div className="relative rounded-xl border border-border/50 bg-zinc-900/90 h-28 flex flex-col items-center justify-center overflow-hidden">
                  <div className="size-10 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center text-white font-semibold text-sm">
                    You
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 px-2 py-0.5 rounded text-[10px] text-white">
                    <span>Host (Interviewer)</span>
                  </div>
                </div>

                {/* Synced Console Mock */}
                <div className="rounded-xl border border-border/40 bg-black/60 p-3 flex-1 flex flex-col">
                  <span className="text-[10px] font-sans text-muted-foreground uppercase tracking-wider mb-1 font-semibold">
                    Live Output
                  </span>
                  <div className="text-emerald-400 text-[11px]">
                    $ running TypeScript solution...
                  </div>
                  <div className="text-zinc-200 text-[11px] mt-1">
                    Result: [ 0, 1 ]
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* How It Works (3 Steps) */}
        <section className="border-t border-border/40 bg-muted/20 py-20">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 mb-3">
                Workflow
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Get started in 3 simple steps
              </h2>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base">
                Zero friction. No sign-up walls or calendar sync required.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative rounded-2xl border border-border/50 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 font-bold text-sm mb-4">
                  1
                </div>
                <h3 className="text-lg font-semibold mb-2">Create Room</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Click Create Room. The system generates a cryptographic 10-character
                  room ID and issues you a host token.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-2xl border border-border/50 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 font-bold text-sm mb-4">
                  2
                </div>
                <h3 className="text-lg font-semibold mb-2">Share Room Link</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Copy the link and send it via Slack, email, or chat. The candidate
                  joins directly from their browser.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-2xl border border-border/50 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 font-bold text-sm mb-4">
                  3
                </div>
                <h3 className="text-lg font-semibold mb-2">Interview & Run</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Collaborate live in Monaco, speak over HD WebRTC video, and run
                  code in an isolated sandbox with instant output.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="py-20">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 mb-3">
                Features
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Engineered for serious technical interviews
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-border/40 bg-card/50 p-6 backdrop-blur">
                <div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                  <Laptop className="size-5" />
                </div>
                <h4 className="font-semibold text-base mb-1.5">Monaco Editor</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The industry standard editor powering VS Code. Full syntax
                  highlighting, bracket matching, and smooth real-time sync.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-border/40 bg-card/50 p-6 backdrop-blur">
                <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <Zap className="size-5" />
                </div>
                <h4 className="font-semibold text-base mb-1.5">Sandboxed Runner</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Execute JavaScript, TypeScript, Python, Java, and C++ with strict
                  resource limits, stdin capability, and synced results.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-border/40 bg-card/50 p-6 backdrop-blur">
                <div className="size-9 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4">
                  <Video className="size-5" />
                </div>
                <h4 className="font-semibold text-base mb-1.5">P2P WebRTC Call</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Encrypted browser-to-browser audio and video with toggleable
                  camera, mic mute, and reliable reconnect logic.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-2xl border border-border/40 bg-card/50 p-6 backdrop-blur">
                <div className="size-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="size-5" />
                </div>
                <h4 className="font-semibold text-base mb-1.5">Total Privacy</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Zero accounts or tracking. Media flows directly between the two
                  browsers and is never recorded or retained.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="rounded-2xl border border-border/40 bg-card/50 p-6 backdrop-blur">
                <div className="size-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                  <Users2 className="size-5" />
                </div>
                <h4 className="font-semibold text-base mb-1.5">Two-Person Rooms</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Strict 2-participant limit enforced at the socket and API level.
                  Rooms automatically expire after 24 hours.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="rounded-2xl border border-border/40 bg-card/50 p-6 backdrop-blur">
                <div className="size-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
                  <Terminal className="size-5" />
                </div>
                <h4 className="font-semibold text-base mb-1.5">Zod Type Safety</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Every form, API route, and WebSocket event validated strictly
                  with Zod schemas, keeping the platform rock-solid.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Room Created Modal */}
        {createdRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Room Ready!</h3>
                  <p className="text-xs text-muted-foreground">
                    Share this ID or link with your candidate
                  </p>
                </div>
              </div>

              {/* Room Code */}
              <div className="mb-4 rounded-xl border border-border/60 bg-muted/40 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Room Code
                  </span>
                  <button
                    onClick={() => copyToClipboard(createdRoom.code, true)}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {copiedCode ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    <span>{copiedCode ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="font-mono text-xl font-bold tracking-wider text-foreground">
                  {createdRoom.code}
                </div>
              </div>

              {/* Share URL */}
              <div className="mb-6 rounded-xl border border-border/60 bg-muted/40 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Shareable Link
                  </span>
                  <button
                    onClick={() => copyToClipboard(roomUrl, false)}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {copiedLink ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    <span>{copiedLink ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="font-mono text-xs truncate text-muted-foreground">
                  {roomUrl}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => router.push(`/room/${createdRoom.code}`)}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl gap-2"
                >
                  <span>Enter Room Lobby</span>
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setCreatedRoom(null)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-background">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Code2 className="size-4 text-indigo-400" />
            <span>InterviewLab &copy; {currentYear}</span>
            <span>&bull;</span>
            <span>Zero-login technical interview platform</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="hover:text-foreground transition-colors cursor-pointer" onClick={() => toast.info("InterviewLab stores no personal data. WebRTC audio/video is peer-to-peer and unrecorded.")}>
              Privacy Note
            </span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
