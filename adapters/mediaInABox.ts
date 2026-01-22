/**
 * MediaInABox (MyInboxMedia) Adapter
 * Handles WhatsApp WABA API interactions for OTP delivery
 */

const WABA_API_URL = "https://waba.myinboxmedia.in/api/sendwaba";

export interface MediaInABoxMessage {
  ProfileId: string;
  APIKey: string;
  MobileNumber: string;
  templateName: string;
  Parameters: string[];
  isTemplate: string;
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
}

export const mediaInABoxAdapter = {
  /**
   * Send a test message to verify API connectivity
   * Useful for checking if credentials are valid before actual OTP sends
   */
  async testApiConnection(
    profileId: string,
    apiKey: string,
    testPhone: string,
  ): Promise<{ ok: boolean; message: string; details?: any }> {
    try {
      const payload = {
        ProfileId: profileId,
        APIKey: apiKey,
        MobileNumber: testPhone,
        templateName: "test",
        Parameters: ["Test"],
        isTemplate: "true",
        HeaderType: "Text",
        Text: "",
        MediaUrl: "",
        Latitude: 0,
        Longitude: 0,
        ButtonOrListJSON: "",
        SubClientCode: "",
        HeaderParameter: "",
        CTAButtonURLParameter: "",
        CTAButtonURLParameter2: "",
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
        return {
          ok: false,
          message: `API HTTP ${response.status}: ${response.statusText}`,
          details: { status: response.status, body: responseText },
        };
      }

      try {
        const responseJson = JSON.parse(responseText);
        const success =
          responseJson.success === true ||
          responseJson.status === "success" ||
          responseJson.message?.toLowerCase().includes("success");

        return {
          ok: success,
          message: responseJson.message || "Test message sent",
          details: responseJson,
        };
      } catch {
        // If response is not JSON, assume success on 200
        return {
          ok: response.ok,
          message: "Test message sent (non-JSON response)",
          details: { body: responseText },
        };
      }
    } catch (err: any) {
      return {
        ok: false,
        message: `Network error: ${err.message}`,
        details: { error: err },
      };
    }
  },

  /**
   * Validate phone number format for WhatsApp
   * WhatsApp expects: country code + number (e.g., 971508194933)
   */
  validatePhoneFormat(phone: string): {
    valid: boolean;
    formatted?: string;
    error?: string;
  } {
    try {
      // Remove all non-digit characters
      const cleaned = phone.replace(/\D/g, "");

      // Remove leading 00 (alternative international prefix)
      let formatted = cleaned.startsWith("00") ? cleaned.slice(2) : cleaned;

      // WhatsApp numbers should be 10-15 digits (including country code)
      if (formatted.length < 10 || formatted.length > 15) {
        return {
          valid: false,
          error: `Phone number must be 10-15 digits after cleaning. Got: ${formatted.length}`,
        };
      }

      return {
        valid: true,
        formatted,
      };
    } catch (err: any) {
      return {
        valid: false,
        error: `Phone validation error: ${err.message}`,
      };
    }
  },

  /**
   * Format phone number for API submission
   */
  formatPhoneForAPI(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.startsWith("00") ? cleaned.slice(2) : cleaned;
  },

  /**
   * Mask phone number for secure display
   * e.g., +447123456789 -> +44 *** *** ** 89
   */
  maskPhoneForDisplay(phone: string): string {
    if (!phone || phone.length < 4) return phone || "";
    return phone.slice(0, 3) + " *** *** ** " + phone.slice(-2);
  },

  /**
   * Check if phone number appears to be in E.164 format
   * E.164: +[country code][number] or just [country code][number]
   */
  isValidE164Format(phone: string): boolean {
    // E.164 format: +1-201-555-0123 or 12015550123
    const e164Regex = /^(\+)?[1-9]\d{1,14}$/;
    const cleanedPhone = phone.replace(/\D/g, "");
    return e164Regex.test(cleanedPhone);
  },

  /**
   * Get environment variable status for debugging
   */
  getCredentialsStatus(): {
    hasProfileId: boolean;
    hasApiKey: boolean;
    configured: boolean;
  } {
    const profileId = process.env.WABA_PROFILE_ID;
    const apiKey = process.env.WABA_API_KEY;

    return {
      hasProfileId: !!profileId,
      hasApiKey: !!apiKey,
      configured: !!(profileId && apiKey),
    };
  },
};
