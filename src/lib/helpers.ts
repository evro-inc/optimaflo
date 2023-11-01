import logger from './logger';
import { NextApiRequest } from 'next';

export const getURL = (req?: NextApiRequest | null) => {
  let url;

  // Check for custom environment and set URL accordingly
  const customEnv = process.env.NODE_ENV as 'development' | 'production' | 'test' | 'sandbox';
  if (customEnv === 'sandbox') {
    url = process.env.SANDBOX_API_URL;
  } else {
    // Fallback to NODE_ENV
    if (customEnv === 'production') {
      url = process.env.PROD_API_URL;
    } else {
      url = process.env.NEXT_PUBLIC_API_URL;
    }
  }

  // Override with request headers if available
  if (req && req.headers) {
    const proto = req.headers['x-forwarded-proto'] || 'http';
    url = `${proto}://${req.headers.host}`;
  }

if (!url) {
  throw new Error(`Could not determine URL. NODE_ENV is ${process.env.NODE_ENV}`);
}

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
