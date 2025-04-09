import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body to get the email
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL
      }/resend-verification-email?email=${encodeURIComponent(email)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Get the response data
    const data = await response.json();

    // If the response is not OK, return an error
    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to resend verification email" },
        { status: response.status }
      );
    }

    // Return the successful response
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error resending verification email:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
