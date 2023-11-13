import logger from './logger';

export const getURL = () => {
  let url;

  // Directly use environment variables set in Vercel
  if (process.env.VERCEL_ENV === 'production') {
    url = process.env.PROD_API_URL;
  } else if (process.env.VERCEL_ENV === 'preview') {
    // Assuming 'preview' is used for sandbox
    url = process.env.SANDBOX_API_URL;
  } else {
    // Fallback for local development
    url = process.env.NEXT_PUBLIC_API_URL;
  }

  if (!url) {
    throw new Error(
      `Could not determine URL. VERCEL_ENV is ${process.env.VERCEL_ENV}`
    );
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
