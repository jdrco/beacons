import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Call the backend API to request a password reset
    // The backend expects email as a query parameter, not in the body
    const apiUrl = `${
      process.env.NEXT_PUBLIC_API_URL
    }/request-password-reset?email=${encodeURIComponent(email)}`;

    console.log(`Making request to: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // No body needed as email is passed as a query parameter
    });

    // Log response status for debugging
    console.log(`Response status: ${response.status}`);

    const data = await response.json();
    console.log(`Response data:`, data);

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to request password reset" },
        { status: response.status }
      );
    }

    return NextResponse.json(
      { message: "Password reset email sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
