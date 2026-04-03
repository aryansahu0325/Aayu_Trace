import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
  confirmUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, confirmUrl }: WelcomeEmailRequest = await req.json();

    if (!email || !name) {
      throw new Error("Email and name are required");
    }

    const emailResponse = await resend.emails.send({
      from: "AayuTrace <welcome@aayutrace.app>",
      to: [email],
      subject: "Welcome to AayuTrace! 🎉",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to AayuTrace</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to AayuTrace! 🎉</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0;">Never miss an expiry date again</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
            <p>Welcome to AayuTrace! We're excited to help you track your products and never miss an expiry date again.</p>
            
            ${confirmUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold;
                        display: inline-block;
                        transition: transform 0.2s;">
                Confirm Your Email
              </a>
            </div>
            <p><strong>Please confirm your email address to get started.</strong></p>
            ` : ''}
            
            <h3 style="color: #333; margin-top: 30px;">What you can do with AayuTrace:</h3>
            <ul style="margin: 15px 0; padding-left: 20px;">
              <li>📦 Track expiry dates for food, medicines, cosmetics, and more</li>
              <li>🔔 Get timely reminders before products expire</li>
              <li>📊 Organize products by categories</li>
              <li>💰 Save money by avoiding expired products</li>
              <li>🏥 Stay healthy by never using expired medicines</li>
            </ul>
          </div>
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: #2d5a2d; margin-top: 0;">💡 Pro Tip</h3>
            <p style="color: #2d5a2d; margin: 0;">Start by adding a few products from your kitchen or medicine cabinet. Set reminders for 7 days before expiry to get the most value!</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 14px;">
              Need help? Reply to this email or visit our support center.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              © 2024 AayuTrace. This email was sent to ${email}.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Welcome email sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (err) {
      const error = err as Error;
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);