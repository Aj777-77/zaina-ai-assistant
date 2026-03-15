# Environment Configuration Guide

## Setup Instructions

### 1. Create Your Local Environment File

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

### 2. Configure OpenAI API

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key and paste it into `OPENAI_API_KEY` in `.env.local`

### 3. Configure Firebase

#### Get Firebase Service Account Credentials:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on **Project Settings** (gear icon)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file

#### Extract and Add to .env.local:

From the downloaded JSON file, copy these values:

```json
{
  "project_id": "your-project-id",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

Add them to your `.env.local`:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important:** Keep the private key in quotes and preserve the `\n` characters.

### 4. Configure Next.js URL

For development:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production (Vercel):
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Security Notes

- ✅ `.env.local` is in `.gitignore` and will NOT be committed
- ✅ `.env.example` serves as a template (no secrets)
- ⚠️ Never commit actual API keys or credentials
- ⚠️ Keep your Firebase service account JSON file secure
- ⚠️ Rotate keys immediately if accidentally exposed

## Vercel Deployment

When deploying to Vercel, add environment variables in:

**Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add all variables from `.env.local` for Production, Preview, and Development environments.

## Testing Your Configuration

After setting up, verify your environment variables are loaded:

```bash
npm run dev
```

Check the console for any missing environment variable warnings.

## Troubleshooting

### Firebase Private Key Issues

If you get authentication errors:

1. Ensure the private key includes `\n` characters
2. Wrap the entire key in double quotes
3. Don't remove the BEGIN/END markers

### OpenAI API Errors

If you get 401 Unauthorized:

1. Verify the API key is correct
2. Check your OpenAI account has available credits
3. Ensure no extra spaces or quotes around the key

## Need Help?

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
