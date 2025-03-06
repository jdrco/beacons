import React from "react";
import { MacbookScroll } from "@/components/ui/macbook-scroll";
import Link from "next/link";

export default function Landing() {
  return (
    <div className="overflow-hidden dark:bg-[#191f23] bg-white w-full min-h-screen flex flex-col items-center justify-center">
      <MacbookScroll
        title={
          <span>
            Find available classrooms on campus. <br /> Beacons foreal.
          </span>
        }
        badge={
          <Link href="/">
            <img
              src="/beacons_logo.svg"
              alt="Beacons Logo"
              className="block next-image-unconstrained md:h-6 h-8 md:mb-0 mb-3"
            />
          </Link>
        }
        src={`/beacons_demo.png`}
        showGradient={false}
      />
      <div className="mb-12">
        <Link href="/home">
          <button className="bg-[#4AA69D] hover:bg-[#4e9a92] text-white font-medium py-2 px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105">
            Try Now
          </button>
        </Link>
      </div>
    </div>
  );
}
