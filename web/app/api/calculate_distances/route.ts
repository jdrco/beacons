import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get the token from the cookie if it exists
    const token = request.cookies.get("access_token")?.value;

    // Get the request body
    const requestData = await request.json();

    // Call the backend API to calculate distances
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/calculate_distances`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || "Failed to calculate distances" },
        { status: response.status }
      );
    }

    // Get the response data
    const data = await response.json();

    // Return the distances data
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error calculating distances:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
