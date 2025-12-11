import { supabase } from './supabase';

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface Wallet {
    id: string;
    balance: number; // Stored as cents in DB
    reserved_cents: number;
    available_cents: number;
    currency: string;
}

export interface Position {
    id: string;
    asset_id: string;
    asset_name: string;
    quantity: number;
    average_buy_price: number;
    current_value?: number;
}

export const fetchWallet = async (userId: string) => {
    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) throw error;

    return {
        ...data,
        balance: data.balance / 100,
        reserved: data.reserved_cents / 100,
        available: (data.balance - data.reserved_cents) / 100
    };
};

export const fetchPortfolio = async (userId: string) => {
    const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId);

    if (error) throw error;
    return data as Position[];
};

export const fetchTransactions = async (userId: string) => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const placeTrade = async (
    userId: string,
    assetId: string,
    assetName: string,
    direction: 'buy' | 'sell',
    price: number,
    quantity: number
) => {
    const totalCost = price * quantity;

    const { data, error } = await supabase.rpc('place_trade', {
        p_user_id: userId,
        p_asset_id: assetId,
        p_asset_name: assetName,
        p_direction: direction,
        p_price: price,
        p_quantity: quantity,
        p_total_cost: totalCost
    });

    if (error) throw error;
    return data;
};

/**
 * Get the public user ID from auth user ID
 */
export const getPublicUserId = async (authUserId: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single();

    if (error || !data) {
        return null;
    }
    return data.id;
};

export const subscribeToWallet = (publicUserId: string, callback: (wallet: any) => void) => {
    return supabase
        .channel('wallet-changes')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'wallets',
                filter: `user_id=eq.${publicUserId}`
            },
            (payload) => {
                const data = payload.new as any;
                callback({
                    ...data,
                    balance: data.balance / 100,
                    reserved: data.reserved_cents / 100,
                    available: (data.balance - data.reserved_cents) / 100
                });
            }
        )
        .subscribe();
};

export const subscribeToPortfolio = (publicUserId: string, callback: () => void) => {
    return supabase
        .channel('portfolio-changes')
        .on(
            'postgres_changes',
            {
                event: '*', // Listen for INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'positions',
                filter: `user_id=eq.${publicUserId}`
            },
            () => {
                callback();
            }
        )
        .subscribe();
};

export const fetchAssets = async () => {
    const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('id', { ascending: true });

    if (error) throw error;
    return data;
};

export const subscribeToAssets = (callback: () => void) => {
    return supabase
        .channel('assets-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'assets'
            },
            () => {
                callback();
            }
        )
        .subscribe();
};

// ============================================
// AUTH API - Registration & Verification
// ============================================

const SUPABASE_URL = 'https://hsmfanlcebcphogqqyzj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbWZhbmxjZWJjcGhvZ3FxeXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTQ0MTQsImV4cCI6MjA3Mzk5MDQxNH0.9rdYuJjECPhuscZoSE7ROVMPf3bpHuwHtx0vMQbOFvg';

export interface RegistrationData {
    full_name: string;
    email: string;
    phone: string;
    whatsapp_phone?: string;
    dob: string;
    country_of_residence: string;
    password: string;
    referral_code?: string | null;
    receive_otp_sms: boolean;
    agree_to_terms: boolean;
}

export interface RegistrationResponse {
    ok: boolean;
    user_id: string;
    auth_user_id: string;
    email: string;
    requires_verification: boolean;
    message: string;
}

export interface ApiError {
    error: string;
    duplicates?: string[];
    message?: string;
    details?: string;
}

/**
 * Register a new user via the Supabase Edge Function
 */
export const registerUser = async (data: RegistrationData): Promise<RegistrationResponse> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
        const error = result as ApiError;
        throw new RegistrationError(
            error.message || error.error || 'Registration failed',
            error.duplicates,
            response.status
        );
    }

    return result as RegistrationResponse;
};

/**
 * Custom error class for registration errors
 */
export class RegistrationError extends Error {
    duplicates?: string[];
    statusCode: number;

    constructor(message: string, duplicates?: string[], statusCode: number = 500) {
        super(message);
        this.name = 'RegistrationError';
        this.duplicates = duplicates;
        this.statusCode = statusCode;
    }
}

// ============================================
// EMAIL VERIFICATION API
// ============================================

export interface SendOtpResponse {
    ok: boolean;
    message: string;
}

export interface VerifyOtpResponse {
    ok: boolean;
    message: string;
    nextStep?: 'whatsapp' | 'dashboard';
    whatsappData?: {
        masked: string;
        raw: string;
    };
}

/**
 * Send OTP verification code to email
 */
export const sendEmailOtp = async (email: string): Promise<SendOtpResponse> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email-otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to send verification code');
    }

    return result as SendOtpResponse;
};

/**
 * Verify OTP code for email
 */
export const verifyEmailOtp = async (email: string, token: string): Promise<VerifyOtpResponse> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-email-otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, token }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || result.message || 'Verification failed');
    }

    return result as VerifyOtpResponse;
};

// ============================================
// WHATSAPP VERIFICATION API
// ============================================

export interface SendWhatsAppOtpResponse {
    ok: boolean;
    message: string;
    maskedPhone?: string;
}

export interface VerifyWhatsAppOtpResponse {
    ok: boolean;
    message: string;
    nextStep?: 'login' | 'dashboard';
}

/**
 * Send OTP verification code to WhatsApp
 * Can identify user by either phone number or email
 */
export const sendWhatsAppOtp = async (params: { phone?: string; email?: string }): Promise<SendWhatsAppOtpResponse> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to send WhatsApp verification code');
    }

    return result as SendWhatsAppOtpResponse;
};

/**
 * Verify OTP code for WhatsApp
 * Can identify user by either phone number or email
 */
export const verifyWhatsAppOtp = async (params: { phone?: string; email?: string; token: string }): Promise<VerifyWhatsAppOtpResponse> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-whatsapp-otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || result.message || 'WhatsApp verification failed');
    }

    return result as VerifyWhatsAppOtpResponse;
};

// ============================================
// UPDATE EMAIL API (during verification)
// ============================================

export interface UpdateEmailResponse {
    ok: boolean;
    message: string;
    newEmail?: string;
}

/**
 * Update user's email during verification flow
 * Updates in both auth.users and public.users, then sends new OTP
 */
export const updateUserEmail = async (currentEmail: string, newEmail: string): Promise<UpdateEmailResponse> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/update-user-email`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ currentEmail, newEmail }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to update email');
    }

    return result as UpdateEmailResponse;
};

// ============================================
// UPDATE WHATSAPP API (during verification)
// ============================================

export interface UpdateWhatsAppResponse {
    ok: boolean;
    message: string;
    newWhatsappPhone?: string;
}

/**
 * Update user's WhatsApp phone during verification flow
 * Updates in public.users, then sends new OTP
 */
export const updateUserWhatsApp = async (email: string, newWhatsappPhone: string): Promise<UpdateWhatsAppResponse> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/update-user-whatsapp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, newWhatsappPhone }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to update WhatsApp number');
    }

    return result as UpdateWhatsAppResponse;
};

// ============================================
// UPDATE USER PROFILE API (comprehensive update)
// ============================================

export interface UpdateProfilePayload {
    currentEmail: string;
    newEmail?: string;
    fullName?: string;
    dob?: string;
    countryOfResidence?: string;
    phone?: string;
    whatsappPhone?: string;
    sendEmailOtp?: boolean;
    sendWhatsAppOtp?: boolean;
}

export interface UpdateProfileResponse {
    ok: boolean;
    message: string;
    emailChanged?: boolean;
    whatsappChanged?: boolean;
    emailOtpSent?: boolean;
    whatsappOtpSent?: boolean;
    newEmail?: string;
    newWhatsappPhone?: string;
}

/**
 * Update user profile - comprehensive update for multiple fields
 * Can be used during verification or from profile settings
 * Handles email/phone changes with verification reset
 */
export const updateUserProfile = async (payload: UpdateProfilePayload): Promise<UpdateProfileResponse> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/update-user-profile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to update profile');
    }

    return result as UpdateProfileResponse;
};

// ============================================
// FORGOT PASSWORD API
// ============================================

export interface ForgotPasswordResponse {
    ok: boolean;
    message: string;
}

/**
 * Request a password reset email
 * Always returns success to prevent email enumeration
 */
export const requestPasswordReset = async (email: string): Promise<ForgotPasswordResponse> => {
    // Pass the current origin so the reset link redirects back to the correct app URL
    const redirectUrl = window.location.origin;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/forgot-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, redirectUrl }),
    });

    const result = await response.json();

    // We always return success for security (don't reveal if email exists)
    return result as ForgotPasswordResponse;
};

// ============================================
// LOGIN API
// ============================================

export interface LoginResponse {
    success: boolean;
    message: string;
    user?: {
        id: string;
        email: string;
    };
    session?: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        token_type: string;
    };
    // Verification required fields
    requiresVerification?: boolean;
    verificationType?: 'email' | 'whatsapp';
    email?: string;
    whatsappData?: {
        masked: string;
        raw: string;
    };
}

/**
 * Login user via edge function
 * Validates email/WhatsApp verification before allowing login
 */
export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    // For verification required responses (403), we don't throw - we return the response
    // so the UI can handle showing the appropriate verification modal
    if (response.status === 403 && result.requiresVerification) {
        return result as LoginResponse;
    }

    if (!response.ok) {
        throw new Error(result.message || result.error || 'Login failed');
    }

    return result as LoginResponse;
};

// ============================================
// CHECK EMAIL VERIFICATION STATUS API
// ============================================

export interface CheckEmailStatusResponse {
    exists: boolean;
    emailVerified: boolean;
    whatsappVerified: boolean;
    fullyVerified: boolean;
}

/**
 * Check if an email exists and its verification status
 * Used to prevent duplicate registrations for fully verified accounts
 */
export const checkEmailVerificationStatus = async (email: string): Promise<CheckEmailStatusResponse> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/check-email-status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (!response.ok) {
        // If endpoint doesn't exist or returns error, assume email doesn't exist
        return {
            exists: false,
            emailVerified: false,
            whatsappVerified: false,
            fullyVerified: false,
        };
    }

    return result as CheckEmailStatusResponse;
};