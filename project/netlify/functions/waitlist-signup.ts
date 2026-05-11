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
          from: 'Sunday Oven <hello@sundayoven.com.au>',
          to: ['hello@sundayoven.com.au'],
          subject: 'New Waitlist Signup - Sunday Oven',
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
          from: 'Sunday Oven <hello@sundayoven.com.au>',
          to: [email],
          subject: "You're on the list | Sunday Oven",
          html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<title>You're on the list | Sunday Oven</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f5ede1; }
  table { border-collapse: collapse !important; }
  a { color: #c9a96a; text-decoration: none; }
  @media screen and (max-width: 600px) {
    .container { width: 100% !important; max-width: 100% !important; }
    .px-mobile { padding-left: 22px !important; padding-right: 22px !important; }
    .h1-mobile { font-size: 30px !important; line-height: 1.15 !important; }
    .h2-mobile { font-size: 18px !important; }
    .body-mobile { font-size: 15px !important; line-height: 1.65 !important; }
    .code-mobile { font-size: 24px !important; letter-spacing: 5px !important; }
    .logo-img { width: 125px !important; max-width: 125px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .force-light { background-color: #f5ede1 !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#f5ede1; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
<div style="display:none; font-size:1px; color:#f5ede1; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
  You're on the list. Here's your early-access code for our first batch of premium cookies. Use FIRSTBATCH10 at checkout.
</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="force-light" style="background-color:#f5ede1;">
  <tr>
    <td align="center" style="padding: 20px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" class="container" style="width:560px; max-width:560px; background-color:#3a0f10; border-radius:16px; overflow:hidden; box-shadow: 0 20px 48px rgba(58, 15, 16, 0.18);">
        <tr>
          <td style="height:4px; background: linear-gradient(90deg, #c9a96a 0%, #e6cb95 50%, #c9a96a 100%); line-height:4px; font-size:0;">&nbsp;</td>
        </tr>
        <tr>
          <td align="center" class="px-mobile" style="padding: 24px 40px 0 40px;">
            <img src="https://sundayoven.com.au/sundayovenstackednew.png"
                 alt="Sunday Oven"
                 class="logo-img"
                 style="display:block; width:150px; max-width:150px; height:auto; border:0; outline:none; text-decoration:none; margin:0 auto;">
          </td>
        </tr>
        <tr>
          <td align="center" class="px-mobile" style="padding: 28px 40px 0 40px;">
            <h1 class="h1-mobile" style="margin:0; font-family:'Playfair Display', Georgia, serif; font-size:38px; font-weight:600; color:#f5ede1; line-height:1.1; letter-spacing:-0.5px;">
              You're on the list.
            </h1>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 18px 40px 0 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:48px; height:1px; background-color:#c9a96a; line-height:1px; font-size:0;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="px-mobile" style="padding: 22px 40px 0 40px;">
            <p class="body-mobile" style="margin:0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:16px; line-height:1.7; color:#f5ede1; text-align:center;">
              Thank you for joining us early! We're carefully crafting our first batch of premium cookies, and you'll be among the very first to taste them.
            </p>
          </td>
        </tr>
        <tr>
          <td class="px-mobile" style="padding: 28px 40px 0 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5ede1; border-radius:12px;">
              <tr>
                <td align="center" style="padding: 20px 24px 10px 24px;">
                  <p style="margin:0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:11px; font-weight:600; color:#3a0f10; letter-spacing:3px; text-transform:uppercase; opacity:0.7;">
                    Your early-access code
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 4px 24px 8px 24px;">
                  <p class="code-mobile" style="margin:0; font-family:'Playfair Display', Georgia, serif; font-size:34px; font-weight:700; color:#3a0f10; letter-spacing:8px;">
                    FIRSTBATCH10
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0 24px 20px 24px;">
                  <p style="margin:0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:13px; line-height:1.5; color:#3a0f10; opacity:0.75;">
                    10% off your first order when we launch
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="px-mobile" style="padding: 28px 40px 0 40px;">
            <h2 class="h2-mobile" style="margin:0 0 16px 0; font-family:'Playfair Display', Georgia, serif; font-size:22px; font-weight:500; color:#f5ede1; text-align:center; letter-spacing:-0.2px;">
              What happens next
            </h2>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding: 12px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td valign="top" width="44" style="width:44px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td align="center" style="width:32px; height:32px; background-color:#c9a96a; border-radius:50%; font-family:'Playfair Display', Georgia, serif; font-size:14px; font-weight:600; color:#3a0f10; line-height:32px;">1</td>
                          </tr>
                        </table>
                      </td>
                      <td valign="top" style="padding-top:4px;">
                        <p style="margin:0 0 4px 0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:15px; font-weight:600; color:#f5ede1;">We bake the first batch</p>
                        <p style="margin:0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:14px; line-height:1.6; color:#f5ede1; opacity:0.75;">Small-batch, made with quality ingredients. Worth the wait.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td valign="top" width="44" style="width:44px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td align="center" style="width:32px; height:32px; background-color:#c9a96a; border-radius:50%; font-family:'Playfair Display', Georgia, serif; font-size:14px; font-weight:600; color:#3a0f10; line-height:32px;">2</td>
                          </tr>
                        </table>
                      </td>
                      <td valign="top" style="padding-top:4px;">
                        <p style="margin:0 0 4px 0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:15px; font-weight:600; color:#f5ede1;">You get early access</p>
                        <p style="margin:0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:14px; line-height:1.6; color:#f5ede1; opacity:0.75;">We'll email you before anyone else, so you can order ahead of general release.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td valign="top" width="44" style="width:44px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td align="center" style="width:32px; height:32px; background-color:#c9a96a; border-radius:50%; font-family:'Playfair Display', Georgia, serif; font-size:14px; font-weight:600; color:#3a0f10; line-height:32px;">3</td>
                          </tr>
                        </table>
                      </td>
                      <td valign="top" style="padding-top:4px;">
                        <p style="margin:0 0 4px 0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:15px; font-weight:600; color:#f5ede1;">Save 10% at checkout</p>
                        <p style="margin:0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:14px; line-height:1.6; color:#f5ede1; opacity:0.75;">Use <strong style="color:#c9a96a; font-weight:600;">FIRSTBATCH10</strong> on your first order to claim your launch perk.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" class="px-mobile" style="padding: 28px 40px 0 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background-color:#c9a96a; border-radius:50px;">
                  <a href="https://sundayoven.com.au" target="_blank" style="display:inline-block; padding:14px 32px; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:14px; font-weight:600; color:#3a0f10; text-decoration:none; letter-spacing:1px; text-transform:uppercase;">
                    Visit Sunday Oven
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" class="px-mobile" style="padding: 24px 40px 0 40px;">
            <p style="margin:0; font-family:'Playfair Display', Georgia, serif; font-style:italic; font-size:15px; color:#c9a96a; line-height:1.5;">
              Slow-baked. Sunday-made.
            </p>
          </td>
        </tr>
        <tr>
          <td class="px-mobile" style="padding: 24px 40px 0 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="height:1px; background-color:rgba(245, 237, 225, 0.12); line-height:1px; font-size:0;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" class="px-mobile" style="padding: 16px 40px 20px 40px;">
            <p style="margin:0 0 6px 0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:12px; line-height:1.6; color:#f5ede1; opacity:0.6;">
              You're receiving this because you joined the Sunday Oven waitlist at
              <a href="https://sundayoven.com.au" style="color:#c9a96a; text-decoration:none;">sundayoven.com.au</a>.
            </p>
            <p style="margin:0 0 10px 0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:12px; line-height:1.6; color:#f5ede1; opacity:0.5;">
              Melbourne, Australia
            </p>
            <p style="margin:0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:11px; color:#f5ede1; opacity:0.4; letter-spacing:0.5px;">
              © 2026 Sunday Oven
            </p>
          </td>
        </tr>
        <tr>
          <td style="height:4px; background: linear-gradient(90deg, #c9a96a 0%, #e6cb95 50%, #c9a96a 100%); line-height:4px; font-size:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
          text: `SUNDAY OVEN

You're on the list.

Thank you for joining us early! We're carefully crafting our first batch of premium cookies, and you'll be among the very first to taste them.

YOUR EARLY-ACCESS CODE: FIRSTBATCH10
10% off your first order when we launch

WHAT HAPPENS NEXT

1. We bake the first batch
   Small-batch, made with quality ingredients. Worth the wait.

2. You get early access
   We'll email you before anyone else, so you can order ahead of general release.

3. Save 10% at checkout
   Use FIRSTBATCH10 on your first order to claim your launch perk.

Visit Sunday Oven: https://sundayoven.com.au

Slow-baked. Sunday-made.

---

You're receiving this because you joined the Sunday Oven waitlist at sundayoven.com.au
Melbourne, Australia

© 2026 Sunday Oven`,
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
