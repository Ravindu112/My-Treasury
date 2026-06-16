# Google OAuth Setup Guide for My Treasury

## Overview
This guide walks you through setting up Google OAuth authentication in Supabase for your My Treasury application.

## Prerequisites
- Supabase account (https://supabase.com)
- Google Cloud Console account (https://console.cloud.google.com)
- Your Supabase project created

## Step 1: Create OAuth Credentials in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project:
   - Click "Select a Project" at the top
   - Click "NEW PROJECT"
   - Enter "My Treasury" as project name
   - Click "CREATE"

3. Enable Google+ API:
   - In the search bar, search for "Google+ API"
   - Click on it and select "ENABLE"

4. Create OAuth 2.0 Credentials:
   - Go to "Credentials" in the left sidebar
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Fill in the details:
     - Name: "My Treasury"
     - Authorized JavaScript origins: 
       - `https://wdqgkswyngjtbbafsyop.supabase.co` (your Supabase URL)
       - `http://localhost:5173` (for local development)
     - Authorized redirect URIs:
       - `https://wdqgkswyngjtbbafsyop.supabase.co/auth/v1/callback` (Supabase callback)
       - `http://localhost:5173/dashboard` (local redirect)

5. Copy your OAuth credentials:
   - Copy the "Client ID" and "Client Secret"
   - Keep these safe - you'll need them in the next step

## Step 2: Configure Google OAuth in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find "Google" in the list and click it
4. Toggle "Enabled" to ON
5. Paste your credentials:
   - **Client ID**: Paste from Google Cloud Console
   - **Client Secret**: Paste from Google Cloud Console
6. Click "Save"

## Step 3: Configure Redirect URL (Important!)

1. In Supabase Authentication settings:
   - Go to **Authentication** → **URL Configuration**
   - Under "Redirect URLs", add your site URL:
     - Production: Your deployed domain (e.g., `https://mytreasury.com/dashboard`)
     - Development: `http://localhost:5173/dashboard`

2. Save the configuration

## Step 4: Test Google Sign-In Locally

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to http://localhost:5173/login or /register
3. Click "Sign in with Google" or "Sign up with Google"
4. You should be redirected to Google's login page
5. After signing in, you'll be redirected back to your dashboard

## Step 5: Deploy to Production

1. Update your environment variables in production:
   - Make sure `VITE_SUPABASE_URL` is set to your production Supabase URL
   - The `VITE_SUPABASE_ANON_KEY` should be your production anon key

2. Add your production domain to:
   - Google Cloud Console OAuth credentials (Authorized JavaScript origins & redirect URIs)
   - Supabase URL Configuration (Redirect URLs)

3. Deploy your application

## Troubleshooting

### "Invalid Client ID" Error
- Verify you copied the Client ID correctly from Google Cloud Console
- Check that the Client ID is enabled in Supabase

### Redirect URI Mismatch
- Ensure the redirect URIs match exactly in both Google Cloud Console and Supabase
- Check for trailing slashes and protocol (http vs https)

### User Profile Not Auto-Creating
- The Supabase trigger `handle_new_user()` should automatically create a profile
- If it's not working, check the database logs in Supabase

### CORS Issues
- Make sure your domain is added to "Authorized JavaScript origins" in Google Cloud Console
- Check Supabase Authentication settings for proper URL configuration

## Code Changes Made

### AuthContext.jsx
- Added `loginWithGoogle()` function that initiates OAuth flow
- Exports `loginWithGoogle` in the context provider

### Login.jsx
- Added Google Sign-In button with OAuth flow
- Shows loading state during authentication
- Redirects to `/dashboard` after successful login

### Register.jsx
- Added Google Sign-Up button
- Users can sign up with Google or traditional email/password
- Automatically creates profile via database trigger

## Important Notes

1. **First-time OAuth Flow**: The first time a user signs in with Google, Supabase automatically creates their profile (via the `handle_new_user()` trigger)

2. **Email as Fallback**: Google OAuth may not always provide a name, so email is used as a fallback for the profile name

3. **Profile Creation**: User profiles are automatically created by the database trigger - no manual creation needed

4. **Session Management**: The auth context automatically handles session refresh on page reload

## Security Best Practices

- Never commit your Client Secret to version control
- Use environment variables for sensitive credentials
- Regularly rotate your credentials
- Monitor Google Cloud Console for suspicious activity
- Enable 2FA on your Google Cloud and Supabase accounts

## Additional Resources

- [Supabase OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Concepts](https://supabase.com/docs/guides/auth)
