import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    // Get the token from the cookie
    const token = request.cookies.get("access_token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get the user_id from the query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Call backend API to delete the user
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/user/delete?user_id=${userId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to delete account" },
        { status: response.status }
      );
    }

    // Create a response that clears the cookie
    const finalResponse = NextResponse.json(data);
    finalResponse.cookies.delete("access_token");

    return finalResponse;
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
