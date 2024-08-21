'use client';

import { Button } from "@/src/components/ui/button";
import { revalidate } from "@/src/utils/server";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

export default function ErrorComponent(feature, path) {
    const { user } = useUser();
    const userId = user?.id as string;
    const refreshCache = async () => {
        toast.info('Updating our systems. This may take a minute or two to update on screen.', {
            action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
            },
        });
        const keys = [`ga:${feature}:userId:${userId}`];
        await revalidate(keys, `${path}`, userId);
    };

    return (
        <div className="flex flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-md text-center">
                <BugIcon className="mx-auto h-12 w-12 text-primary" />
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    Oops, something went wrong with this feature!
                </h1>
                <p className="mt-4 text-muted-foreground">
                    Sorry, but an unexpected error has occurred while processing your data. Please try again later or
                    contact our support team if the issue persists.
                </p>
                <div className="mt-6">
                    <Button type="button" onClick={refreshCache}>
                        Refresh
                    </Button>
                </div>
            </div>
        </div>
    )
}

function BugIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m8 2 1.88 1.88" />
            <path d="M14.12 3.88 16 2" />
            <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
            <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
            <path d="M12 20v-9" />
            <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
            <path d="M6 13H2" />
            <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
            <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
            <path d="M22 13h-4" />
            <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
        </svg>
    )
}