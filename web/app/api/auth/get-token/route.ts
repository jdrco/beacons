import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get the token from the cookie
    const token = request.cookies.get("access_token")?.value;
    
    // Return the token in the response
    return NextResponse.json({ token: token || null });
  } catch (error) {
    console.error("Error getting token:", error);
    return NextResponse.json(
      { error: "Failed to retrieve token" },
      { status: 500 }
    );
  }
}