import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: user, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user.user) {
      throw new Error('Unauthorized');
    }

    const { email, familyId, familyName } = await req.json();

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('family_invitations')
      .insert({
        family_id: familyId,
        invited_by: user.user.id,
        email: email,
        token: invitationToken,
      })
      .select()
      .single();

    if (inviteError) {
      throw new Error(`Failed to create invitation: ${inviteError.message}`);
    }

    // Send invitation email
    const invitationUrl = `${req.headers.get('origin')}/join-family?token=${invitationToken}`;
    
    const emailResponse = await resend.emails.send({
      from: 'AayuTrace <noreply@resend.dev>',
      to: [email],
      subject: `Invitation to join ${familyName} on AayuTrace`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">You're invited to join ${familyName}!</h2>
          <p>You've been invited to join the "${familyName}" family on AayuTrace - the smart way to track household products and never miss expiry dates or warranty claims.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>What you can do as a family member:</strong></p>
            <ul>
              <li>✅ View and manage shared household products</li>
              <li>✅ Get notifications for expiry dates and warranties</li>
              <li>✅ Add products that everyone can see</li>
              <li>✅ Collaborate on shopping lists</li>
            </ul>
          </div>
          
          <p>
            <a href="${invitationUrl}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Join Family
            </a>
          </p>
          
          <p style="color: #6b7280; font-size: 14px;">
            This invitation will expire in 7 days. If you don't have an AayuTrace account, you'll be able to create one when you click the link.
          </p>
          
          <hr style="border: none; height: 1px; background: #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log('Family invitation email sent:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      invitationId: invitation.id,
      invitationUrl 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-family-invitation function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});