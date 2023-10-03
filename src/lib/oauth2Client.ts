import { google } from 'googleapis';

export function createOAuth2Client(accessToken: string) {
  try {
    // Initialize the OAuth2 client
    const oauth2Client = new google.auth.OAuth2();

    // Set the user's access token
    oauth2Client.setCredentials({ access_token: accessToken });

    return oauth2Client;
  } catch (error) {
    // <-- Define `error` here
    console.error('Error creating OAuth2 client:', error);
    return null;
  }
}
