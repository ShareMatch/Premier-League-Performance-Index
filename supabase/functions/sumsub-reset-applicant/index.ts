import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts"
import { requireAuthUser } from "../_shared/require-auth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authContext = await requireAuthUser(req)
    if (authContext.error) {
      return new Response(
        JSON.stringify({ error: authContext.error.message }),
        { status: authContext.error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { user_id: rawUserId } = await req.json()
    const user_id = rawUserId ? String(rawUserId).trim() : ""

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (user_id !== authContext.publicUser.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const SUMSUB_APP_TOKEN = Deno.env.get("SUMSUB_APP_TOKEN")
    const SUMSUB_SECRET_KEY = Deno.env.get("SUMSUB_SECRET_KEY")
    const SUMSUB_BASE_URL = Deno.env.get("SUMSUB_BASE_URL") || "https://api.sumsub.com"

    const supabase = authContext.supabase

    // Get user info from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      console.error('User not found:', userError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get compliance data from user_compliance table (where sumsub_applicant_id is stored)
    const { data: compliance, error: complianceError } = await supabase
      .from('user_compliance')
      .select('sumsub_applicant_id, kyc_status')
      .eq('user_id', user_id)
      .single()

    if (complianceError || !compliance) {
      console.error('Compliance record not found:', complianceError)
      return new Response(
        JSON.stringify({ error: 'No KYC record found for this user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!compliance.sumsub_applicant_id) {
      console.error('User has no Sumsub applicant ID')
      return new Response(
        JSON.stringify({ error: 'No KYC record found for this user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Resetting Sumsub applicant for user:', user.email, 'applicantId:', compliance.sumsub_applicant_id)

    // Generate Sumsub API signature for reset endpoint
    const ts = Math.floor(Date.now() / 1000).toString()
    const method = 'POST'
    const path = `/resources/applicants/${compliance.sumsub_applicant_id}/reset`
    const body = ''

    const signatureString = ts + method + path + body
    const signature = createHmac('sha256', SUMSUB_SECRET_KEY)
      .update(signatureString)
      .digest('hex')

    // Call Sumsub reset API
    const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-App-Token': SUMSUB_APP_TOKEN,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': ts,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Sumsub reset API error:', data)
      return new Response(
        JSON.stringify({ error: 'Failed to reset KYC', details: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Sumsub reset successful:', data)

    // Update user's KYC status in user_compliance table to 'not_started'
    const { error: updateError } = await supabase
      .from('user_compliance')
      .update({ 
        kyc_status: 'not_started',
        kyc_started_at: null,
        kyc_reviewed_at: null,
      })
      .eq('user_id', user_id)

    if (updateError) {
      console.error('Failed to update KYC status in database:', updateError)
      // Don't fail the request - Sumsub reset was successful
    }

    console.log('KYC status reset to not_started for user:', user.email)

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: 'KYC reset successful. You can now re-verify.',
        applicantId: compliance.sumsub_applicant_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
