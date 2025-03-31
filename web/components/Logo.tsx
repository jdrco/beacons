import Image from "next/image";

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "" }: LogoProps) {
  return (
    <div className={`relative flex gap-x-3 items-center ${className}`}>
      <Image
        src="/beacons-symbol.svg"
        alt="Beacons Logo"
        className="block next-image-unconstrained h-7"
        width={28}
        height={28}
      />
      <Image
        src="/beacons-text.svg"
        alt="Beacons Logo"
        className="block next-image-unconstrained h-5"
        width={100}
        height={28}
      />
    </div>
  );
}
