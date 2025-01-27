'use client'

import dynamic from 'next/dynamic'

const MapWithNoSSR = dynamic(
  () => import('@/components/Map'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 flex items-center justify-center bg-gray-100">
        Loading map...
      </div>
    )
  }
)

export default function Home() {

  return (
    <main className="container mx-auto p-4">
      <MapWithNoSSR
        initialCenter={[-73.935242, 40.730610]} // New York City
        initialZoom={12}
        className="rounded-lg shadow-lg"
      />
    </main>
  )
}
