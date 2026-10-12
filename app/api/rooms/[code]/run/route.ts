import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { executeCode } from "@/lib/sandbox";
import { roomCodeSchema, runRequestSchema } from "@/lib/schemas/room";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;

    const codeParse = roomCodeSchema.safeParse(code);
    if (!codeParse.success) {
      return NextResponse.json(
        { error: "Invalid room code format", details: codeParse.error.flatten() },
        { status: 400 }
      );
    }

    const room = await db.getRoom(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Room is not active", status: room.status },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const bodyParse = runRequestSchema.safeParse(body);
    if (!bodyParse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: bodyParse.error.flatten() },
        { status: 400 }
      );
    }

    const { language, source, stdin } = bodyParse.data;

    // Execute in sandbox
    const result = await executeCode(code, language, source, stdin || "");

    // Record run in database
    await db.recordRun(room.id, {
      language,
      source,
      stdin,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      timeMs: result.timeMs,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("[API] Error running code in sandbox:", error);
    return NextResponse.json(
      { error: "Execution service failed", message: error?.message },
      { status: 500 }
    );
  }
}
