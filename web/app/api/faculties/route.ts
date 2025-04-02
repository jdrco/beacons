import { NextRequest, NextResponse } from "next/server";

interface Program {
  id: string;
  name: string;
  is_undergrad: boolean;
  faculty: string;
}

interface Faculty {
  name: string;
}

export async function GET(request: NextRequest) {
  try {
    // Call backend API to get ALL programs without pagination
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/list_programs?per_page=1000`,
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
        { message: data.message || "Failed to fetch faculties" },
        { status: response.status }
      );
    }

    // Extract unique faculties from programs
    if (data.status && data.data && Array.isArray(data.data)) {
      // First collect all faculty names that are strings
      const allFacultyNames: string[] = [];
      data.data.forEach((program: any) => {
        if (typeof program.faculty === "string" && program.faculty) {
          allFacultyNames.push(program.faculty);
        }
      });

      // Then get unique values and create Faculty objects
      const uniqueFacultyNames = [...new Set(allFacultyNames)];
      const facultiesData: Faculty[] = uniqueFacultyNames.map((name) => ({
        name,
      }));

      return NextResponse.json({
        status: true,
        message: "Faculties retrieved successfully",
        data: facultiesData,
      });
    }

    return NextResponse.json({
      status: false,
      message: "No faculties found",
      data: [],
    });
  } catch (error) {
    console.error("Error fetching faculties:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
