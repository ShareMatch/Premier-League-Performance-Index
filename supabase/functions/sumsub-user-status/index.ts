import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        let user_id: string | null = null
        
        const url = new URL(req.url)
        user_id = url.searchParams.get('user_id')
        
        if (!user_id && req.method === 'POST') {
            const body = await req.json()
            user_id = body.user_id
        }
        
        if (user_id) {
            user_id = String(user_id).trim(); // Sanitize input
        }

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

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            return new Response(
                JSON.stringify({ error: 'Missing Supabase credentials' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        let user: Record<string, any> = {};

        // --- STEP 1: Fetch User Core Data (ONLY fields remaining in the users table) ---
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select(`
                id, 
                auth_user_id 
            `) // sumsub_applicant_id and sumsub_level not selected at this point because we need to fetch them from the user_compliance table
            .eq('id', user_id)
            .limit(1); // Use limit(1) for robustness

        if (userError || !userData || userData.length === 0) {
            console.error('Core User Record not found:', userError)
            return new Response(
                JSON.stringify({ error: 'User not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }
        user = { ...userData[0] };

        // Fetch Compliance Data (from the user_compliance table)
        const { data: complianceData, error: complianceError } = await supabase
            .from('user_compliance')
            .select(`
                sumsub_applicant_id,
                sumsub_level,
                kyc_status, 
                cooling_off_until, 
                kyc_started_at,
                kyc_reviewed_at
            `)
            .eq('user_id', user_id)
            .limit(1);

        if (complianceError || !complianceData || complianceData.length === 0) {
            console.error('Compliance Record missing:', complianceError)
            return new Response(
                JSON.stringify({ error: 'User not found or compliance record missing' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Combine compliance data into the user object
        user = { ...user, ...complianceData[0] };
        
        // --- End of Two-Step Fetch ---
        
        // Check if cooling off period is active
        let okToTrade = false
        let coolingOffActive = false
        
        if (user.kyc_status === 'approved') {
            if (user.cooling_off_until) {
                const coolingOffEnd = new Date(user.cooling_off_until)
                coolingOffActive = coolingOffEnd > new Date()
                okToTrade = !coolingOffActive
            } else {
                okToTrade = true
            }
        }

        // Base response - we'll update can_resubmit after fetching from Sumsub
        const response: Record<string, any> = {
            kyc_status: user.kyc_status || 'unverified',
            ok_to_trade: okToTrade,
            cooling_off_active: coolingOffActive,
            cooling_off_until: user.cooling_off_until,
            has_applicant: !!user.sumsub_applicant_id,
            sumsub_level: user.sumsub_level,
            kyc_started_at: user.kyc_started_at,
            kyc_reviewed_at: user.kyc_reviewed_at,
            can_resubmit: false,
            // Default empty rejection details
            reject_type: null,
            rejection_labels: [],
            rejection_comment: null,
            rejection_button_ids: [],
        }

        // If user is rejected or needs resubmission, fetch rejection details from Sumsub
        if ((user.kyc_status === 'rejected' || user.kyc_status === 'resubmission_requested') 
            && user.sumsub_applicant_id 
            && SUMSUB_APP_TOKEN 
            && SUMSUB_SECRET_KEY) {
            try {
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

                if (statusResponse.ok) {
                    const statusData = await statusResponse.json()
                    const reviewResult = statusData.reviewResult
                    
                    console.log('Sumsub review result:', JSON.stringify(reviewResult))
                    
                    if (reviewResult) {
                        response.reject_type = reviewResult.reviewRejectType || null
                        response.rejection_labels = reviewResult.rejectLabels || []
                        response.rejection_comment = reviewResult.moderationComment || null
                        response.rejection_button_ids = reviewResult.buttonIds || []
                        
                        // Determine can_resubmit based on Sumsub's reviewRejectType
                        response.can_resubmit = reviewResult.reviewRejectType !== 'FINAL'
                        console.log('Can resubmit:', response.can_resubmit, 'reviewRejectType:', reviewResult.reviewRejectType)
                    }
                }
            } catch (err) {
                console.error('Failed to fetch Sumsub rejection details:', err)
                response.can_resubmit = user.kyc_status === 'resubmission_requested'
            }
        }

        return new Response(
            JSON.stringify(response),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err) {
        console.error('User status error:', err)
        return new Response(
            JSON.stringify({ error: err.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})