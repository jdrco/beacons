import { NextRequest, NextResponse } from "next/server";

/*
  4.1 User Registration
  REQ-1: The system shall provide user registration via email and password.
  REQ-2: The system shall verify that the provided email address is valid.
  REQ-3: The system shall enforce password security requirements (minimum length, complexity).
  REQ-4: The system shall store valid user information in the database after successful registration (Email, Password hash, Registration timestamp).
  REQ-5: The system shall generate a random appropriate unique username (display name) for the user after successful registration.
  REQ-6: The system shall display appropriate error messages for invalid email format, password requirements, or existing email.
  REQ-7: The system shall send an email verification link upon successful registration
  REQ-8: The system shall verify and activate the user’s account upon clicking the email verification link
*/
export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.re_password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email domain
    if (!body.email.endsWith("@ualberta.ca")) {
      return NextResponse.json(
        { message: "Only @ualberta.ca email addresses are allowed" },
        { status: 400 }
      );
    }

    // Call backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        re_password: body.re_password,
        program: body.program || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to create account" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Sign up error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
