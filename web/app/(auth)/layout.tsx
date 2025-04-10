import Logo from "@/components/Logo";
import Image from "next/image";
import Link from "next/link";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-3/4">{children}</div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block overflow-hidden">
        {/* Logo Positioned on Top Middle */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        {/* Fixed size container for the image to prevent layout shifts */}
        <div className="absolute inset-0">
          <div className="relative w-full h-full">
            <Image
              src="/map_preview.png"
              alt="Map Preview"
              fill
              sizes="50vw"
              priority
              className="object-cover filter blur-lg"
              style={{ transform: "none" }}
            />
          </div>
        </div>
        {/* Info text aligned bottom right as a vertical list */}
        <div className="absolute bottom-10 right-10 z-10 text-right text-white space-y-1">
          <h1 className="font-bold text-xl">Sign up for more features</h1>
          <br />
          <p>Save and manage your favourite classrooms</p>
          <p>View occupancy counts of available classrooms</p>
          <p>Get notified when your favourite rooms are available</p>
        </div>
      </div>
    </div>
  );
}
