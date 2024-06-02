'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

const GATos = ({ token }) => {
    const searchParams = useSearchParams();
    const accountId = searchParams.get('accountId');
    const accountTicketId = searchParams.get('accountTicketId');
    const { isSignedIn } = useUser();

    useEffect(() => {
        if (isSignedIn && accountId && accountTicketId) {
            console.log('ToS signed for accountId:', accountId, 'accountTicketId:', accountTicketId);

            fetch(`/api/dashboard/tos?accountId=${accountId}&accountTicketId=${accountTicketId}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token[0].token}`,
                    'Content-Type': 'application/json',
                    'Accept-Encoding': 'gzip',
                },
            })
                .then(response => response.json())
                .then(data => {
                    console.log('ToS signed response:', data);
                    if (data.message === 'ToS signed successfully') {
                        setTimeout(() => {
                            window.location.href = '/dashboard/ga/accounts';
                        }, 2000);
                    } else {
                        console.error('Error: ', data.error);
                    }
                })
                .catch(error => console.error('Error handling callback:', error));
        }
    }, [isSignedIn, accountId, accountTicketId]);

    return <div>Thank you for signing the Terms of Service. You will be redirected shortly.</div>;
};


export default GATos;
