'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createItem } from "@/app/api"
import { useToast } from "@/hooks/use-toast"

export function CreateItemForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    try {
      await createItem({
        name: formData.get('name') as string,
        description: formData.get('description') as string,
      })
      toast({
        title: "Success",
        description: "Item created successfully",
      })
      onSuccess()
      e.currentTarget.reset()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create item",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          name="name"
          placeholder="Item name"
          required
          disabled={loading}
        />
        <Textarea
          name="description"
          placeholder="Description"
          required
          disabled={loading}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Item"}
      </Button>
    </form>
  )
}
