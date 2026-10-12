import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roomCodeSchema } from "@/lib/schemas/room";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;

    const parseResult = roomCodeSchema.safeParse(code);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid room code format", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const room = await db.getRoom(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    let hostToken: string | undefined;
    try {
      const body = await req.json();
      hostToken = body.hostToken;
    } catch {
      // Body may be empty, fallback to header or cookie
    }

    if (!hostToken) {
      hostToken = req.headers.get("x-host-token") || req.cookies.get(`host_token_${code}`)?.value;
    }

    if (!hostToken || hostToken !== room.hostToken) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid host token" },
        { status: 403 }
      );
    }

    await db.endRoom(code);

    return NextResponse.json({
      success: true,
      message: "Room ended successfully",
    });
  } catch (error: any) {
    console.error("[API] Error ending room:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error?.message },
      { status: 500 }
    );
  }
}
