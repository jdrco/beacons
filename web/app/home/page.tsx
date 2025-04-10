"use client";

import ClassroomDisplay from "@/components/Display";

export default function Home() {
  /*
    4.4 Classroom Availability: Display

    REQ-1: The system shall automatically update availability status when classes typically transition (00, 20, 30, and 50 minutes past each hour) to reflect real-time classroom availability.

    REQ-2: The system shall display an interactive map view that:

      Shows all campus buildings as clickable markers
      Uses colour coding for map markers based on the percentage of available classrooms in each building:
      Green for buildings with over 50% available classrooms
      Yellow for buildings with 25-50% available classrooms
      Red for buildings with less than 25% available classrooms
      Centers on selected buildings when the corresponding list item is expanded
      Expands a building list item when a marker is selected to a relevant classroom item
      Updates marker colours automatically as availability changes

    REQ-3: The system shall provide an expandable list view that:

      Shows all buildings with collapsible room lists
      Displays room availability status using synced colour coding with the map view
      Shows current occupancy count for each room
      Demographics of educational backgrounds in the room (e.g., "4 CS students, 3 Mechanical Engineers currently studying here")
      Highlights building when a list item is selected on the corresponding map marker
      Updates status in real-time as availability changes

    REQ-4: The system shall maintain synchronization between views:

      Update both views simultaneously when availability changes
      Reflect selected building state in both views
      Share filtering results across both views
      Maintain a consistent colour coding scheme

    REQ-5: The system shall implement filtering capabilities:

      Filter by building name
      Filter by current availability status
      Filter by favourite classrooms
      Apply filters to both views simultaneously

    REQ-6: The system shall automatically clear the occupancy count for the classroom when a lecture/lab/seminar begins.

    REQ-7: The system shall handle and synchronize different client time zones with the Edmonton Mountain Standard Timezone (MT).

    REQ-8: The system shall provide appropriate loading indicators for the map and list.

    REQ-9: The system shall have a favourite toggle button in the list view for each classroom.

    REQ-10: The system shall sort the list by the user’s proximity to available classrooms.
  */
  return (
    <main className="flex w-screen h-screen gap-2 md:gap-3">
      <ClassroomDisplay />
    </main>
  );
}
