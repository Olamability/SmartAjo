const API_URL = import.meta.env.VITE_API_URL;

export async function postRequest(endpoint, body) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Request failed');
  }

  return res.json();
}
