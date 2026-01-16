import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { restrictedCors } from "../_shared/cors.ts";

// R2 Configuration - Set these in Supabase Dashboard > Edge Functions > Secrets
const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID") || "";
const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID") || "";
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY") || "";
const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME") || "sharematch-assets";

// AWS Signature V4 implementation for R2 (S3-compatible)
async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

async function sha256(message: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  return kSigning;
}

async function generateSignedUrl(
  objectKey: string,
  expiresInSeconds: number = 300 // Default: 7 days
): Promise<string> {
  const region = "auto"; // R2 uses "auto" for region
  const service = "s3";
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  // Canonical request components
  const method = "GET";
  // Include bucket name in the path: /{bucket}/{object}
  const canonicalUri = "/" + R2_BUCKET_NAME + "/" + encodeURIComponent(objectKey).replace(/%2F/g, "/");
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";

  // Query parameters for presigned URL
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;

  const queryParams = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": expiresInSeconds.toString(),
    "X-Amz-SignedHeaders": signedHeaders,
  });

  // Sort query parameters
  const sortedParams = Array.from(queryParams.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  // Canonical headers
  const canonicalHeaders = `host:${host}\n`;

  // Create canonical request
  const canonicalRequest = [
    method,
    canonicalUri,
    sortedParams,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  // Create string to sign
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join("\n");

  // Calculate signature
  const signingKey = await getSigningKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = toHex(signatureBuffer);

  // Build final URL
  return `${endpoint}${canonicalUri}?${sortedParams}&X-Amz-Signature=${signature}`;
}

Deno.serve(async (req) => {
  const corsHeaders = restrictedCors(req.headers.get('origin'));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate configuration
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      console.error("Missing R2 configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get video name from query params or request body
    let videoName: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      videoName = url.searchParams.get("name");
    } else if (req.method === "POST") {
      const body = await req.json();
      videoName = body.name;
    }

    if (!videoName) {
      return new Response(
        JSON.stringify({ error: "Missing video name parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize video name (prevent path traversal)
    const sanitizedName = videoName.replace(/\.\./g, "").replace(/^\/+/, "");

    // Generate signed URL (valid for 7 days)
    const signedUrl = await generateSignedUrl(sanitizedName, 300);

    console.log(`Generated signed URL for: ${sanitizedName}`);

    return new Response(
      JSON.stringify({
        ok: true,
        url: signedUrl,
        name: sanitizedName,
        expiresIn: "7 days",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating signed URL:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate signed URL" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/* 
=== SETUP INSTRUCTIONS ===

1. Create R2 API Token in Cloudflare Dashboard:
   - Go to R2 > Manage R2 API Tokens
   - Click "Create API token"
   - Select "Object Read only" permission (or Read & Write if needed)
   - Copy the Access Key ID and Secret Access Key

2. Set Edge Function Secrets in Supabase Dashboard:
   - Go to Edge Functions > getVideo > Secrets
   - Add these secrets:
     - R2_ACCOUNT_ID: Your Cloudflare Account ID (found in dashboard URL or Overview page)
     - R2_ACCESS_KEY_ID: The Access Key ID from step 1
     - R2_SECRET_ACCESS_KEY: The Secret Access Key from step 1
     - R2_BUCKET_NAME: Your bucket name (e.g., "tutorial-videos")

3. Deploy the function:
   npx supabase functions deploy getVideo

4. Usage in your React app:
   
   // Fetch signed URL
   const response = await fetch(
     `https://YOUR_PROJECT.supabase.co/functions/v1/getVideo?name=tutorial1.mp4`
   );
   const { url } = await response.json();
   
   // Use in video tag
   <video controls>
     <source src={url} type="video/mp4" />
   </video>

5. To invoke locally for testing:
   curl -i --location --request GET \
     'http://127.0.0.1:54321/functions/v1/getVideo?name=tutorial1.mp4' \
     --header 'Authorization: Bearer YOUR_ANON_KEY'
*/
