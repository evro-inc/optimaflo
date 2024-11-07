import { defineConfig } from "cypress";
import { clerkSetup } from '@clerk/testing/cypress'

require('dotenv').config()


export default defineConfig({
  env: {
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  e2e: {
    setupNodeEvents(on, config) {
      return clerkSetup({ config })
    },
    baseUrl: 'https://optimaflo.ngrok.io', // your app's URL
  },
});
