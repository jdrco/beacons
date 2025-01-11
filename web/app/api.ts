const API_URL = 'http://localhost:8000';

export async function getItems() {
  const res = await fetch(`${API_URL}/items/`);
  if (!res.ok) throw new Error('Failed to fetch items');
  return res.json();
}

export async function createItem(data: { name: string; description: string }) {
  const res = await fetch(`${API_URL}/items/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create item');
  return res.json();
}

export async function deleteItem(id: number) {
  const res = await fetch(`${API_URL}/items/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete item');
  return res.json();
}
