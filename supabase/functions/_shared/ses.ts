// Generic AWS SES Email Helper for Supabase Edge Functions
// Uses AWS Signature V4 for authentication
// Template-agnostic - just sends emails

export interface SendEmailParams {
  accessKey: string;
  secretKey: string;
  region: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  ok: boolean;
  status: number;
  body: string;
}

/**
 * Send an email via AWS SES
 * This is a generic email sender - use email-templates.ts for specific templates
 */
export async function sendSESEmail({
  accessKey,
  secretKey,
  region,
  from,
  to,
  subject,
  html,
}: SendEmailParams): Promise<SendEmailResult> {
  const host = `email.${region}.amazonaws.com`;
  const endpoint = `https://${host}/v2/email/outbound-emails`;

  const payload = JSON.stringify({
    FromEmailAddress: from,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: html },
        },
      },
    },
  });

  // AWS Signature V4
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // 20250121T120000Z
  const dateStamp = amzDate.substring(0, 8); // 20250121
  const service = "ses";
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const hashedPayload = await sha256Hex(payload);

  const canonicalHeaders =
    `content-type:application/json\nhost:${host}\nx-amz-content-sha256:${hashedPayload}\nx-amz-date:${amzDate}\n`;

  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "POST",
    "/v2/email/outbound-emails",
    "",
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join("\n");

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  const authorizationHeader =
    `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // Make request
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: host,
      "X-Amz-Date": amzDate,
      Authorization: authorizationHeader,
      "X-Amz-Content-Sha256": hashedPayload,
    },
    body: payload,
  });

  const text = await res.text();

  return {
    ok: res.ok,
    status: res.status,
    body: text,
  };
}

// --- Helper functions for AWS Signature V4 ---

async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return bufferToHex(digest);
}

async function hmacHex(key: CryptoKey, data: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return bufferToHex(signature);
}

async function getSignatureKey(
  secret: string,
  date: string,
  region: string,
  service: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  const kDate = await crypto.subtle.importKey(
    "raw",
    encoder.encode("AWS4" + secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  ).then((key) => crypto.subtle.sign("HMAC", key, encoder.encode(date)));

  const kDateKey = await crypto.subtle.importKey("raw", kDate, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kRegion = await crypto.subtle.sign("HMAC", kDateKey, encoder.encode(region));

  const kRegionKey = await crypto.subtle.importKey("raw", kRegion, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kService = await crypto.subtle.sign("HMAC", kRegionKey, encoder.encode(service));

  const kServiceKey = await crypto.subtle.importKey("raw", kService, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const kSigning = await crypto.subtle.sign("HMAC", kServiceKey, encoder.encode("aws4_request"));

  return crypto.subtle.importKey("raw", kSigning, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
