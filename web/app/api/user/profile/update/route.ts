import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    // Get the token from the cookie
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();

    // Validate required fields
    if (!body.username) {
      return NextResponse.json(
        { message: "Username is required" },
        { status: 400 }
      );
    }

    const updateData = {
      username: body.username,
      program: body.program, // Pass the program name as-is
    };

    // Call backend API to update the user
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/user/update`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to update profile" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
