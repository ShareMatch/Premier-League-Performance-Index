import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHmac, timingSafeEqual } from "https://deno.land/std@0.177.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-payload-digest',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Verify webhook signature from Sumsub
function verifyWebhookSignature(body: string, signature: string, secret: string, algorithm: string): boolean {
  try {
    const algoMap: Record<string, string> = {
      'HMAC_SHA1_HEX': 'sha1',
      'HMAC_SHA256_HEX': 'sha256',
      'HMAC_SHA512_HEX': 'sha512',
    }
    
    const algo = algoMap[algorithm] || 'sha256'
    console.log('Using signature algorithm:', algo, 'from header:', algorithm)
    
    const expectedSignature = createHmac(algo, secret)
      .update(body)
      .digest('hex')
    
    const sigBuffer = new TextEncoder().encode(signature)
    const expectedBuffer = new TextEncoder().encode(expectedSignature)
    
    if (sigBuffer.length !== expectedBuffer.length) {
      return false
    }
    
    return timingSafeEqual(sigBuffer, expectedBuffer)
  } catch (err) {
    console.error('Signature verification error:', err)
    return false
  }
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

// Fetch applicant info from Sumsub to get verified name
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
      console.error('Failed to fetch applicant info:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    console.log('Applicant info fetched for name extraction')
    
    // The verified name is in data.info or data.fixedInfo
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
    const SUMSUB_WEBHOOK_SECRET = Deno.env.get('SUMSUB_WEBHOOK_SECRET')
    const SUMSUB_APP_TOKEN = Deno.env.get('SUMSUB_APP_TOKEN')
    const SUMSUB_SECRET_KEY = Deno.env.get('SUMSUB_SECRET_KEY')
    const SUMSUB_BASE_URL = Deno.env.get('SUMSUB_BASE_URL') || 'https://api.sumsub.com'
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUMSUB_WEBHOOK_SECRET) {
      console.error('Missing SUMSUB_WEBHOOK_SECRET')
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
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

    // Get raw body for signature verification
    const bodyText = await req.text()
    const signature = req.headers.get('x-payload-digest') || ''
    const algorithm = req.headers.get('x-payload-digest-alg') || 'HMAC_SHA256_HEX'
    
    console.log('Webhook received - signature header present:', !!signature)

    // Verify signature
    if (!verifyWebhookSignature(bodyText, signature, SUMSUB_WEBHOOK_SECRET, algorithm)) {
      console.error('Invalid webhook signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = JSON.parse(bodyText)
    console.log('Webhook received:', payload.type)

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })

    // Handle applicantReviewed webhook
    if (payload.type === 'applicantReviewed') {
      const { externalUserId, reviewResult, applicantId, levelName } = payload

      if (!externalUserId) {
        console.error('Missing externalUserId in webhook')
        return new Response(
          JSON.stringify({ error: 'Missing externalUserId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get the auth_user_id for updating auth.users later
      const { data: userData, error: userFetchError } = await supabase
        .from('users')
        .select('auth_user_id')
        .eq('id', externalUserId)
        .single()

      if (userFetchError) {
        console.error('Failed to fetch user auth_user_id:', userFetchError)
      }

      const authUserId = userData?.auth_user_id

      // Determine KYC status based on review result
      let kycStatus = 'pending'
      
      if (reviewResult?.reviewAnswer === 'GREEN') {
        kycStatus = 'approved'
      } else if (reviewResult?.reviewAnswer === 'RED') {
        const isFinalRejection = reviewResult?.reviewRejectType === 'FINAL'
        kycStatus = isFinalRejection ? 'rejected' : 'resubmission_requested'
        console.log(`Rejection type: ${reviewResult?.reviewRejectType}, status: ${kycStatus}`)
      }

      console.log(`Updating user ${externalUserId} KYC status to: ${kycStatus}`)

      // Build update data
      const updateData: Record<string, any> = {
        kyc_status: kycStatus,
        sumsub_applicant_id: applicantId,
        kyc_reviewed_at: new Date().toISOString(),
      }

      if (levelName) {
        updateData.sumsub_level = levelName
      }

      // Set cooling off period for approved users (24 hours)
      if (kycStatus === 'approved') {
        updateData.cooling_off_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        
        // Fetch the verified name from Sumsub and update it
        if (SUMSUB_APP_TOKEN && SUMSUB_SECRET_KEY && applicantId) {
          const verifiedName = await fetchApplicantVerifiedName(
            applicantId,
            SUMSUB_APP_TOKEN,
            SUMSUB_SECRET_KEY,
            SUMSUB_BASE_URL
          )
          
          if (verifiedName) {
            updateData.full_name = verifiedName
            console.log(`Updating full_name to verified name: ${verifiedName}`)
          }
        }
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', externalUserId)

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

      console.log(`User ${externalUserId} updated successfully`)
    }

    // Handle applicantCreated webhook
    if (payload.type === 'applicantCreated') {
      const { externalUserId, applicantId, levelName } = payload

      if (externalUserId && applicantId) {
        const updateData: Record<string, any> = { 
          sumsub_applicant_id: applicantId,
          kyc_started_at: new Date().toISOString(),
        }
        
        if (levelName) {
          updateData.sumsub_level = levelName
        }

        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', externalUserId)

        if (updateError) {
          console.error('Failed to save applicant ID:', updateError)
        } else {
          console.log(`Saved applicant ID ${applicantId} for user ${externalUserId}`)
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
