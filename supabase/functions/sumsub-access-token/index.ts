import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts"

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
    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get secrets from Supabase environment
    const SUMSUB_APP_TOKEN = Deno.env.get('SUMSUB_APP_TOKEN')
    const SUMSUB_SECRET_KEY = Deno.env.get('SUMSUB_SECRET_KEY')
    const SUMSUB_BASE_URL = Deno.env.get('SUMSUB_BASE_URL') || 'https://api.sumsub.com'
    const SUMSUB_DEFAULT_LEVEL = Deno.env.get('SUMSUB_DEFAULT_LEVEL') || 'basic-kyc-level'
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      console.error('Missing Sumsub credentials')
      return new Response(
        JSON.stringify({ error: 'Missing Sumsub credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase credentials')
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get user core profile (normalized schema)
    console.log('Querying users with id:', user_id, 'Type:', typeof user_id)
    let resolvedUserId = user_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, auth_user_id')
      .eq('id', user_id)
      .maybeSingle()

    console.log('Primary lookup result:', { data: !!user, error: userError?.message })

    // Fallback: if caller passed auth_user_id instead of public.users.id
    let userData = user
    let userErr = userError
    if (!userData && !userErr) {
      console.log('Trying fallback lookup by auth_user_id')
      const fallback = await supabase
        .from('users')
        .select('id, email, full_name, auth_user_id')
        .eq('auth_user_id', user_id)
        .maybeSingle()
      userData = fallback.data
      userErr = fallback.error
      console.log('Fallback lookup result:', { data: !!fallback.data, error: fallback.error?.message })
      if (fallback.data?.id) {
        resolvedUserId = fallback.data.id
      }
    }

    if (userErr || !userData) {
      console.error('Final user lookup failed:', {
        user_id,
        userErr: userErr?.message,
        userErrCode: userErr?.code,
        userErrDetails: userErr?.details,
        resolvedUserId
      })
      return new Response(
        JSON.stringify({
          error: 'User not found',
          details: userErr?.message,
          code: userErr?.code
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User found:', {
      id: userData.id,
      email: userData.email,
      resolvedUserId
    })

    // Fetch compliance record (normalized schema)
    let { data: compliance, error: complianceError } = await supabase
      .from('user_compliance')
      .select('kyc_status, sumsub_applicant_id, sumsub_level, sumsub_reuse_token, cooling_off_until, kyc_started_at, kyc_reviewed_at')
      .eq('user_id', resolvedUserId)
      .maybeSingle()

    // If compliance record exists but kyc_started_at is null, update it
    if (compliance && !compliance.kyc_started_at) {
      console.log('Updating existing compliance record with kyc_started_at', { resolvedUserId })
      const now = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('user_compliance')
        .update({ kyc_started_at: now })
        .eq('user_id', resolvedUserId)

      if (updateError) {
        console.error('Failed to update kyc_started_at:', updateError)
      } else {
        compliance.kyc_started_at = now // Update local object
      }
    }

    if (complianceError || !compliance) {
      console.warn('Compliance record missing; creating default', { resolvedUserId, complianceError })
      const now = new Date().toISOString()
      const { data: created, error: createError } = await supabase
        .from('user_compliance')
        .insert({
          user_id: resolvedUserId,
          kyc_status: 'unverified',
          sumsub_level: null,
          sumsub_applicant_id: null,
          kyc_started_at: now, // Set when user first requests access token
          kyc_reviewed_at: null,
        })
        .select('kyc_status, sumsub_applicant_id, sumsub_level, sumsub_reuse_token, cooling_off_until, kyc_started_at, kyc_reviewed_at')
        .maybeSingle()

      if (createError || !created) {
        console.error('Failed to create compliance record', { resolvedUserId, createError })
        return new Response(
          JSON.stringify({ error: 'Compliance record not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      compliance = created
    }

    const kycStatus = compliance.kyc_status
    console.log('Generating Sumsub token for user:', userData.email, 'current status:', kycStatus)

    // Generate Sumsub API signature
    const ts = Math.floor(Date.now() / 1000).toString()
    const method = 'POST'
    const path = `/resources/accessTokens?userId=${user_id}&levelName=${SUMSUB_DEFAULT_LEVEL}&ttlInSecs=600`
    const body = ''

    const signatureString = ts + method + path + body
    const signature = createHmac('sha256', SUMSUB_SECRET_KEY)
      .update(signatureString)
      .digest('hex')

    // Call Sumsub API to get access token
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
      console.error('Sumsub API error:', data)
      return new Response(
        JSON.stringify({ error: 'Failed to get Sumsub token', details: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Sumsub token generated successfully')

    // Only update KYC status to 'started' for NEW users (not for resubmissions)
    // For resubmissions, keep the existing status - it will be updated by webhook/SDK callback
    const isNewKyc = !kycStatus || kycStatus === 'not_started'
    
    if (isNewKyc) {
      const { error: updateError } = await supabase
        .from('user_compliance')
        .update({ 
          kyc_status: 'started',
          sumsub_level: SUMSUB_DEFAULT_LEVEL,
          kyc_started_at: new Date().toISOString(),
        })
        .eq('user_id', resolvedUserId)

      if (updateError) {
        console.error('Failed to update KYC status:', updateError)
      }
      console.log('Set KYC status to started for new user')
    } else {
      // For resubmissions, just update the level if not set
      const { error: updateError } = await supabase
        .from('user_compliance')
        .update({ 
          sumsub_level: SUMSUB_DEFAULT_LEVEL,
        })
        .eq('user_id', resolvedUserId)

      if (updateError) {
        console.error('Failed to update sumsub_level:', updateError)
      }
      console.log('Resubmission - keeping existing status:', kycStatus)
    }

    return new Response(
      JSON.stringify({ token: data.token }),
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


