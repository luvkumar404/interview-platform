"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Clock,
  Users2,
  Home,
  Code2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoomLobby } from "@/components/room/room-lobby";
import { RoomWorkspace } from "@/components/room/room-workspace";
import type { SupportedLanguage } from "@/lib/schemas/room";

type RoomPageState =
  | "loading"
  | "lobby"
  | "in_room"
  | "not_found"
  | "ended"
  | "expired"
  | "full";

function RoomPageContent({
  params,
  role,
}: {
  params: Promise<{ code: string }>;
  role: "candidate" | "interviewer";
}) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const code = resolvedParams.code;

  const [state, setState] = React.useState<RoomPageState>("loading");
  const [roomData, setRoomData] = React.useState<any>(null);
  const [isHost, setIsHost] = React.useState(false);

  // Joined user settings from lobby
  const [userSettings, setUserSettings] = React.useState<{
    participantName: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
    stream: MediaStream | null;
  } | null>(null);

  // Validate room status from backend API
  React.useEffect(() => {
    let isCancelled = false;

    async function checkRoom() {
      try {
        const storedHostToken =
          typeof window !== "undefined"
            ? (() => { try { return localStorage.getItem(`host_token_${code}`); } catch { return null; } })()
            : null;

        const headers: Record<string, string> = {};
        if (role === "interviewer" && storedHostToken) {
          headers["x-host-token"] = storedHostToken;
        }

        const res = await fetch(`/api/rooms/${code}?role=${role}`, {
          cache: "no-store",
          method: "GET",
          headers,
        });

        if (isCancelled) return;

        if (res.status === 404) {
          setState("not_found");
          return;
        }

        if (res.status === 410) {
          setState("expired");
          return;
        }

        if (!res.ok) {
          setState("not_found");
          return;
        }

        const data = await res.json();
        if (data.room) {
          if (data.room.status === "ENDED") {
            setState("ended");
            return;
          }

          setRoomData(data.room);
          setIsHost(Boolean(data.isHost));
          setState("lobby");
        } else {
          setState("not_found");
        }
      } catch (err) {
        if (!isCancelled) {
          setState("not_found");
        }
      }
    }

    checkRoom();

    return () => {
      isCancelled = true;
    };
  }, [code, role]);

  // Handle entering room from Lobby
  const handleLobbyJoin = (settings: {
    participantName: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
    stream: MediaStream | null;
  }) => {
    setUserSettings(settings);
    setState("in_room");
  };

  // State Screens
  if (state === "loading") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="font-mono text-xs text-muted-foreground">
            Connecting to room {code}...
          </span>
        </div>
      </div>
    );
  }

  if (state === "not_found") {
    return (
      <div className="h-screen w-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 text-center ">
          <div className="size-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="text-xl font-bold mb-1.5">Room not found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Room <span className="font-mono font-semibold text-foreground">{code}</span> does not exist or may have expired.
          </p>
          <Button
            onClick={() => router.push("/")}
            className="w-full bg-primary  text-white rounded-xl gap-2"
          >
            <Home className="size-4" />
            <span>Return home</span>
          </Button>
        </div>
      </div>
    );
  }

  if (state === "ended") {
    return (
      <div className="h-screen w-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 text-center ">
          <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Sparkles className="size-6" />
          </div>
          <h2 className="text-xl font-bold mb-1.5">Interview concluded</h2>
          <p className="text-sm text-muted-foreground mb-6">
            This interview session has been ended by the host. Thank you for your time!
          </p>
          <Button
            onClick={() => router.push("/")}
            className="w-full bg-primary  text-white rounded-xl gap-2"
          >
            <Home className="size-4" />
            <span>Back to home</span>
          </Button>
        </div>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="h-screen w-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 text-center ">
          <div className="size-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Clock className="size-6" />
          </div>
          <h2 className="text-xl font-bold mb-1.5">Room expired</h2>
          <p className="text-sm text-muted-foreground mb-6">
            This interview room exceeded its 24-hour lifetime and is no longer accessible.
          </p>
          <Button
            onClick={() => router.push("/")}
            className="w-full bg-primary  text-white rounded-xl gap-2"
          >
            <Home className="size-4" />
            <span>Create a new room</span>
          </Button>
        </div>
      </div>
    );
  }

  if (state === "lobby") {
    return (
      <RoomLobby
        roomCode={code}
        isHost={isHost}
        onJoin={handleLobbyJoin}
      />
    );
  }

  if (state === "in_room" && userSettings) {
    return (
      <RoomWorkspace
        roomCode={code}
        isHost={isHost}
        participantName={userSettings.participantName}
        initialLanguage={(roomData?.language as SupportedLanguage) || "javascript"}
        initialContent={roomData?.content || ""}
        localStream={userSettings.stream}
        initialAudioEnabled={userSettings.audioEnabled}
        initialVideoEnabled={userSettings.videoEnabled}
        onRoomEnded={() => setState("ended")}
      />
    );
  }

  return null;
}

function RoomPageSkeleton() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="font-mono text-xs text-muted-foreground">
          Connecting to room...
        </span>
      </div>
    </div>
  );
}

export default function RoomPage(props: {
  params: Promise<{ code: string }>;
}) {
  return (
    <React.Suspense fallback={<RoomPageSkeleton />}>
      <RoomEntry params={props.params} />
    </React.Suspense>
  );
}

function RoomEntry({ params }: { params: Promise<{ code: string }> }) {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") === "interviewer" ? "interviewer" : "candidate";
  // Remount role-specific state when switching links within the same browser tab.
  return <RoomPageContent key={role} params={params} role={role} />;
}
