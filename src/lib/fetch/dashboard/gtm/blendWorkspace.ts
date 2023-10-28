import { getURL } from '@/src/lib/helpers';

export async function getData() {
  const baseUrl = getURL();
  const url = `${baseUrl}/api/dashboard/gtm/blend`;

  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    console.log('response', res);

    throw new Error(
      `Error: ${res.status}: ${res.statusText}: ${await res.text()}`
    );
  }

  const data = await res.json();

  return data;
}
