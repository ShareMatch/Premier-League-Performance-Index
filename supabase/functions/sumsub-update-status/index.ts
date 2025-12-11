import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Sign Sumsub API request
function signSumsubRequest(
  method: string,
  url: string,
  ts: number,
  secretKey: string,
  body?: string
): string {
  const urlPath = url.replace(/^https?:\/\/[^\/]+/, '')
  const dataToSign = `${ts}${method.toUpperCase()}${urlPath}${body || ''}`
  return createHmac('sha256', secretKey).update(dataToSign).digest('hex')
}

// Fetch verified name from Sumsub
async function fetchApplicantVerifiedName(
  applicantId: string,
  appToken: string,
  secretKey: string,
  baseUrl: string
): Promise<string | null> {
  try {
    const url = `${baseUrl}/resources/applicants/${applicantId}/one`
    const ts = Math.floor(Date.now() / 1000)
    const signature = signSumsubRequest('GET', url, ts, secretKey)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': ts.toString(),
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch applicant info:', response.status)
      return null
    }

    const data = await response.json()
    const info = data.info || {}
    const fixedInfo = data.fixedInfo || {}
    
    // Prefer fixedInfo (verified), then info with English variants
    const firstName = fixedInfo.firstName || info.firstNameEn || info.firstName || ''
    const lastName = fixedInfo.lastName || info.lastNameEn || info.lastName || ''
    
    if (firstName || lastName) {
      const fullName = `${firstName} ${lastName}`.trim()
      console.log('Verified name from Sumsub:', fullName)
      return fullName
    }
    
    return null
  } catch (err) {
    console.error('Error fetching applicant info:', err)
    return null
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, applicant_id, review_status, review_answer, review_reject_type } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const SUMSUB_APP_TOKEN = Deno.env.get('SUMSUB_APP_TOKEN')
    const SUMSUB_SECRET_KEY = Deno.env.get('SUMSUB_SECRET_KEY')
    const SUMSUB_BASE_URL = Deno.env.get('SUMSUB_BASE_URL') || 'https://api.sumsub.com'
    const SUMSUB_DEFAULT_LEVEL = Deno.env.get('SUMSUB_DEFAULT_LEVEL') || 'basic-kyc-level'

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })

    // Get the auth_user_id and existing sumsub_applicant_id for later use
    const { data: userData, error: userFetchError } = await supabase
      .from('users')
      .select('auth_user_id, sumsub_applicant_id')
      .eq('id', user_id)
      .single()

    if (userFetchError) {
      console.error('Failed to fetch user:', userFetchError)
    }

    const authUserId = userData?.auth_user_id
    // Use provided applicant_id, or fall back to the one already in the database
    const effectiveApplicantId = applicant_id || userData?.sumsub_applicant_id

    console.log('User data:', { authUserId, effectiveApplicantId, providedApplicantId: applicant_id })

    // Build update object - only existing columns
    const updateData: Record<string, any> = {}

    // Save applicant ID if provided (and not already in DB)
    if (applicant_id && applicant_id !== userData?.sumsub_applicant_id) {
      updateData.sumsub_applicant_id = applicant_id
      updateData.sumsub_level = SUMSUB_DEFAULT_LEVEL
    }

    // Map review answer to KYC status (prioritize review_answer over review_status)
    if (review_answer) {
      // We have a definitive answer from Sumsub
      if (review_answer === 'GREEN') {
        updateData.kyc_status = 'approved'
        // Set 24-hour cooling off period
        updateData.cooling_off_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        updateData.kyc_reviewed_at = new Date().toISOString()
        console.log('Setting status to approved with cooling off period')
        
        // Fetch and update the verified name from Sumsub
        // Use effectiveApplicantId (provided or from DB)
        if (SUMSUB_APP_TOKEN && SUMSUB_SECRET_KEY && effectiveApplicantId) {
          console.log(`Fetching verified name for applicant: ${effectiveApplicantId}`)
          const verifiedName = await fetchApplicantVerifiedName(
            effectiveApplicantId,
            SUMSUB_APP_TOKEN,
            SUMSUB_SECRET_KEY,
            SUMSUB_BASE_URL
          )
          
          if (verifiedName) {
            updateData.full_name = verifiedName
            console.log(`Updating full_name to verified name: ${verifiedName}`)
          } else {
            console.log('No verified name returned from Sumsub')
          }
        } else {
          console.log('Cannot fetch verified name - missing:', { 
            hasAppToken: !!SUMSUB_APP_TOKEN, 
            hasSecretKey: !!SUMSUB_SECRET_KEY, 
            hasApplicantId: !!effectiveApplicantId 
          })
        }
      } else if (review_answer === 'RED') {
        // Check if it's a RETRY (resubmission allowed) or FINAL rejection
        const isFinalRejection = review_reject_type === 'FINAL'
        updateData.kyc_status = isFinalRejection ? 'rejected' : 'resubmission_requested'
        updateData.kyc_reviewed_at = new Date().toISOString()
        console.log(`Rejection - type: ${review_reject_type}, isFinal: ${isFinalRejection}, status: ${updateData.kyc_status}`)
      }
    } else if (review_status) {
      // No review answer yet, just status update
      if (review_status === 'init' || review_status === 'pending') {
        updateData.kyc_status = 'started'
        updateData.kyc_started_at = new Date().toISOString()
      } else if (review_status === 'onHold') {
        updateData.kyc_status = 'on_hold'
      } else if (review_status === 'completed') {
        // Completed but no answer - keep as pending
        updateData.kyc_status = 'pending'
        updateData.kyc_reviewed_at = new Date().toISOString()
      }
    }

    // Only update if we have something to update
    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No updates needed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Updating user ${user_id}:`, updateData)

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user_id)

    if (updateError) {
      console.error('Failed to update user:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Also update the auth.users display name if we have a verified name and auth_user_id
    if (updateData.full_name && authUserId) {
      console.log(`Updating auth.users display name for ${authUserId} to: ${updateData.full_name}`)
      
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        authUserId,
        { 
          user_metadata: { 
            full_name: updateData.full_name 
          } 
        }
      )

      if (authUpdateError) {
        console.error('Failed to update auth user metadata:', authUpdateError)
        // Don't fail the whole request, just log the error
      } else {
        console.log('Auth user display name updated successfully')
      }
    }

    return new Response(
      JSON.stringify({ ok: true, updated: updateData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Update status error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
