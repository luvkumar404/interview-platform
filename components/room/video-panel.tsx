"use client";

import * as React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users2,
  Copy,
  Check,
  PhoneOff,
  Radio,
  Signal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface VideoPanelProps {
  roomCode: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localName: string;
  remoteName: string | null;
  isHost: boolean;
  isPeerConnected: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeaveCall: () => void;
}

export function VideoPanel({
  roomCode,
  localStream,
  remoteStream,
  localName,
  remoteName,
  isHost,
  isPeerConnected,
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeaveCall,
}: VideoPanelProps) {
  const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Bind local stream
  React.useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Bind remote stream
  React.useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isPeerConnected]);

  const copyRoomInvite = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success("Interview invite link copied!");
  };

  return (
    <div className="h-full flex flex-col justify-between bg-card/40 border-l border-border/50 p-3 overflow-y-auto">
      <div className="flex flex-col gap-3">
        {/* Remote Peer Video Tile */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-950 border border-border/60 flex items-center justify-center shadow-inner group">
          {isPeerConnected && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2.5 p-4 text-center">
              <div className="relative">
                <div className="size-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Users2 className="size-5 animate-pulse" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-amber-500 ring-2 ring-zinc-950" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">
                  Waiting for {isHost ? "candidate" : "interviewer"}...
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Share the link to join
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyRoomInvite}
                className="h-7 text-xs rounded-lg gap-1.5 mt-1 border-border/60 hover:bg-muted"
              >
                {copiedLink ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                <span>{copiedLink ? "Copied" : "Copy Invite"}</span>
              </Button>
            </div>
          )}

          {/* Remote Peer Info Tag */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-white">
            <Radio className={`size-3 ${isPeerConnected ? "text-emerald-400" : "text-amber-400"}`} />
            <span className="font-medium">
              {remoteName || (isHost ? "Candidate" : "Interviewer")}
            </span>
          </div>

          {isPeerConnected && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-emerald-400 border border-emerald-500/20">
              <Signal className="size-2.5" />
              <span>P2P</span>
            </div>
          )}
        </div>

        {/* Local Self Video Tile */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-950 border border-border/60 flex items-center justify-center shadow-inner">
          {videoEnabled && localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <div className="size-10 rounded-full bg-zinc-900 border border-border/40 flex items-center justify-center text-xs font-bold text-zinc-300">
                {localName.slice(0, 2).toUpperCase() || "ME"}
              </div>
              <span className="text-[10px]">Camera off</span>
            </div>
          )}

          {/* Local Name Tag */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-white">
            <span>{localName} (You)</span>
            <Badge
              variant="outline"
              className="text-[9px] py-0 px-1 h-3.5 border-border/40 text-muted-foreground"
            >
              {isHost ? "Host" : "Peer"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Floating Bottom Media Controls */}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-center gap-2">
        <Button
          variant={audioEnabled ? "secondary" : "destructive"}
          size="icon"
          onClick={onToggleAudio}
          className="size-9 rounded-xl shadow-sm"
          title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
          aria-label={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
        >
          {audioEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </Button>

        <Button
          variant={videoEnabled ? "secondary" : "destructive"}
          size="icon"
          onClick={onToggleVideo}
          className="size-9 rounded-xl shadow-sm"
          title={videoEnabled ? "Turn Off Camera" : "Turn On Camera"}
          aria-label={videoEnabled ? "Turn Off Camera" : "Turn On Camera"}
        >
          {videoEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onLeaveCall}
          className="size-9 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
          title="Disconnect Audio/Video"
          aria-label="Disconnect Audio/Video"
        >
          <PhoneOff className="size-4" />
        </Button>
      </div>
    </div>
  );
}
