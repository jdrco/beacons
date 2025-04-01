// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token, password, re_password } = await request.json();

    if (!token || !password || !re_password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Password validation checks
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { message: "Password must contain at least one uppercase letter" },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { message: "Password must contain at least one number" },
        { status: 400 }
      );
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return NextResponse.json(
        { message: "Password must contain at least one special character" },
        { status: 400 }
      );
    }

    if (password !== re_password) {
      return NextResponse.json(
        { message: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Call the backend API to reset the password
    // The token is passed as a query parameter, and the password data in the body
    const apiUrl = `${
      process.env.NEXT_PUBLIC_API_URL
    }/reset-password?token=${encodeURIComponent(token)}`;

    console.log(`Making request to: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: password,
        re_password: re_password,
      }),
    });

    // Log response status for debugging
    console.log(`Response status: ${response.status}`);

    const data = await response.json();
    console.log(`Response data:`, data);

    if (!response.ok) {
      // Check for specific error cases
      if (response.status === 400 && data.message?.includes("token")) {
        return NextResponse.json(
          {
            message:
              "Invalid or expired token. Please request a new password reset link.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { message: data.message || "Failed to reset password" },
        { status: response.status }
      );
    }

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
