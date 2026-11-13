"use client";

import * as React from "react";
import { roomInviteUrl } from "@/lib/room-links";
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
  mediaState: RTCPeerConnectionState;
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
  mediaState,
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeaveCall,
}: VideoPanelProps) {
  const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const [playbackBlocked, setPlaybackBlocked] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Bind local stream
  React.useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      void localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, videoEnabled]);

  // Some browsers block audible autoplay. Keep the video visible, then offer sound.
  React.useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video || !remoteStream) return;
    let cancelled = false;
    video.srcObject = remoteStream;
    video.muted = false;
    setPlaybackBlocked(false);
    void video.play().catch(async () => {
      if (cancelled) return;
      video.muted = true;
      setPlaybackBlocked(true);
      try { await video.play(); } catch { /* The visible play button provides a user gesture. */ }
    });
    return () => { cancelled = true; video.srcObject = null; };
  }, [remoteStream]);

  async function playRemote() {
    const video = remoteVideoRef.current;
    if (!video) return;
    try {
      video.muted = false;
      await video.play();
      setPlaybackBlocked(false);
    } catch { toast.error("Your browser blocked playback. Check its sound permissions and try again."); }
  }

  const copyRoomInvite = async () => {
    try {
    const url = roomInviteUrl(roomCode, window.location.origin);
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success("Room link copied");
    } catch { toast.error("Copy the room link from your browser’s address bar."); }
  };

  return (
    <div className="h-full flex flex-col justify-between bg-card/40 border-l border-border/50 p-3 overflow-y-auto">
      <div className="flex flex-col gap-3">
        {/* Remote Peer Video Tile */}
        <div className="room-video-tile relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-950 border border-border/60 flex items-center justify-center  group">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2.5 p-4 text-center">
              <div className="relative">
                <div className="size-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Users2 className="size-5 " />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-amber-500 ring-2 ring-zinc-950" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">
                  {isPeerConnected ? (mediaState === "failed" ? "Video connection failed" : "Connecting video...") : `Waiting for ${isHost ? "candidate" : "interviewer"}...`}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isPeerConnected ? "Check camera permission on both devices." : "Share the link to join"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyRoomInvite}
                className="h-7 text-xs rounded-lg gap-1.5 mt-1 border-border/60 "
              >
                {copiedLink ? <Check className="size-3 text-[var(--live)]" /> : <Copy className="size-3" />}
                <span>{copiedLink ? "Copied" : "Copy invite"}</span>
              </Button>
            </div>
          )}

          {remoteStream && playbackBlocked && <Button onClick={playRemote} className="absolute top-3 left-3 z-10">Play video and sound</Button>}
          {isPeerConnected && (mediaState === "failed" || mediaState === "disconnected") && <div className="absolute inset-x-2 top-2 z-10 bg-card p-3 rounded-xl text-foreground text-xs"><p>Video could not connect. Reconnect to try again.</p><Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>Reconnect video</Button></div>}
          {/* Remote Peer Info Tag */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-white">
            <Radio className={`size-3 ${isPeerConnected ? "text-[var(--live)]" : "text-amber-400"}`} />
            <span className="font-medium">
              {remoteName || (isHost ? "Candidate" : "Interviewer")}
            </span>
          </div>

          {mediaState === "connected" && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-[var(--live)] border border-emerald-500/20">
              <Signal className="size-2.5" />
              <span>peer-to-peer</span>
            </div>
          )}
        </div>

        {/* Local Self Video Tile */}
        <div className="room-video-tile relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-950 border border-border/60 flex items-center justify-center ">
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
              <div className="room-avatar">
                {localName.slice(0, 1).toUpperCase() || "ME"}
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
          className="size-9 rounded-xl "
          title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
          aria-label={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
        >
          {audioEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </Button>

        <Button
          variant={videoEnabled ? "secondary" : "destructive"}
          size="icon"
          onClick={onToggleVideo}
          className="size-9 rounded-xl "
          title={videoEnabled ? "Turn Off Camera" : "Turn On Camera"}
          aria-label={videoEnabled ? "Turn Off Camera" : "Turn On Camera"}
        >
          {videoEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onLeaveCall}
          className="size-9 rounded-xl border-destructive/30 text-destructive "
          title="Disconnect Audio/Video"
          aria-label="Disconnect Audio/Video"
        >
          <PhoneOff className="size-4" />
        </Button>
      </div>
    </div>
  );
}
