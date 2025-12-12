/**
 * WhatsApp OTP Module - MediaInABox (MIM) API
 * Uses MyInboxMedia WABA API to send OTP messages
 */

const WABA_API_URL = "https://waba.myinboxmedia.in/api/sendwaba";

export interface SendWhatsAppOtpParams {
  mobileNumber: string;  // Phone number without + prefix (e.g., "971508194933")
  otpCode: string;
  profileId: string;
  apiKey: string;
}

export interface WhatsAppApiResponse {
  ok: boolean;
  status: number;
  body?: string;
  error?: string;
}

/**
 * Format phone number for WhatsApp API
 * Removes + prefix and any non-digit characters
 * WhatsApp API typically expects: country code + number (no + prefix)
 * e.g., +1 234 567 8901 → 12345678901
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters (including +)
  let cleaned = phone.replace(/\D/g, '');

  // If the number starts with '00', remove it (international prefix)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }

  return cleaned;
}

/**
 * Mask phone number for display
 * e.g., +447123456789 -> +44 *** *** ** 89
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone || "";
  return phone.slice(0, 3) + " *** *** ** " + phone.slice(-2);
}

/**
 * Send OTP via MediaInABox WhatsApp Business API
 */
export async function sendWhatsAppOtp(params: SendWhatsAppOtpParams): Promise<WhatsAppApiResponse> {
  const { mobileNumber, otpCode, profileId, apiKey } = params;

  try {
    const payload = {
      ProfileId: profileId,
      APIKey: apiKey,
      MobileNumber: mobileNumber,
      templateName: "sharematchauth",
      Parameters: [otpCode],
      HeaderType: "Text",
      Text: "",
      MediaUrl: "",
      Latitude: 0,
      Longitude: 0,
      isTemplate: "true",
      ButtonOrListJSON: "",
      SubClientCode: "",
      HeaderParameter: "",
      CTAButtonURLParameter: "",
      CTAButtonURLParameter2: ""
    };

    const response = await fetch(WABA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    // Check HTTP status first
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        body: responseText,
        error: `WhatsApp API HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Check for actual delivery success, not just HTTP status
    let deliveryConfirmed = false;
    let deliveryError = null;

    try {
      const responseJson = JSON.parse(responseText);

      // Check for explicit success indicators
      if (responseJson.success === true ||
          responseJson.status === 'success' ||
          responseJson.status === 'delivered' ||
          responseJson.message?.toLowerCase().includes('success') ||
          responseJson.message?.toLowerCase().includes('delivered') ||
          responseJson.message?.toLowerCase().includes('sent')) {
        deliveryConfirmed = true;
      }

      // Check for failure indicators
      const hasError = responseJson.error ||
                      responseJson.status === 'error' ||
                      responseJson.status === 'failed' ||
                      responseJson.success === false ||
                      responseJson.message?.toLowerCase().includes('error') ||
                      responseJson.message?.toLowerCase().includes('failed') ||
                      responseJson.message?.toLowerCase().includes('invalid') ||
                      responseJson.message?.toLowerCase().includes('rejected') ||
                      responseJson.message?.toLowerCase().includes('blocked');

      if (hasError) {
        deliveryError = responseJson.error || responseJson.message || 'API reported failure';
      }

    } catch (parseErr) {
      // Response is not JSON, check for text-based success/failure
      const successIndicators = ['success', 'delivered', 'sent', 'queued', 'accepted'];
      const errorIndicators = ['error', 'failed', 'invalid', 'unauthorized', 'forbidden', 'rejected', 'blocked'];

      const hasSuccessText = successIndicators.some(word => responseText.toLowerCase().includes(word));
      const hasErrorText = errorIndicators.some(word => responseText.toLowerCase().includes(word));

      if (hasSuccessText && !hasErrorText) {
        deliveryConfirmed = true;
      } else if (hasErrorText) {
        deliveryError = `Text error detected: ${responseText.substring(0, 100)}`;
      }
    }

    // If HTTP is ok but no delivery confirmation and no explicit error, assume success
    // This handles APIs that return generic success responses
    if (response.ok && !deliveryError && !deliveryConfirmed) {
      // For WhatsApp APIs, 200 status typically means accepted for delivery
      // We'll trust the HTTP status unless we detect explicit errors
      deliveryConfirmed = true;
    }

    if (deliveryError) {
      return {
        ok: false,
        status: response.status,
        body: responseText,
        error: deliveryError,
      };
    }

    return {
      ok: true,
      status: response.status,
      body: responseText,
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      ok: false,
      status: 500,
      error: `Network error: ${errorMessage}`,
    };
  }
}
