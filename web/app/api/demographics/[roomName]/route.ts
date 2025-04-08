import { NextRequest, NextResponse } from "next/server";

interface DemographicsResponseData {
  status: boolean;
  message: string;
  data?: Record<string, number>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { roomName: string } }
): Promise<NextResponse> {
  try {
    // Get the room name from the URL
    const roomName = params.roomName;

    if (!roomName) {
      return NextResponse.json(
        { message: "Room name is required" },
        { status: 400 }
      );
    }

    // Get the token from the cookie
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Call the backend API to get the room demographics
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/rooms/${encodeURIComponent(
        roomName
      )}/demographics`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { message: errorData.message || "Failed to fetch demographics data" },
        { status: response.status }
      );
    }

    const data: DemographicsResponseData = await response.json();

    if (!data.status) {
      return NextResponse.json(
        { message: "Failed to retrieve demographics data" },
        { status: 500 }
      );
    }

    // Return the demographics data from the response
    return NextResponse.json({
      status: true,
      message: "Demographics data retrieved successfully",
      data: data.data || {},
    });
  } catch (error) {
    console.error("Error fetching demographics data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
