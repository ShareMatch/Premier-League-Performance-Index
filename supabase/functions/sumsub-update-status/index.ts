import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts"
import { requireAuthUser } from "../_shared/require-auth.ts"

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
    const authContext = await requireAuthUser(req)
    if (authContext.error) {
      return new Response(
        JSON.stringify({ error: authContext.error.message }),
        { status: authContext.error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { user_id, applicant_id, review_status, review_answer, review_reject_type } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (user_id !== authContext.publicUser.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const SUMSUB_APP_TOKEN = Deno.env.get('SUMSUB_APP_TOKEN')
    const SUMSUB_SECRET_KEY = Deno.env.get('SUMSUB_SECRET_KEY')
    const SUMSUB_BASE_URL = Deno.env.get('SUMSUB_BASE_URL') || 'https://api.sumsub.com'
    const SUMSUB_DEFAULT_LEVEL = Deno.env.get('SUMSUB_DEFAULT_LEVEL') || 'basic-kyc-level'

    const supabase = authContext.supabase

    // Fetch auth_user_id from users (core table)
    const { data: userData, error: userFetchError } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('id', user_id)
      .single()

    if (userFetchError) {
      console.error('Failed to fetch user:', userFetchError)
    }

    const authUserId = userData?.auth_user_id

    // Fetch or create compliance record (normalized KYC data)
    let { data: compliance, error: complianceError } = await supabase
      .from('user_compliance')
      .select('sumsub_applicant_id, sumsub_level, kyc_status, cooling_off_until, kyc_started_at, kyc_reviewed_at')
      .eq('user_id', user_id)
      .maybeSingle()

    if (complianceError || !compliance) {
      console.warn('Compliance record missing; creating default', { user_id, complianceError })
      const { data: created, error: createError } = await supabase
        .from('user_compliance')
        .insert({
          user_id,
          kyc_status: 'unverified',
          sumsub_level: SUMSUB_DEFAULT_LEVEL,
          sumsub_applicant_id: null,
          kyc_started_at: null,
          kyc_reviewed_at: null,
        })
        .select('sumsub_applicant_id, sumsub_level, kyc_status, cooling_off_until, kyc_started_at, kyc_reviewed_at')
        .maybeSingle()

      if (createError || !created) {
        console.error('Failed to create compliance record', { user_id, createError })
        return new Response(
          JSON.stringify({ error: 'Failed to init compliance record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      compliance = created
    }

    // Use provided applicant_id, or fall back to the one already in the compliance table
    const effectiveApplicantId = applicant_id || compliance?.sumsub_applicant_id

    console.log('User data:', { authUserId, effectiveApplicantId, providedApplicantId: applicant_id })

    // Build compliance update object - only existing columns
    const complianceUpdate: Record<string, any> = {}

    // Save applicant ID if provided (and not already in DB)
    if (applicant_id && applicant_id !== compliance?.sumsub_applicant_id) {
      complianceUpdate.sumsub_applicant_id = applicant_id
      complianceUpdate.sumsub_level = SUMSUB_DEFAULT_LEVEL
    }

    // Map review answer to KYC status (prioritize review_answer over review_status)
    if (review_answer) {
      // We have a definitive answer from Sumsub
      if (review_answer === 'GREEN') {
        complianceUpdate.kyc_status = 'approved'
        // Set 24-hour cooling off period
        complianceUpdate.cooling_off_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        complianceUpdate.kyc_reviewed_at = new Date().toISOString()
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
            // Create users table update for verified name
            const usersUpdate = { full_name: verifiedName }
            const { error: usersUpdateError } = await supabase
              .from('users')
              .update(usersUpdate)
              .eq('id', user_id)

            if (usersUpdateError) {
              console.error('Failed to update verified name in users table:', usersUpdateError)
            } else {
              console.log(`Updated full_name to verified name: ${verifiedName}`)
            }
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
        complianceUpdate.kyc_status = isFinalRejection ? 'rejected' : 'resubmission_requested'
        complianceUpdate.kyc_reviewed_at = new Date().toISOString()
        console.log(`Rejection - type: ${review_reject_type}, isFinal: ${isFinalRejection}, status: ${complianceUpdate.kyc_status}`)
      }
    } else if (review_status) {
      // No review answer yet, just status update
      if (review_status === 'init' || review_status === 'pending') {
        complianceUpdate.kyc_status = 'started'
        // Only set kyc_started_at if not already set
        if (!compliance?.kyc_started_at) {
          complianceUpdate.kyc_started_at = new Date().toISOString()
        }
      } else if (review_status === 'onHold') {
        complianceUpdate.kyc_status = 'on_hold'
      } else if (review_status === 'completed') {
        // Completed but no answer - keep as pending
        complianceUpdate.kyc_status = 'pending'
        complianceUpdate.kyc_reviewed_at = new Date().toISOString()
      }
    }

    // Only update if we have something to update
    if (Object.keys(complianceUpdate).length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No updates needed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Updating compliance for user ${user_id}:`, complianceUpdate)

    const { error: updateError } = await supabase
      .from('user_compliance')
      .update(complianceUpdate)
      .eq('user_id', user_id)

    if (updateError) {
      console.error('Failed to update compliance:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Also update full_name in users if we have a verified name
    if (complianceUpdate.full_name) {
      const { error: fullNameUpdateError } = await supabase
        .from('users')
        .update({ full_name: complianceUpdate.full_name })
        .eq('id', user_id)
      if (fullNameUpdateError) {
        console.error('Failed to update users.full_name:', fullNameUpdateError)
      }
    }

    // Also update the auth.users display name if we have a verified name and auth_user_id
    if (complianceUpdate.full_name && authUserId) {
      console.log(`Updating auth.users display name for ${authUserId} to: ${complianceUpdate.full_name}`)
      
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        authUserId,
        { 
          user_metadata: { 
            full_name: complianceUpdate.full_name 
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
      JSON.stringify({ ok: true, updated: complianceUpdate }),
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
