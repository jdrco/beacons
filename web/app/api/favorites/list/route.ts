import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get the token from the cookie
    const token = request.cookies.get("access_token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Call the backend API to fetch favorite rooms
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/user/list_favorite_rooms`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Try to parse the response as JSON
    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error("Failed to parse response as JSON:", error);
      return NextResponse.json(
        { message: "Failed to parse response" },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error("Error response from backend:", data);
      return NextResponse.json(
        { message: data.message || "Failed to fetch favorites" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
