'use client'

import { useState, useEffect } from "react"
import { Item } from "./types"
import { getItems, deleteItem } from "./api"
import { ItemCard } from "@/components/ItemCard"
import { CreateItemForm } from "@/components/CreateItemForm"
import { useToast } from "@/hooks/use-toast"

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
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  async function fetchItems() {
    try {
      const data = await getItems()
      setItems(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  async function handleDelete(id: number) {
    try {
      await deleteItem(id)
      toast({
        title: "Success",
        description: "Item deleted successfully",
      })
      fetchItems()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  return (
    <main className="container mx-auto p-4">
      <MapWithNoSSR
        initialCenter={[-73.935242, 40.730610]} // New York City
        initialZoom={12}
        className="rounded-lg shadow-lg"
      />
      <div className="max-w-xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Item Manager</h1>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Create New Item</h2>
          <CreateItemForm onSuccess={fetchItems} />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Items</h2>
          {loading ? (
            <p>Loading items...</p>
          ) : items.length === 0 ? (
            <p className="text-gray-600">No items yet. Create one above!</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
