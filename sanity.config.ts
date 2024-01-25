import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import schemas from './sanity/schemas';

export const config = defineConfig([
  {
    name: 'default',
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID as string,
    dataset: 'production',
    title: 'OptimaFlo CMS Production',
    apiVersion: '2024-01-25',
    basePath: '/admin',
    plugins: [structureTool()],
    schema: {
      types: schemas,
    },
  },
  {
    name: 'sandbox',
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID as string,
    dataset: 'sandbox',
    title: 'OptimaFlo CMS Sandbox',
    apiVersion: '2024-01-25',
    basePath: '/admin-sandbox',
    plugins: [structureTool()],
    schema: {
      types: schemas,
    },
  },
]);
