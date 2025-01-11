import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Item } from "@/app/types"

export function ItemCard({ item, onDelete }: {
  item: Item;
  onDelete: (id: number) => void
}) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">{item.name}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">{item.description}</p>
      </CardContent>
      <CardFooter>
        <Button
          variant="destructive"
          onClick={() => onDelete(item.id)}
          size="sm"
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  )
}
