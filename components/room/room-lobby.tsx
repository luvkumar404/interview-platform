"use client";

import * as React from "react";
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

  // Initialize camera and mic preview
  React.useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function initMedia() {
      try {
        const userMedia = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        activeStream = userMedia;
        setStream(userMedia);
        setPermissionError(null);

        if (videoRef.current) {
          videoRef.current.srcObject = userMedia;
        }
      } catch (err: any) {
        console.warn("[Lobby] Media device access warning:", err);
        setPermissionError(
          "Camera or microphone access was denied or not found. You can still participate using the code editor and chat."
        );
        setVideoEnabled(false);
        setAudioEnabled(false);
      }
    }

    initMedia();

    return () => {
      // Don't stop tracks here if we plan to pass them to room, but if component unmounts without joining, clean up:
    };
  }, []);

  // Update video element when stream or videoEnabled changes
  React.useEffect(() => {
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
    if (!stream && !permissionError) return;
    setVideoEnabled((prev) => !prev);
  };

  const toggleAudio = () => {
    if (!stream && !permissionError) return;
    setAudioEnabled((prev) => !prev);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    onJoin({
      participantName: participantName.trim() || (isHost ? "Interviewer" : "Candidate"),
      videoEnabled,
      audioEnabled,
      stream,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-xl rounded-2xl border border-border/70 bg-card p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Ready to enter interview?
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Room ID: <span className="font-mono font-semibold text-foreground">{roomCode}</span>
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              isHost
                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            }
          >
            {isHost ? "Host (Interviewer)" : "Candidate"}
          </Badge>
        </div>

        {/* Video Preview Box */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-950 border border-border/60 flex items-center justify-center mb-6">
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
              <div className="size-16 rounded-full bg-zinc-900 border border-border/40 flex items-center justify-center text-xl font-bold text-zinc-300">
                {participantName.slice(0, 2).toUpperCase() || "ME"}
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
            <span>{permissionError}</span>
          </div>
        )}

        {/* Join Form */}
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Your Display Name
            </label>
            <Input
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
            size="lg"
            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base gap-2 shadow-lg shadow-indigo-500/20"
          >
            <span>Enter Room</span>
            <ArrowRight className="size-4" />
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            <span>Audio & video are direct P2P and unrecorded</span>
          </div>
        </form>
      </div>
    </div>
  );
}
