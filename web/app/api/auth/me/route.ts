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

    // Call the backend API to get the current user
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/user/details`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { message: errorData.message || "Failed to fetch user data" },
        { status: response.status }
      );
    }

    const data = await response.json();
    if (!data.status || !data.data) {
      return NextResponse.json(
        { message: "Failed to retrieve user data" },
        { status: 500 }
      );
    }

    // Get the user data from the response
    const userData = data.data;

    // Now userData should already have the program and faculty properties
    // We just pass it through directly
    return NextResponse.json({
      id: userData.id,
      email: userData.email,
      username: userData.username,
      program_id: userData.program_id,
      program: userData.program,
      faculty: userData.faculty,
      active: userData.active,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
