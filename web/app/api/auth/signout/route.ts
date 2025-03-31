import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get the token from the cookie
    const token = request.cookies.get("access_token")?.value;

    if (token) {
      // Call the backend API to invalidate the token
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch((err) => {
        // If the endpoint doesn't exist, we'll still clear the cookie
        console.warn("Failed to call signout endpoint:", err);
      });
    }

    // Create a response that clears the cookie
    const response = NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );

    // Clear the cookie
    response.cookies.delete("access_token");

    return response;
  } catch (error) {
    console.error("Signout error:", error);

    // Even if there's an error, try to clear the cookie
    const response = NextResponse.json(
      { message: "Error during logout" },
      { status: 500 }
    );
    response.cookies.delete("access_token");

    return response;
  }
}
