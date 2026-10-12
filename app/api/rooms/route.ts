import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateRoomCode, generateHostToken } from "@/lib/nanoid";
import { createRoomSchema } from "@/lib/schemas/room";

export async function POST(req: NextRequest) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body can be empty for default room creation
    }

    const parseResult = createRoomSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const language = parseResult.data.language || "javascript";
    const code = generateRoomCode();
    const hostToken = generateHostToken();

    // 24 hour default room expiry
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const room = await db.createRoom(code, hostToken, language, expiresAt);

    const response = NextResponse.json({
      success: true,
      room: {
        code: room.code,
        language: room.language,
        status: room.status,
        expiresAt: room.expiresAt,
      },
      hostToken,
    });

    // Set cookie for host identity persistence
    response.cookies.set(`host_token_${code}`, hostToken, {
      path: "/",
      maxAge: 86400,
      httpOnly: false, // Accessible to client-side host validation
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("[API] Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room", message: error?.message },
      { status: 500 }
    );
  }
}
