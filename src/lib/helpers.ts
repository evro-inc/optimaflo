import logger from './logger';
import { NextApiRequest } from 'next';

export const getURL = (req?: NextApiRequest | null) => {
  let url;

  try {
    const env = process.env.NODE_ENV as string; // Cast to string to allow custom environments like 'sandbox'

    switch (env) {
      case 'production':
        url = process.env.PROD_API_URL;
        break;
      case 'sandbox':
        url = process.env.SANDBOX_API_URL;
        break;
      default:
        url = process.env.LOCAL_API_URL || 'http://localhost:3000';
    }

    if (req && req.headers && env === 'production') {
      const proto = req.headers['x-forwarded-proto'] || 'http';
      url = `${proto}://${req.headers.host}`;
    }

    url = url.includes('http') ? url : `https://${url}`;
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;

    return url;
  } catch (error) {
    logger.error('Error determining URL:', error);
    throw new Error('Could not determine URL');
  }
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
