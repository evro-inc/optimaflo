import logger from './logger';
import { NextApiRequest } from 'next';

export const getURL = (req?: NextApiRequest | null) => {
  let url;

  // If req is available, it means we're on the server
  if (req && req.headers) {
    const proto = req.headers['x-forwarded-proto'] || 'http';
    url = `${proto}://${req.headers.host}/`;
  } else {
    // If we're on the client, use NEXT_PUBLIC_API_URL or fallback to localhost
    url = 'http://localhost:3000/';
  }

  // Make sure to include `https://` when not localhost
  url = url.includes('http') ? url : `https://${url}`;

  // Make sure to include trailing `/`
  url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;

  return url;
};


export const postData = async ({ url, data }: { url: string; data?: any }) => {
  const res: Response = await fetch(url, {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    credentials: 'same-origin',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    logger.error('Error in postData', { url, data, res });

    throw Error(res.statusText);
  }

  return res.json();
};

export const toDateTime = (secs: number) => {
  var t = new Date('1970-01-01T00:30:00Z'); // Unix epoch start.
  t.setSeconds(secs);
  return t;
};
