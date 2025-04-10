"use client";

import Iphone15Pro from "@/components/ui/iphone-15-pro";
import { Safari } from "@/components/ui/safari";

export default function MarketPage() {
  return (
    <div className="w-screen h-screen bg-white flex items-center justify-center p-4">
      <div className="my-8 flex gap-x-4">
        <Iphone15Pro src="/beacons_demo_ios.png" className="size-1/6" />
        <Safari
          imageSrc="/beacons_demo.png"
          url="beacons.jareddrueco.com"
          className="size-5/6"
        />
      </div>
    </div>
  );
}
