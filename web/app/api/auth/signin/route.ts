import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Make request to backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signin`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Authentication failed" },
        { status: response.status }
      );
    }

    // Create response with success message
    const resp = NextResponse.json(
      { message: "Authentication successful" },
      { status: 200 }
    );

    // Set the cookie with the same parameters as the backend
    resp.cookies.set("access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 3, // 3 hours (matching backend's 180 minutes default)
      path: "/",
    });

    return resp;
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
