"use client";

import * as React from "react";
import { roomInviteUrl } from "@/lib/room-links";
import Link from "next/link";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Mic, MicOff, Video, VideoOff, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface RoomLobbyProps {
  roomCode: string;
  isHost: boolean;
  onJoin: (settings: {
    participantName: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
    stream: MediaStream | null;
  }) => void;
}

export function RoomLobby({ roomCode, isHost, onJoin }: RoomLobbyProps) {
  const [participantName, setParticipantName] = React.useState(
    isHost ? "Interviewer" : "Candidate"
  );
  const [videoEnabled, setVideoEnabled] = React.useState(true);
  const [audioEnabled, setAudioEnabled] = React.useState(true);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const [mediaPending, setMediaPending] = React.useState(true);
  const [mediaAttempt, setMediaAttempt] = React.useState(0);
  const joined = React.useRef(false);

  // Initialize camera and mic preview
  React.useEffect(() => {
    let activeStream: MediaStream | null = null;
    let cancelled = false;

    async function initMedia() {
      setMediaPending(true);
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access requires HTTPS or localhost.");
        let userMedia: MediaStream;
        try {
          userMedia = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (error) {
          // A missing microphone must not prevent an available camera from working.
          if (error instanceof DOMException && error.name === "NotFoundError") {
            userMedia = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else throw error;
        }
        if (cancelled) { userMedia.getTracks().forEach((track) => track.stop()); return; }
        activeStream = userMedia;
        setStream(userMedia);
        setVideoEnabled(userMedia.getVideoTracks().length > 0);
        setAudioEnabled(userMedia.getAudioTracks().length > 0);
        setPermissionError(null);

        if (videoRef.current) {
          videoRef.current.srcObject = userMedia;
        }
      } catch (err: any) {
        if (cancelled) return;
        console.warn("[Lobby] Media device access warning:", err);
        setPermissionError(
          window.isSecureContext
            ? "Allow camera and microphone access in your browser, then retry. You can also join without them."
            : "Open this room over HTTPS (or localhost) to use your camera and microphone."
        );
        setVideoEnabled(false);
        setAudioEnabled(false);
      } finally {
        if (!cancelled) setMediaPending(false);
      }
    }

    initMedia();

    return () => {
      cancelled = true;
      if (!joined.current) activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, [mediaAttempt]);

  // Update video element when stream or videoEnabled changes
  React.useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = videoEnabled;
      });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = audioEnabled;
      });
    }
  }, [videoEnabled, audioEnabled, stream]);

  const toggleVideo = () => {
    if (!stream) return;
    setVideoEnabled((prev) => !prev);
  };

  const toggleAudio = () => {
    if (!stream) return;
    setAudioEnabled((prev) => !prev);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (mediaPending) return;
    joined.current = true;
    onJoin({
      participantName: participantName.trim() || (isHost ? "Interviewer" : "Candidate"),
      videoEnabled,
      audioEnabled,
      stream,
    });
  };

  return (
    <div className="room-lobby"><header className="room-nav"><Link href="/" className="room-brand"><span />InterviewLab</Link><ThemeToggle /></header><div className="room-lobby-intro"><p className="font-mono text-sm text-muted-foreground">One link. Two people. Your next great hire.</p><h1>Make yourself<br />at <span>home.</span></h1></div>
      <div className="room-lobby-card">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/40">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Ready when you are.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Room ID: <span className="font-mono font-semibold text-foreground">{roomCode}</span>
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              isHost
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-emerald-500/30 bg-emerald-500/10 text-[var(--live)]"
            }
          >
            {isHost ? "Host (Interviewer)" : "Candidate"}
          </Badge>
        </div>

        {/* Video Preview Box */}
        <div className="room-video-tile relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-950 border border-border/60 flex items-center justify-center mb-6">
          {videoEnabled && stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
              <div className="room-avatar">
                {participantName.slice(0, 1).toUpperCase() || "A"}
              </div>
              <span className="text-xs">Camera is turned off</span>
            </div>
          )}

          {/* Floating Media Toggles */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <Button
              type="button"
              variant={audioEnabled ? "secondary" : "destructive"}
              size="icon"
              className="size-9 rounded-full"
              onClick={toggleAudio}
              disabled={!stream}
              aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
            >
              {audioEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            </Button>
            <Button
              type="button"
              variant={videoEnabled ? "secondary" : "destructive"}
              size="icon"
              className="size-9 rounded-full"
              onClick={toggleVideo}
              disabled={!stream}
              aria-label={videoEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {videoEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
            </Button>
          </div>
        </div>

        {/* Permission Notice */}
        {permissionError && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-400" />
            <div><span>{permissionError}</span><Button type="button" variant="outline" className="mt-2" onClick={() => setMediaAttempt((attempt) => attempt + 1)} disabled={mediaPending}>Retry camera</Button></div>
          </div>
        )}

        {/* Share the actual room before joining. */}
        <Button variant="outline" className="w-full mb-5" onClick={async () => {
          try { await navigator.clipboard.writeText(roomInviteUrl(roomCode, window.location.origin)); toast.success("Room link copied"); }
          catch { toast.error("Copy the room link from the address bar."); }
        }}>Copy room link</Button>
        {/* Join Form */}
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label htmlFor="participant-name" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Your display name
            </label>
            <Input
              id="participant-name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="e.g. Alex Smith"
              maxLength={40}
              className="h-11 rounded-xl bg-background"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={mediaPending}
            size="lg"
            className="w-full h-12 rounded-xl bg-primary  text-primary-foreground font-semibold text-base gap-2  "
          >
            <span>{mediaPending ? "Setting up camera..." : "Enter room"}</span>
            <ArrowRight className="size-4" />
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
            <ShieldCheck className="size-3.5 text-[var(--live)]" />
            <span>Audio & video are direct P2P and unrecorded</span>
          </div>
        </form>
      </div>
    </div>
  );
}
