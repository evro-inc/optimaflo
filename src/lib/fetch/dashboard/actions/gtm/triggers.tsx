'use server';
import { revalidatePath } from 'next/cache';
import { FormsSchema } from '@/src/lib/schemas/gtm/triggers';
import z from 'zod';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { limiter } from '../../../../bottleneck';
import { gtmRateLimit } from '../../../../redis/rateLimits';
import { redis } from '../../../../redis/cache';
import { currentUserOauthAccessToken } from '../../../../clerk';
import prisma from '@/src/lib/prisma';
import { Variable, FeatureResponse, FeatureResult } from '@/src/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { fetchGtmSettings } from '../..';

// Define the types for the form data
type schema = z.infer<typeof FormsSchema>;

/************************************************************************************
  Function to list or get one GTM triggers
************************************************************************************/
export async function listTriggers(skipCache = false) {
  let retries = 0;
  const MAX_RETRIES = 20;
  let delay = 2000;

  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;

  const cacheKey = `gtm:triggers:userId:${userId}`;
  if (skipCache == false) {
    const cachedValue = await redis.get(cacheKey);
    if (cachedValue) {
      return JSON.parse(cachedValue);
    }
  }
  await fetchGtmSettings(userId);

  const gtmData = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    include: {
      gtm: true,
    },
  });

  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

      if (remaining > 0) {
        let allData: any[] = [];

        await limiter.schedule(async () => {
          const uniquePairs = new Set(
            gtmData.gtm.map((data) => ({
              accountId: data.accountId,
              containerId: data.containerId,
              workspaceId: data.workspaceId,
            }))
          );

          const urls = Array.from(uniquePairs).map((props: any) => {
            const { accountId, containerId, workspaceId } = props;
            return `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`;
          });

          const headers = {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
          };

          for (const url of urls) {
            try {
              const response = await fetch(url, { headers });

              console.log('response trigger', response);

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}. ${response.statusText}`);
              }
              const responseBody = await response.json();

              console.log('responseBody', responseBody);

              allData.push(responseBody.trigger || []);
            } catch (error: any) {
              throw new Error(`Error fetching data: ${error.message}`);
            }
          }
        });

        redis.set(cacheKey, JSON.stringify(allData.flat()));

        console.log('allData', allData);

        return allData;
      }
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2;
        retries++;
      } else {
        throw error;
      }
    }
  }
  throw new Error('Maximum retries reached without a successful response.');
}
