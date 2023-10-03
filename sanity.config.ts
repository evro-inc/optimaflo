import { defineConfig } from 'sanity';
import { deskTool } from 'sanity/desk';
import schemas from './sanity/schemas';

export const config = defineConfig([
  {
    name: 'default',
    projectId: process.env.SANITY_PROJECT_ID as string,
    dataset: 'production',
    title: 'OptimaFlo CMS Production',
    apiVersion: '2023-10-02',
    basePath: '/admin',
    plugins: [deskTool()],
    schema: {
      types: schemas,
    },
  },
  {
    name: 'sandbox',
    projectId: process.env.SANITY_PROJECT_ID as string,
    dataset: 'sandbox',
    title: 'OptimaFlo CMS Sandbox',
    apiVersion: '2023-10-02',
    basePath: '/admin-sandbox',
    plugins: [deskTool()],
    schema: {
      types: schemas,
    },
  },
]);
