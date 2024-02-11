import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import { Skeleton } from '@/src/components/ui/skeleton';
import { columns } from './columns';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGAPropertyStreams } from '@/src/lib/fetch/dashboard/actions/ga/streams';
import { DataTable } from './table';

export default async function PropertyPage({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
}) {
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const { userId } = auth();
  if (!userId) return notFound();

  const propertyData = await listGAProperties();
  const streamData = await listGAPropertyStreams();

  const [properties, streams] = await Promise.all([ propertyData, streamData]);

  const flatProperties = properties.flat();  
  const dataStreamsArray = streams.filter(stream => stream.dataStreams).flatMap(stream => stream.dataStreams).flat();

  const combinedData = dataStreamsArray.map((stream) => {
    const property = flatProperties.find((p) => p.name);
    console.log("property", property);
    
    return {
      ...stream,
      name: stream.name,
      parent: property.name ? property.name : 'Unknown',
      createTime: stream.createTime,
      updateTime: stream.updateTime,
      displayName: stream.displayName,
      property: property ? property.displayName : 'Unknown Property',
    };
  });  

  return (
    <>
      <Suspense
        key={query + currentPage}
        fallback={
          <div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-gray-700">
              {/* Skeleton for Table Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <Skeleton className="h-6 mb-4 w-1/4" />
              </div>
              {/* Skeleton for Table Rows */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="px-6 py-4 grid grid-cols-3 gap-4">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      >

        <div className="container mx-auto py-10">
          <DataTable
            columns={columns}
            data={combinedData}
            parentData={properties}
          />
        </div>
      </Suspense>
    </>
  );
}
