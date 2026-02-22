import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const resendApiKey = process.env.RESEND_API_KEY!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const { email } = JSON.parse(event.body || '{}');

    if (!email) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid email format' }),
      };
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Insert email into waitlist
    const { data: waitlistEntry, error: dbError } = await supabase
      .from('waitlist')
      .insert([{ email, source: 'website' }])
      .select()
      .single();

    if (dbError) {
      // Check if it's a duplicate email error
      if (dbError.code === '23505') {
        return {
          statusCode: 409,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'This email is already on the waitlist' }),
        };
      }

      console.error('Database error:', dbError);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Failed to add email to waitlist' }),
      };
    }

    // Send admin notification email via Resend
    try {
      const adminEmailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Sunday Oven <noreply@sundayoven.com.au>',
          to: ['hello@sundayoven.com.au'],
          subject: '🍪 New Waitlist Signup - Sunday Oven',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #8B7355;">New Waitlist Signup</h2>
              <p>Someone just joined the Sunday Oven waitlist!</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 10px 0 0 0;"><strong>Signed up:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</p>
                <p style="margin: 10px 0 0 0;"><strong>Source:</strong> Website</p>
              </div>
              <p style="color: #666; font-size: 14px;">This notification was sent automatically from your Sunday Oven waitlist.</p>
            </div>
          `,
        }),
      });

      if (adminEmailResponse.ok) {
        // Update forwarded_at timestamp
        await supabase
          .from('waitlist')
          .update({ forwarded_at: new Date().toISOString() })
          .eq('id', waitlistEntry.id);
      } else {
        console.error('Admin email error:', await adminEmailResponse.text());
      }
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
    }

    // Send user confirmation email via Resend
    try {
      const userEmailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Sunday Oven <noreply@sundayoven.com.au>',
          to: [email],
          subject: "You're on the Sunday Oven list 🍪",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p>Thanks for joining the Sunday Oven list. We'll email you when we drop our first batch.</p>
              <p style="margin-top: 30px;">Sunday Oven</p>
            </div>
          `,
        }),
      });

      if (!userEmailResponse.ok) {
        console.error('User confirmation email error:', await userEmailResponse.text());
      }
    } catch (emailError) {
      // Log error but don't fail the request - user is still added to waitlist
      console.error('Failed to send user confirmation email:', emailError);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Successfully joined the waitlist!'
      }),
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'An unexpected error occurred' }),
    };
  }
};
