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

    try {
      // Use the token to get user info from the backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { message: "Failed to get user data" },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data.data);
    } catch (error) {
      console.error("Error fetching user data:", error);

      // As a fallback, extract basic info from token
      try {
        const base64Payload = token.split(".")[1];
        const payload = Buffer.from(base64Payload, "base64").toString("utf8");
        const data = JSON.parse(payload);

        return NextResponse.json({
          email: data.sub,
          username: data.sub.split("@")[0],
        });
      } catch (tokenError) {
        return NextResponse.json(
          { message: "Error extracting user data" },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
