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

    // Call the backend user details endpoint to verify the token and get user data
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/user/details`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Parse the user data from the response
    const data = await response.json();

    if (!data.status || !data.data) {
      return NextResponse.json(
        { message: "Failed to retrieve user data" },
        { status: 500 }
      );
    }

    // Return the user data
    return NextResponse.json(data.data);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
