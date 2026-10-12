"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  Code2,
  Play,
  Copy,
  Check,
  Share2,
  Users2,
  MessageSquare,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CodeEditor } from "./code-editor";
import { VideoPanel } from "./video-panel";
import { OutputPanel } from "./output-panel";
import { ChatDrawer, type ChatMessage } from "./chat-drawer";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_METADATA,
  type SupportedLanguage,
} from "@/lib/schemas/room";

interface RoomWorkspaceProps {
  roomCode: string;
  isHost: boolean;
  participantName: string;
  initialLanguage: SupportedLanguage;
  initialContent: string;
  localStream: MediaStream | null;
  initialAudioEnabled: boolean;
  initialVideoEnabled: boolean;
  onRoomEnded: () => void;
}

export function RoomWorkspace({
  roomCode,
  isHost,
  participantName,
  initialLanguage,
  initialContent,
  localStream,
  initialAudioEnabled,
  initialVideoEnabled,
  onRoomEnded,
}: RoomWorkspaceProps) {
  const router = useRouter();

  // Code & Language state
  const [language, setLanguage] = React.useState<SupportedLanguage>(initialLanguage);
  const [code, setCode] = React.useState<string>(
    initialContent || LANGUAGE_METADATA[initialLanguage]?.defaultCode || ""
  );
  const isRemoteEditRef = React.useRef(false);

  // Execution state
  const [isRunning, setIsRunning] = React.useState(false);
  const [stdout, setStdout] = React.useState("");
  const [stderr, setStderr] = React.useState("");
  const [exitCode, setExitCode] = React.useState<number | null>(null);
  const [timeMs, setTimeMs] = React.useState<number | null>(null);
  const [stdin, setStdin] = React.useState("");

  // Communication & Presence
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [isPeerConnected, setIsPeerConnected] = React.useState(false);
  const [peerName, setPeerName] = React.useState<string | null>(null);
  const [participantCount, setParticipantCount] = React.useState(1);

  // WebRTC Media state
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = React.useState(initialAudioEnabled);
  const [videoEnabled, setVideoEnabled] = React.useState(initialVideoEnabled);
  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null);

  // In-room Chat state
  const [chatOpen, setChatOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // UI state
  const [endDialogOpen, setEndDialogOpen] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState(false);

  // WebRTC Ice configuration
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Helper: create WebRTC Peer Connection
  const getOrCreatePeerConnection = (activeSocket: Socket) => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    // Attach local stream tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote incoming tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setIsPeerConnected(true);
      }
    };

    // Forward ICE candidates to peer via signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        activeSocket.emit("rtc:signal", {
          roomId: roomCode,
          data: { candidate: event.candidate },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setIsPeerConnected(false);
      } else if (pc.connectionState === "connected") {
        setIsPeerConnected(true);
      }
    };

    return pc;
  };

  // Helper: Create and send WebRTC Offer
  const initiateOffer = async (pc: RTCPeerConnection, activeSocket: Socket) => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      activeSocket.emit("rtc:signal", {
        roomId: roomCode,
        data: { offer },
      });
    } catch (err) {
      console.error("[WebRTC] Error creating offer:", err);
    }
  };

  // Initialize Socket.IO connection
  React.useEffect(() => {
    const newSocket = io(typeof window !== "undefined" ? window.location.origin : "", {
      transports: ["websocket", "polling"],
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      // Join Room
      newSocket.emit("room:join", {
        roomId: roomCode,
        isHost,
        participantName,
      });
    });

    // Joined confirmation
    newSocket.on("room:joined", (data: any) => {
      if (data.language) setLanguage(data.language);
      if (data.content && data.content.trim()) {
        isRemoteEditRef.current = true;
        setCode(data.content);
      }
      setParticipantCount(data.participantCount || 1);
    });

    // Peer joined
    newSocket.on("room:peer-joined", async (data: any) => {
      setParticipantCount(2);
      setIsPeerConnected(true);
      setPeerName(data.participantName || "Candidate");
      toast.info(`${data.participantName || "Peer"} joined the interview!`);

      // If we are Host or first peer, create and send WebRTC offer
      const pc = getOrCreatePeerConnection(newSocket);
      await initiateOffer(pc, newSocket);
    });

    // Peer already present in room
    newSocket.on("room:peer-present", (data: any) => {
      setParticipantCount(2);
      setIsPeerConnected(true);
      setPeerName(data.peerName || "Peer");
    });

    // Peer left
    newSocket.on("room:peer-left", (data: any) => {
      setParticipantCount(1);
      setIsPeerConnected(false);
      toast.warning(`${data.participantName || "Peer"} left the interview`);
    });

    // Editor code change
    newSocket.on("editor:change", (data: { content: string }) => {
      isRemoteEditRef.current = true;
      setCode(data.content);
    });

    // Language change
    newSocket.on("editor:language", (data: { language: SupportedLanguage }) => {
      setLanguage(data.language);
      toast.info(`Language switched to ${LANGUAGE_METADATA[data.language]?.name}`);
    });

    // Execution broadcast
    newSocket.on("run:result", (data: any) => {
      setIsRunning(false);
      if (data.result) {
        setStdout(data.result.stdout || "");
        setStderr(data.result.stderr || "");
        setExitCode(data.result.exitCode ?? 0);
        setTimeMs(data.result.timeMs ?? 0);
      }
      toast.success("Code run executed by peer");
    });

    // In-room Chat message
    newSocket.on("chat:message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (!chatOpen && msg.sender !== participantName) {
        setUnreadCount((prev) => prev + 1);
        toast.info(`New message from ${msg.sender}: "${msg.text.slice(0, 30)}..."`);
      }
    });

    // WebRTC Signaling messages
    newSocket.on("rtc:signal", async (signalData: any) => {
      const pc = getOrCreatePeerConnection(newSocket);

      try {
        if (signalData.offer) {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          newSocket.emit("rtc:signal", {
            roomId: roomCode,
            data: { answer },
          });
        } else if (signalData.answer) {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.answer));
        } else if (signalData.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      } catch (err) {
        console.error("[WebRTC] Signal handling error:", err);
      }
    });

    // Room Ended
    newSocket.on("room:ended", () => {
      onRoomEnded();
    });

    return () => {
      newSocket.disconnect();
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [roomCode, isHost, participantName]);

  // Code editor change handler
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);

    // If change came from remote peer, don't re-emit
    if (isRemoteEditRef.current) {
      isRemoteEditRef.current = false;
      return;
    }

    // Broadcast change to peer
    if (socket) {
      socket.emit("editor:change", {
        roomId: roomCode,
        content: newCode,
      });
    }
  };

  // Language selector handler
  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);

    // Set template code if code is currently empty or matches default
    const currentMeta = LANGUAGE_METADATA[language];
    if (!code.trim() || code === currentMeta?.defaultCode) {
      const template = LANGUAGE_METADATA[newLang]?.defaultCode || "";
      setCode(template);
      if (socket) {
        socket.emit("editor:change", { roomId: roomCode, content: template });
      }
    }

    if (socket) {
      socket.emit("editor:language", {
        roomId: roomCode,
        language: newLang,
      });
    }
  };

  // Run Code execution
  const handleRunCode = async () => {
    if (isRunning) return;

    try {
      setIsRunning(true);
      setStdout("");
      setStderr("");
      setExitCode(null);
      setTimeMs(null);

      const res = await fetch(`/api/rooms/${roomCode}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          source: code,
          stdin: stdin || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Execution failed");
      }

      const result = data.result;
      setStdout(result.stdout || "");
      setStderr(result.stderr || "");
      setExitCode(result.exitCode ?? 0);
      setTimeMs(result.timeMs ?? 0);

      // Broadcast result to peer
      if (socket) {
        socket.emit("run:broadcast", {
          roomId: roomCode,
          result,
        });
      }

      if (result.exitCode === 0) {
        toast.success("Execution completed successfully");
      } else {
        toast.error("Execution finished with errors");
      }
    } catch (err: any) {
      setStderr(err.message || "Execution request failed");
      setExitCode(1);
      toast.error(err.message || "Failed to run code");
    } finally {
      setIsRunning(false);
    }
  };

  // End Interview handler (Host only)
  const handleEndInterview = async () => {
    try {
      const hostToken =
        typeof window !== "undefined"
          ? localStorage.getItem(`host_token_${roomCode}`)
          : "";

      const res = await fetch(`/api/rooms/${roomCode}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostToken }),
      });

      if (!res.ok) {
        throw new Error("Failed to end interview");
      }

      setEndDialogOpen(false);
      toast.success("Interview ended");
      onRoomEnded();
    } catch (err: any) {
      toast.error(err.message || "Could not end interview");
    }
  };

  // Send Chat message
  const handleSendMessage = (text: string) => {
    if (socket) {
      socket.emit("chat:message", {
        roomId: roomCode,
        sender: participantName,
        text,
      });
    }
  };

  // Toggle Media
  const handleToggleAudio = () => {
    if (localStream) {
      const next = !audioEnabled;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });
      setAudioEnabled(next);
      toast.info(next ? "Microphone unmuted" : "Microphone muted");
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      const next = !videoEnabled;
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
      setVideoEnabled(next);
      toast.info(next ? "Camera enabled" : "Camera disabled");
    }
  };

  const handleLeaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    router.push("/");
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.success("Room ID copied to clipboard!");
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden selection:bg-indigo-500/20">
      {/* Top Header Toolbar */}
      <header className="h-13 shrink-0 border-b border-border/50 bg-background/90 backdrop-blur px-3 sm:px-4 flex items-center justify-between z-10">
        {/* Left: Brand & Room ID */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <div className="size-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Code2 className="size-4" />
            </div>
            <span className="font-bold text-sm tracking-tight hidden md:inline">
              InterviewLab
            </span>
          </div>

          <div className="h-4 w-px bg-border/60" />

          {/* Room ID with quick copy */}
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1 border border-border/40">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold">
              Room
            </span>
            <span className="font-mono text-xs font-bold text-foreground">
              {roomCode}
            </span>
            <button
              onClick={copyRoomCode}
              className="text-muted-foreground hover:text-foreground ml-1"
              title="Copy Room ID"
            >
              {copiedCode ? (
                <Check className="size-3 text-emerald-400" />
              ) : (
                <Copy className="size-3" />
              )}
            </button>
          </div>

          {/* Status Badge */}
          <Badge
            variant="outline"
            className={`hidden sm:inline-flex text-[11px] gap-1.5 ${
              participantCount === 2
                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                : "border-amber-500/30 text-amber-400 bg-amber-500/10"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                participantCount === 2 ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
              }`}
            />
            <span>{participantCount === 2 ? "2/2 Connected" : "Waiting for peer..."}</span>
          </Badge>

          {/* Host indicator */}
          <Badge
            variant="secondary"
            className="text-[10px] py-0 px-2 h-5 text-muted-foreground"
          >
            {isHost ? "Host" : "Candidate"}
          </Badge>
        </div>

        {/* Center: Language Selector & Run Button */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <Select
            value={language}
            onValueChange={(val) => handleLanguageChange(val as SupportedLanguage)}
          >
            <SelectTrigger className="h-8 w-32 text-xs font-medium rounded-lg bg-background border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang} className="text-xs">
                  {LANGUAGE_METADATA[lang].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Run Code Button */}
          <Button
            size="sm"
            onClick={handleRunCode}
            disabled={isRunning}
            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5 shadow-sm shadow-emerald-600/20"
          >
            {isRunning ? (
              <>
                <div className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Running</span>
              </>
            ) : (
              <>
                <Play className="size-3.5 fill-current" />
                <span>Run Code</span>
                <span className="text-[10px] opacity-70 hidden md:inline ml-0.5">
                  (Ctrl+Enter)
                </span>
              </>
            )}
          </Button>
        </div>

        {/* Right: Actions, Chat & Controls */}
        <div className="flex items-center gap-2">
          {/* Chat Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setChatOpen(!chatOpen);
              setUnreadCount(0);
            }}
            className="relative size-8 rounded-lg border border-border/40 hover:bg-muted"
            title="Toggle Text Chat"
          >
            <MessageSquare className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </Button>

          <ThemeToggle />

          {/* End Interview Button (Host Only) */}
          {isHost && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setEndDialogOpen(true)}
              className="h-8 px-2.5 text-xs rounded-lg gap-1.5"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">End Interview</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Workspace Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Code Editor (Top) & Output Panel (Bottom) */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Code Editor Container */}
          <div className="flex-1 min-h-[300px] overflow-hidden">
            <CodeEditor
              value={code}
              language={language}
              onChange={handleCodeChange}
              onRun={handleRunCode}
            />
          </div>

          {/* Output Panel Container */}
          <div className="h-56 shrink-0 overflow-hidden">
            <OutputPanel
              stdout={stdout}
              stderr={stderr}
              exitCode={exitCode}
              timeMs={timeMs}
              isRunning={isRunning}
              stdin={stdin}
              onStdinChange={setStdin}
              onClear={() => {
                setStdout("");
                setStderr("");
                setExitCode(null);
                setTimeMs(null);
              }}
            />
          </div>
        </div>

        {/* Right Side: Video Panel */}
        <div className="w-72 lg:w-80 shrink-0 border-l border-border/50 hidden md:flex flex-col">
          <VideoPanel
            roomCode={roomCode}
            localStream={localStream}
            remoteStream={remoteStream}
            localName={participantName}
            remoteName={peerName}
            isHost={isHost}
            isPeerConnected={isPeerConnected}
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            onToggleAudio={handleToggleAudio}
            onToggleVideo={handleToggleVideo}
            onLeaveCall={handleLeaveCall}
          />
        </div>

        {/* In-room Chat Drawer */}
        <ChatDrawer
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          messages={messages}
          currentUserName={participantName}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* End Interview Confirmation Dialog */}
      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Interview Session?</DialogTitle>
            <DialogDescription>
              This will conclude the room and disconnect both participants. Saved
              snapshots and execution logs will be finalized.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEndDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleEndInterview}>
              Yes, End Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
