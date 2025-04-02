import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get the URL parameters
    const { searchParams } = new URL(request.url);
    const faculty = searchParams.get("faculty");
    const keyword = searchParams.get("keyword");
    const isUndergrad = searchParams.get("is_undergrad");

    // Set per_page to 1000 to effectively get all programs
    const perPage = "1000";

    // Build query string
    let queryString = `?per_page=${perPage}`;
    if (faculty) queryString += `&faculty=${encodeURIComponent(faculty)}`;
    if (keyword) queryString += `&keyword=${encodeURIComponent(keyword)}`;
    if (isUndergrad !== null) queryString += `&is_undergrad=${isUndergrad}`;

    // Call backend API to get programs
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/list_programs${queryString}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to fetch programs" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching programs:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
