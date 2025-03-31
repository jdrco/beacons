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

    // The backend already includes user information in the token validation
    // We'll send a request to any authenticated endpoint to verify the token
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/user/list_favorite_rooms`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      // If the backend says the token is invalid, return 401
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    // Since the token is valid, we can extract basic user info from it
    // This is a simplified approach - in production, you might want a dedicated endpoint
    try {
      // Token is in format header.payload.signature
      const base64Payload = token.split(".")[1];
      // base64url decode
      const payload = Buffer.from(base64Payload, "base64").toString("utf8");
      const data = JSON.parse(payload);

      // Basic user info
      const userData = {
        email: data.sub, // sub claim in JWT is typically the user identifier
        username: data.sub.split("@")[0], // Simple fallback
      };

      return NextResponse.json(userData);
    } catch (error) {
      console.error("Error parsing token:", error);
      return NextResponse.json(
        { message: "Error extracting user data from token" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
