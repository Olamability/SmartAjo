const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const apiFetch = async (
  path: string,
  options: RequestInit = {}
) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // important for cookies later
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};
