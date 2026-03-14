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
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <meta name="color-scheme" content="light">
              <meta name="supported-color-schemes" content="light">
              <style>
                :root {
                  color-scheme: light;
                  supported-color-schemes: light;
                }
              </style>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td width="25%" style="background-color: #f3dac6;" bgcolor="#f3dac6">&nbsp;</td>
                  <td width="25%" style="background-color: #3d0a10;" bgcolor="#3d0a10">&nbsp;</td>
                  <td width="4" style="background-color: #f3dac6;" bgcolor="#f3dac6">&nbsp;</td>
                  <td width="25%" style="background-color: #f3dac6;" bgcolor="#f3dac6">&nbsp;</td>
                  <td width="25%" style="background-color: #3d0a10;" bgcolor="#3d0a10">&nbsp;</td>
                  <td width="4" style="background-color: #f3dac6;" bgcolor="#f3dac6">&nbsp;</td>
                </tr>
                <tr>
                  <td colspan="6" style="padding: 40px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #3d0a10; border-radius: 18px;" bgcolor="#3d0a10">
                      <tr>
                        <td style="text-align: center; padding: 28px 28px 24px 28px; background-color: #3d0a10;" bgcolor="#3d0a10">
                          <div style="color: #f3dac6; font-size: 12px; font-weight: bold; letter-spacing: 2px; margin-bottom: 20px;">SUNDAY OVEN</div>
                          <h1 style="color: #f3dac6; font-size: 32px; font-weight: bold; margin: 0 0 12px 0;">YOU'RE IN!</h1>
                          <p style="color: #f3dac6; font-size: 18px; margin: 0 0 24px 0;">Thanks for joining the Sunday Oven list.</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 28px 28px 28px; background-color: #3d0a10;" bgcolor="#3d0a10">
                          <p style="color: #f3dac6; font-size: 16px; line-height: 1.6; margin: 0;">We'll email you when our first batch drops. Early subscribers get first access and launch perks.</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 28px 28px 28px; background-color: #3d0a10;" bgcolor="#3d0a10">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3dac6; border-radius: 12px;" bgcolor="#f3dac6">
                            <tr>
                              <td style="text-align: center; padding: 20px; background-color: #f3dac6;" bgcolor="#f3dac6">
                                <div style="color: #3d0a10; font-size: 20px; font-weight: bold; margin-bottom: 8px;">10% off your first order</div>
                                <div style="color: #3d0a10; font-size: 16px;">Use code: <strong style="color: #3d0a10;">FIRSTBATCH10</strong></div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="text-align: center; padding: 0 28px 28px 28px; background-color: #3d0a10;" bgcolor="#3d0a10">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                            <tr>
                              <td style="background-color: #f3dac6; border-radius: 999px;" bgcolor="#f3dac6">
                                <a href="https://instagram.com/bakesbysundayoven" style="display: inline-block; background-color: #f3dac6; color: #3d0a10; font-weight: bold; font-size: 16px; text-decoration: none; padding: 14px 22px; border-radius: 999px;">FOLLOW US ON INSTAGRAM</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="text-align: center; padding: 20px 28px 28px 28px; border-top: 1px solid rgba(243, 218, 198, 0.2); background-color: #3d0a10;" bgcolor="#3d0a10">
                          <p style="color: #f3dac6; font-size: 14px; margin: 0;">© 2026 Sunday Oven</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td width="25%" style="background-color: #f3dac6;" bgcolor="#f3dac6">&nbsp;</td>
                  <td width="25%" style="background-color: #3d0a10;" bgcolor="#3d0a10">&nbsp;</td>
                  <td width="4" style="background-color: #f3dac6;" bgcolor="#f3dac6">&nbsp;</td>
                  <td width="25%" style="background-color: #f3dac6;" bgcolor="#f3dac6">&nbsp;</td>
                  <td width="25%" style="background-color: #3d0a10;" bgcolor="#3d0a10">&nbsp;</td>
                  <td width="4" style="background-color: #f3dac6;" bgcolor="#f3dac6">&nbsp;</td>
                </tr>
              </table>
            </body>
            </html>
          `,
          text: `SUNDAY OVEN

YOU'RE IN!

Thanks for joining the Sunday Oven list.

We'll email you when our first batch drops. Early subscribers get first access and launch perks.

10% off your first order
Use code: FIRSTBATCH10

FOLLOW US ON INSTAGRAM
https://instagram.com/bakesbysundayoven

Sunday Oven`,
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
