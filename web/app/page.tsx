"use client";

import ClassroomDisplay from "@/components/Display";

export default function Home() {
  return (
    <main className="flex w-screen h-screen p-3 md:p-8 gap-2 md:gap-3">
      {/* <div className="bg-green-600 h-full w-1/3"></div> */}
      {/* <div className="bg-red-600 flex flex-col h-full w-2/3 gap-4">
        <div className="bg-pink-400 h-16"></div>
        <div className="bg-slate-400 h-full rounded-3xl relative">
          <MapWithNoSSR className="rounded-lg shadow-lg absolute inset-0" />
        </div>
      </div> */}
      {/* <div className="bg-blue-600 h-full w-1/3"></div> */}
      <ClassroomDisplay />
    </main>
  );
}
