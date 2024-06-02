'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const GATos = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');
  console.log('code: ', code);

  useEffect(() => {
    if (code) {
      fetch(`/api/dashboard/tos?code=${code}`)
        .then((response) => response.json())
        .then((data) => {
          console.log('ToS signed response:', data);
          // Handle success or error
          if (data.message === 'ToS signed successfully') {
            // Redirect to the desired page after a short delay
            setTimeout(() => {
              router.push('/dashboard/ga/accounts');
            }, 2000); // 2-second delay before redirect
          }
        })
        .catch((error) => console.error('Error handling callback:', error));
    }
  }, [code, router]);

  return <div>Thank you for signing the Terms of Service. You will be redirected shortly.</div>;
};

export default GATos;
