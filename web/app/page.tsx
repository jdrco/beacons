"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ClassroomDisplay from "@/components/Display";

const MapWithNoSSR = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full flex items-center justify-center bg-gray-100">
      Loading map...
    </div>
  ),
});

export default function Home() {
  return (
    <main className="flex w-screen h-screen p-2 md:p-8 gap-2 md:gap-4">
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
