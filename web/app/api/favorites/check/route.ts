import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { roomName } = await request.json();

    if (!roomName) {
      return NextResponse.json(
        { message: "Room name is required" },
        { status: 400 }
      );
    }

    // Get the token from the cookie
    const token = request.cookies.get("access_token")?.value;

    if (!token) {
      return NextResponse.json({ isFavorite: false }, { status: 200 });
    }

    // Call the backend API to get all favorites
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/user/list_favorite_rooms`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ isFavorite: false }, { status: 200 });
    }

    const data = await response.json();

    // Check if the roomName is in the favorites list (data.data is an array of room names)
    const isFavorite = data.data?.includes(roomName) || false;

    return NextResponse.json({ isFavorite });
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return NextResponse.json({ isFavorite: false }, { status: 200 });
  }
}
