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

    if (!response.ok) {
      console.error("WhatsApp API error:", response.status, responseText);
      return {
        ok: false,
        status: response.status,
        body: responseText,
        error: `WhatsApp API returned ${response.status}`,
      };
    }


    return {
      ok: true,
      status: response.status,
      body: responseText,
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending WhatsApp OTP:", errorMessage);
    return {
      ok: false,
      status: 500,
      error: errorMessage,
    };
  }
}
