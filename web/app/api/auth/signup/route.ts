import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Make request to backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // Parse response data
    const data = await response.json();

    if (!response.ok) {
      // Return the exact error message from the backend
      return NextResponse.json(
        {
          message:
            typeof data.message === "string"
              ? data.message
              : data.message?.error || "Registration failed",
        },
        { status: response.status }
      );
    }

    // Return success response
    return NextResponse.json({
      message: "Account created successfully",
      data: data.data,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { message: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
