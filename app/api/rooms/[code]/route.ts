import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roomCodeSchema } from "@/lib/schemas/room";

export async function GET(
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

    // Check expiration
    if (new Date() > new Date(room.expiresAt)) {
      return NextResponse.json(
        { error: "Room has expired", status: "EXPIRED" },
        { status: 410 }
      );
    }

    // Check if host
    const cookieToken = req.cookies.get(`host_token_${code}`)?.value;
    const headerToken = req.headers.get("x-host-token");
    const isHost = Boolean(
      (cookieToken && cookieToken === room.hostToken) ||
      (headerToken && headerToken === room.hostToken)
    );

    return NextResponse.json({
      success: true,
      room: {
        code: room.code,
        language: room.language,
        content: room.content,
        status: room.status,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
      },
      isHost,
    });
  } catch (error: any) {
    console.error("[API] Error fetching room:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error?.message },
      { status: 500 }
    );
  }
}
