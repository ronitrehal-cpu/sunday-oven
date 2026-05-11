# Sunday Oven Waitlist Setup

This document explains how to configure the waitlist system with Netlify Functions, Resend email service, and Supabase database.

## Prerequisites

1. **Supabase** - Database already configured
2. **Resend Account** - For sending email notifications
3. **Netlify** - For hosting and serverless functions

## Setup Instructions

### 1. Resend API Key

1. Sign up for a free account at [resend.com](https://resend.com)
2. Verify your domain `sundayoven.com.au` or use the test domain provided by Resend
3. Navigate to **API Keys** in your Resend dashboard
4. Create a new API key and copy it

### 2. Configure Environment Variables

#### For Local Development

Add to your `.env` file:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### For Netlify Deployment

1. Go to your Netlify dashboard
2. Navigate to **Site settings** > **Environment variables**
3. Add the following variables:
   - `VITE_SUPABASE_URL` (already configured)
   - `VITE_SUPABASE_ANON_KEY` (already configured)
   - `RESEND_API_KEY` (your Resend API key)

### 3. Verify Domain in Resend (Production)

For production emails to work:

1. Log into your Resend dashboard
2. Go to **Domains** section
3. Add `sundayoven.com.au`
4. Add the provided DNS records to your domain registrar
5. Wait for verification (usually a few minutes)

Once verified, the `from` address in the Netlify function will work correctly.

### 4. Test the Integration

#### Local Testing

```bash
npm install
npm run dev
```

Then submit an email through the waitlist form.

#### Check Supabase

1. Open your Supabase dashboard
2. Go to **Table Editor**
3. View the `waitlist` table to see new signups

#### Check Email

- New signups will send an email to `hello@sundayoven.com.au`
- Check the Resend dashboard logs to verify email delivery

## How It Works

### Database Schema

The `waitlist` table stores:
- `id` - Unique identifier
- `email` - User's email (unique constraint)
- `created_at` - Signup timestamp
- `forwarded_at` - When email was sent to hello@sundayoven.com.au
- `source` - Where the signup came from ('website')

### Security

- Row Level Security (RLS) is enabled
- Public users can INSERT (sign up) but cannot view the waitlist
- Only authenticated admin users can view waitlist entries
- Email format validation at both database and application level
- Duplicate emails are rejected

### Email Flow

1. User submits email via form
2. Netlify function validates the email
3. Email is saved to Supabase `waitlist` table
4. Notification email is sent to `hello@sundayoven.com.au` via Resend
5. Success message is shown to user

## Troubleshooting

### Emails not sending

- Verify your `RESEND_API_KEY` is correct
- Check if domain is verified in Resend dashboard
- View Resend logs for error messages

### Database errors

- Check Supabase dashboard for connection issues
- Verify RLS policies are enabled
- Check table exists in your Supabase project

### Function errors

- Check Netlify function logs in the dashboard
- Verify all environment variables are set
- Test locally first before deploying

## Viewing Waitlist Data

To view your waitlist signups:

1. Log into Supabase dashboard
2. Go to **Table Editor**
3. Select `waitlist` table
4. View all signups with timestamps

Or use the Supabase client with admin credentials:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin access
)

const { data } = await supabase
  .from('waitlist')
  .select('*')
  .order('created_at', { ascending: false })
```

## Support

For issues or questions:
- Email: hello@sundayoven.com.au
- Check Netlify function logs for errors
- Review Supabase logs for database issues
- Check Resend dashboard for email delivery status
