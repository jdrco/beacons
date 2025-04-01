import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BorderBeam } from "@/components/ui/border-beam";
import { Ripple } from "@/components/ui/ripple";
import { Safari } from "@/components/ui/safari";
import Iphone15Pro from "@/components/ui/iphone-15-pro";
import Logo from "@/components/Logo";
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";

export default function Landing() {

    const testimonials = [
    {
      quote:
        "The attention to detail and innovative features have completely transformed our workflow. This is exactly what we've been looking for.",
      name: "Sarah Chen",
      designation: "Product Manager at TechFlow",
      src: "",
    },
    {
      quote:
        "Implementation was seamless and the results exceeded our expectations. The platform's flexibility is remarkable.",
      name: "Michael Rodriguez",
      designation: "CTO at InnovateSphere",
      src: "",
    },
    {
      quote:
        "This solution has significantly improved our team's productivity. The intuitive interface makes complex tasks simple.",
      name: "Emily Watson",
      designation: "Operations Director at CloudScale",
      src: "",
    },
    {
      quote:
        "Outstanding support and robust features. It's rare to find a product that delivers on all its promises.",
      name: "James Kim",
      designation: "Engineering Lead at DataPro",
      src: "",
    },
    {
      quote:
        "The scalability and performance have been game-changing for our organization. Highly recommend to any growing business.",
      name: "Lisa Thompson",
      designation: "VP of Technology at FutureNet",
      src: "",
    },
  ];

  return (
    <div className="min-h-screen bg-[#191f23] text-white flex flex-col relative overflow-hidden">
      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-16 max-w-6xl mx-auto">
        <div className="mb-8">
          <Logo />
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 max-w-5xl">
          A new way to find available spaces on campus.
        </h1>

        <p className="text-lg sm:text-xl text-gray-400 mb-12 max-w-3xl">
          <span className="text-[#4AA69D] font-bold">beacons</span> shows what
          classrooms are currently available allowing you to{" "}
          <br className="hidden sm:block" />
          check weekly schedules to plan your next study / yap / nap session!
        </p>

        <Link href="/home">
          <Button
            className="relative overflow-hidden bg-[#4AA69D]  text-white"
            size="lg"
            variant="outline"
          >
            Get Started <ArrowRight className="w-4 h-4 ml-2" />
            <BorderBeam
              size={60}
              initialOffset={20}
              className="from-transparent via-red-500 to-transparent"
              transition={{
                type: "spring",
                stiffness: 60,
                damping: 20,
              }}
            />
          </Button>
        </Link>

        {/* Client Preview */}
        <div className="my-8 flex gap-x-4">
          <Iphone15Pro src="/beacons_demo_ios.png" className="size-1/6" />
          <Safari
            imageSrc="/beacons_demo.png"
            url="beacons.jareddrueco.com"
            className="size-5/6"
          />
        </div>
      </main>
      <Ripple className="mb-24" />
      <h1>Live and ready to use!</h1>
      <AnimatedTestimonials testimonials={testimonials} autoplay={true} />
    </div>
  );
}
