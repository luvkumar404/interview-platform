export default function RoomLoading() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <span className="font-mono text-xs text-muted-foreground">
          Connecting to room...
        </span>
      </div>
    </div>
  );
}
