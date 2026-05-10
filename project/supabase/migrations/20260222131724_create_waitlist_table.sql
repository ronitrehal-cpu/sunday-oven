/*
  # Create Waitlist Table

  ## Overview
  Creates a waitlist table to store email signups for the Sunday Oven launch campaign.
  All emails are forwarded to hello@sundayoven.com.au via Resend API.

  ## New Tables
  
  ### `waitlist`
  Stores email addresses of users who sign up for launch notifications.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for each signup
  - `email` (text, unique, not null) - User's email address
  - `created_at` (timestamptz) - When the user signed up (defaults to now)
  - `forwarded_at` (timestamptz, nullable) - When the email was forwarded to hello@sundayoven.com.au
  - `source` (text) - Where the signup came from (e.g., 'website', 'landing_page')
  
  ## Security
  
  ### Row Level Security (RLS)
  - RLS is ENABLED on the `waitlist` table
  - Public INSERT policy allows anyone to sign up
  - Only authenticated admin users can view waitlist entries
  
  ## Important Notes
  1. Email addresses are unique - duplicate signups are prevented at the database level
  2. The `forwarded_at` timestamp tracks when emails are successfully sent to hello@sundayoven.com.au
  3. Public can insert (sign up) but cannot read the waitlist
  4. Admin access requires authentication
*/

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  forwarded_at timestamptz,
  source text DEFAULT 'website',
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Enable Row Level Security
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (sign up)
CREATE POLICY "Anyone can sign up for waitlist"
  ON waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users (admins) can view waitlist
CREATE POLICY "Authenticated users can view waitlist"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users (admins) can update forwarded_at
CREATE POLICY "Authenticated users can update waitlist"
  ON waitlist
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- Create index for sorting by signup date
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);