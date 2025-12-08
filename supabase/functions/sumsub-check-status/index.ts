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

    // Get environment variables
    const SUMSUB_APP_TOKEN = Deno.env.get('SUMSUB_APP_TOKEN')
    const SUMSUB_SECRET_KEY = Deno.env.get('SUMSUB_SECRET_KEY')
    const SUMSUB_BASE_URL = Deno.env.get('SUMSUB_BASE_URL') || 'https://api.sumsub.com'
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing Sumsub credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get user's applicant ID from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, sumsub_applicant_id, kyc_status, sumsub_level')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user.sumsub_applicant_id) {
      return new Response(
        JSON.stringify({ 
          kyc_status: user.kyc_status || 'not_started',
          message: 'No applicant ID found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Query Sumsub API for applicant status
    const ts = Math.floor(Date.now() / 1000).toString()
    const statusPath = `/resources/applicants/${user.sumsub_applicant_id}/status`
    const statusSignature = createHmac('sha256', SUMSUB_SECRET_KEY)
      .update(ts + 'GET' + statusPath)
      .digest('hex')

    const statusResponse = await fetch(`${SUMSUB_BASE_URL}${statusPath}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-App-Token': SUMSUB_APP_TOKEN,
        'X-App-Access-Sig': statusSignature,
        'X-App-Access-Ts': ts,
      },
    })

    const statusData = await statusResponse.json()
    
    if (!statusResponse.ok) {
      console.error('Sumsub status check failed:', statusData)
      return new Response(
        JSON.stringify({ 
          kyc_status: user.kyc_status || 'pending',
          error: 'Failed to check Sumsub status'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Sumsub status response:', JSON.stringify(statusData))

    // Map Sumsub status to our KYC status
    let kycStatus = 'pending'
    const reviewResult = statusData.reviewResult
    
    console.log('Review result from Sumsub:', JSON.stringify(reviewResult))
    
    if (reviewResult?.reviewAnswer === 'GREEN') {
      kycStatus = 'approved'
    } else if (reviewResult?.reviewAnswer === 'RED') {
      // Check if FINAL rejection or resubmission allowed
      // Only treat as final rejection if explicitly marked as FINAL
      const isFinalRejection = reviewResult?.reviewRejectType === 'FINAL'
      kycStatus = isFinalRejection ? 'rejected' : 'resubmission_requested'
      console.log(`Rejection type: ${reviewResult?.reviewRejectType}, isFinal: ${isFinalRejection}, status: ${kycStatus}`)
    } else if (statusData.reviewStatus === 'completed') {
      kycStatus = 'pending'
    } else if (statusData.reviewStatus === 'init' || statusData.reviewStatus === 'pending') {
      kycStatus = 'started'
    } else if (statusData.reviewStatus === 'onHold') {
      kycStatus = 'on_hold'
    }

    // Update database if status changed - only existing columns
    if (kycStatus !== user.kyc_status) {
      const updateData: Record<string, any> = { 
        kyc_status: kycStatus,
        kyc_reviewed_at: new Date().toISOString(),
      }
      
      // Set cooling off period for approved users
      if (kycStatus === 'approved') {
        updateData.cooling_off_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }

      await supabase
        .from('users')
        .update(updateData)
        .eq('id', user_id)
    }

    // Return status with rejection details from Sumsub (not stored in DB)
    return new Response(
      JSON.stringify({
        kyc_status: kycStatus,
        sumsub_status: statusData.reviewStatus,
        review_result: reviewResult,
        // Rejection details from Sumsub API
        reject_type: reviewResult?.reviewRejectType || null,
        reject_labels: reviewResult?.rejectLabels || [],
        moderation_comment: reviewResult?.moderationComment || null,
        button_ids: reviewResult?.buttonIds || [],
        can_resubmit: kycStatus === 'resubmission_requested',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Check status error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
