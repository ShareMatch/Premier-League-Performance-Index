// Email Templates for ShareMatch
// Separate templates for different email types

export interface OtpEmailParams {
  logoImageUrl: string;
  userFullName: string;
  otpCode: string;
  expiryMinutes: number;
}

export interface ForgotPasswordEmailParams {
  logoImageUrl: string;
  userFullName: string;
  resetLink: string;
  expiryMinutes: number;
}

/**
 * Generate OTP verification email HTML
 */
export function generateOtpEmailHtml(params: OtpEmailParams): string {
  const { logoImageUrl, userFullName, otpCode, expiryMinutes } = params;
  const expiryText = `${expiryMinutes} minute${expiryMinutes !== 1 ? 's' : ''}`;
  
  return OTP_VERIFICATION_TEMPLATE
    .replace(/##LOGO_IMAGE_URL##/g, logoImageUrl)
    .replace(/##USER_FULL_NAME##/g, userFullName || "Valued User")
    .replace(/##OTP_CODE##/g, otpCode)
    .replace(/##EXPIRY_TIME##/g, expiryText);
}

/**
 * Generate OTP verification email subject
 */
export function generateOtpEmailSubject(otpCode: string): string {
  return `${otpCode} is your ShareMatch verification code`;
}

/**
 * Generate forgot password email HTML (legacy - with personalization)
 */
export function generateForgotPasswordEmailHtml(params: ForgotPasswordEmailParams): string {
  const { logoImageUrl, userFullName, resetLink, expiryMinutes } = params;
  const expiryText = `${expiryMinutes} minute${expiryMinutes !== 1 ? 's' : ''}`;
  
  return FORGOT_PASSWORD_TEMPLATE
    .replace(/##LOGO_IMAGE_URL##/g, logoImageUrl)
    .replace(/##USER_FULL_NAME##/g, userFullName || "Valued User")
    .replace(/##RESET_LINK##/g, resetLink)
    .replace(/##EXPIRY_TIME##/g, expiryText);
}

/**
 * Generate forgot password email subject
 */
export function generateForgotPasswordEmailSubject(): string {
  return `Reset your ShareMatch password`;
}

/**
 * Build password reset email HTML - simplified version with magic link
 */
export function buildResetEmailHTML(magicLink: string, logoImageUrl?: string): string {
  const logoUrl = logoImageUrl || "https://rwa.sharematch.me/logos/mobile-header-logo-matched.png";
  return PASSWORD_RESET_TEMPLATE
    .replace(/\${magicLink}/g, magicLink)
    .replace(/##LOGO_IMAGE_URL##/g, logoUrl);
}

// ============================================
// EMAIL TEMPLATES
// ============================================

// ShareMatch branded OTP verification email template
const OTP_VERIFICATION_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ShareMatch Verification Code</title>
    <style>
        /* Base styles for email clients */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #FFFFFF;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            line-height: 1.6;
            padding: 20px 0;
        }

        /* Solid Background */
        .gradient-bg {
            background-color: #005430;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
        }

        /* Main Container */
        .container {
            max-width: 600px;
            width: 100%;
            border-radius: 12px;
            overflow: hidden;
            text-align: left;
            margin: 0 auto;
            box-sizing: border-box;
        }

        /* Outer wrapper table */
        table[role="presentation"] {
            width: 100%;
            height: auto;
        }

        /* Text Colors */
        .text-light { color: #FFFFFF; }
        .text-highlight { color: #1acc79; }

        /* Logo Section */
        .logo-section {
            padding-top: 20px;
            padding-bottom: 20px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .logo-image {
            max-width: 280px;
            width: 100%;
            height: auto;
        }

        /* Content Padding */
        .content {
            padding: 25px 40px 25px 40px;
        }

        .content p {
            color: #FFFFFF !important;
        }

        /* OTP Box Styling */
        .otp-box-wrapper {
            padding: 15px 0;
            margin: 20px 0;
            text-align: center;
        }

        .single-otp-box {
            display: inline-block;
            font-size: 32px;
            font-weight: 800;
            color: #064e3b;
            padding: 15px 35px;
            border-radius: 8px;
            letter-spacing: 4px;
            text-align: center;
            background-color: #FFFFFF;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }

        /* Warning/Footer Text */
        .warning {
            font-size: 14px;
            text-align: center;
            color: #FFFFFF !important;
        }

        .footer {
            padding: 20px 40px;
            text-align: center;
            font-size: 14px;
            color: #FFFFFF;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 0 0 12px 12px;
        }

        /* ========== COMPREHENSIVE RESPONSIVE DESIGN ========== */

        /* Mobile S - 320px */
        @media only screen and (max-width: 320px) {
            body {
                padding: 10px !important;
            }
            .container {
                border-radius: 8px !important;
                width: calc(100% - 20px) !important;
                max-width: calc(100% - 20px) !important;
                margin: 0 10px !important;
            }
            table[role="presentation"] {
                min-height: auto !important;
            }
            .content, .footer {
                padding: 15px 10px !important;
            }
            .logo-section {
                padding-top: 12px !important;
                padding-bottom: 12px !important;
            }
            .logo-image {
                max-width: 160px !important;
                width: 160px !important;
            }
            .otp-box-wrapper {
                padding: 8px 0 !important;
                margin: 15px 0 !important;
            }
            .single-otp-box {
                font-size: 20px !important;
                padding: 10px 20px !important;
                letter-spacing: 1px !important;
            }
            .content p {
                font-size: 13px !important;
                line-height: 1.4 !important;
            }
            .content h2 {
                font-size: 18px !important;
            }
            .warning {
                font-size: 11px !important;
            }
        }

        /* Mobile M - 375px */
        @media only screen and (min-width: 321px) and (max-width: 375px) {
            body {
                padding: 10px !important;
            }
            .container {
                border-radius: 8px !important;
                width: calc(100% - 20px) !important;
                max-width: calc(100% - 20px) !important;
                margin: 0 10px !important;
            }
            table[role="presentation"] {
                min-height: auto !important;
            }
            .content, .footer {
                padding: 18px 12px !important;
            }
            .logo-section {
                padding-top: 15px !important;
                padding-bottom: 15px !important;
            }
            .logo-image {
                max-width: 180px !important;
                width: 180px !important;
            }
            .otp-box-wrapper {
                padding: 10px 0 !important;
                margin: 15px 0 !important;
            }
            .single-otp-box {
                font-size: 22px !important;
                padding: 11px 22px !important;
                letter-spacing: 2px !important;
            }
            .content p {
                font-size: 14px !important;
            }
            .content h2 {
                font-size: 19px !important;
            }
            .warning {
                font-size: 12px !important;
            }
        }

        /* Mobile L - 425px */
        @media only screen and (min-width: 376px) and (max-width: 425px) {
            body {
                padding: 15px !important;
            }
            .container {
                border-radius: 8px !important;
                width: calc(100% - 30px) !important;
                max-width: calc(100% - 30px) !important;
                margin: 0 15px !important;
            }
            table[role="presentation"] {
                min-height: auto !important;
            }
            .content, .footer {
                padding: 20px 15px !important;
            }
            .logo-section {
                padding-top: 15px !important;
                padding-bottom: 15px !important;
            }
            .logo-image {
                max-width: 200px !important;
                width: 200px !important;
            }
            .otp-box-wrapper {
                padding: 10px 0 !important;
                margin: 18px 0 !important;
            }
            .single-otp-box {
                font-size: 24px !important;
                padding: 12px 25px !important;
                letter-spacing: 2px !important;
            }
            .content p {
                font-size: 14px !important;
            }
            .content h2 {
                font-size: 20px !important;
            }
        }

        /* Tablet & iPad (768px) - Portrait */
        @media only screen and (min-width: 426px) and (max-width: 768px) {
            body {
                padding: 20px !important;
            }
            .container {
                border-radius: 8px !important;
                width: 95% !important;
                max-width: 600px !important;
            }
            table[role="presentation"] {
                min-height: auto !important;
            }
            .content, .footer {
                padding: 22px 25px !important;
            }
            .logo-section {
                padding-top: 18px !important;
                padding-bottom: 18px !important;
            }
            .logo-image {
                max-width: 240px !important;
                width: 240px !important;
            }
            .otp-box-wrapper {
                padding: 12px 0 !important;
                margin: 18px 0 !important;
            }
            .single-otp-box {
                font-size: 26px !important;
                padding: 13px 28px !important;
                letter-spacing: 3px !important;
            }
            .content p {
                font-size: 15px !important;
            }
            .content h2 {
                font-size: 21px !important;
            }
        }

        /* iPad Air, iPad Pro (Portrait) - 820px to 1024px */
        @media only screen and (min-width: 769px) and (max-width: 1024px) {
            body {
                padding: 30px 20px !important;
            }
            .container {
                border-radius: 10px !important;
                width: 90% !important;
                max-width: 600px !important;
            }
            table[role="presentation"] {
                min-height: auto !important;
            }
            .content, .footer {
                padding: 24px 35px !important;
            }
            .logo-section {
                padding-top: 20px !important;
                padding-bottom: 20px !important;
            }
            .logo-image {
                max-width: 280px !important;
                width: 280px !important;
            }
            .otp-box-wrapper {
                padding: 14px 0 !important;
                margin: 20px 0 !important;
            }
            .single-otp-box {
                font-size: 28px !important;
                padding: 14px 30px !important;
                letter-spacing: 3px !important;
            }
            .content p {
                font-size: 15px !important;
            }
            .content h2 {
                font-size: 21px !important;
            }
        }

        /* Laptop - 1024px to 1440px */
        @media only screen and (min-width: 1025px) and (max-width: 1440px) {
            .container {
                border-radius: 12px !important;
                width: 600px !important;
                max-width: 600px !important;
            }
            .content, .footer {
                padding: 25px 40px !important;
            }
            .logo-section {
                padding-top: 20px !important;
                padding-bottom: 20px !important;
            }
            .logo-image {
                max-width: 320px !important;
                width: 320px !important;
            }
            .otp-box-wrapper {
                padding: 15px 0 !important;
                margin: 20px 0 !important;
            }
            .single-otp-box {
                font-size: 30px !important;
                padding: 15px 35px !important;
                letter-spacing: 4px !important;
            }
        }

        /* Large Desktop - 1440px to 2560px */
        @media only screen and (min-width: 1441px) and (max-width: 2560px) {
            .container {
                border-radius: 12px !important;
                width: 600px !important;
                max-width: 600px !important;
            }
            .content, .footer {
                padding: 25px 40px !important;
            }
            .logo-image {
                max-width: 320px !important;
                width: 320px !important;
            }
        }

        /* 4K and Ultra Wide - 2560px+ */
        @media only screen and (min-width: 2561px) {
            .container {
                border-radius: 12px !important;
                width: 600px !important;
                max-width: 600px !important;
            }
            .content, .footer {
                padding: 25px 40px !important;
            }
            .logo-image {
                max-width: 320px !important;
                width: 320px !important;
            }
        }
    </style>
</head>
<body style="font-family: 'Inter', sans-serif; background-color: #FFFFFF; margin: 0; padding: 20px 0;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #FFFFFF; margin: 0; padding: 0;">
        <tr>
            <td style="height: 10px; font-size: 10px; line-height: 10px;">&nbsp;</td>
        </tr>
        <tr>
            <td align="center">
                <table class="container gradient-bg" width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; width: 100%; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5); background-color: #005430;">
                    <!-- Logo Section -->
                    <tr>
                        <td align="center" class="logo-section" style="padding-top: 20px; padding-bottom: 20px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
                            <img src="##LOGO_IMAGE_URL##" alt="ShareMatch Logo" class="logo-image" style="display: block; margin: 0 auto; max-width: 280px; height: auto;" onerror="this.style.display='none';">
                        </td>
                    </tr>
                    <!-- Content Section -->
                    <tr>
                        <td class="content" style="padding: 25px 40px 25px 40px; color: #FFFFFF; font-size: 18px;">
                            <h2 style="margin: 0 0 20px; font-size: 26px; color: #FFFFFF; text-align: center;">
                                Email Verification
                            </h2>

                            <p style="margin-bottom: 30px; font-size: 18px; color: #FFFFFF; text-align: center;">
                                We received a request to verify the email address associated with this account. If you made this request, use the verification code below:
                            </p>

                            <div class="otp-box-wrapper" style="padding: 15px 0; margin: 20px 0; text-align: center;">
                                <span class="single-otp-box" style="
                                    display: inline-block;
                                    font-size: 24px;
                                    font-weight: 700;
                                    color: #064e3b;
                                    padding: 15px 35px;
                                    border-radius: 8px;
                                    text-align: center;
                                    background-color: #FFFFFF;
                                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                                    text-decoration: none;"
                                >
                                    ##OTP_CODE##
                                </span>
                            </div>

                            <p style="margin-bottom: 5px; font-size: 18px; color: #FFFFFF; text-align: center;">
                                For your security, this code will expire in <span class="text-highlight" style="font-weight: 700; color: #1acc79;">##EXPIRY_TIME##</span>.
                            </p>
                            <p style="margin-top: 16px; font-size: 18px; color: #FFFFFF; text-align: center;">
                                If you did not request email verification, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer Section -->
                    <tr>
                        <td class="footer" style="padding: 20px 40px; text-align: center; font-size: 18px; color: #FFFFFF; border-top: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0 0 12px 12px;">
                            <p style="margin: 0; font-size: 18px; color: #FFFFFF;">&copy; 2025 ShareMatch. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="height: 10px; font-size: 10px; line-height: 10px;">&nbsp;</td>
        </tr>
    </table>
</body>
</html>`;

// ShareMatch branded forgot password email template
const FORGOT_PASSWORD_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your ShareMatch Password</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #FFFFFF;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            line-height: 1.6;
            padding: 20px 0;
        }
        .gradient-bg {
            background-color: #005430;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
        }
        .container { max-width: 600px; width: 100%; border-radius: 12px; overflow: hidden; text-align: left; margin: 0 auto; }
        table[role="presentation"] { width: 100%; height: auto; }
        .text-light { color: #FFFFFF; }
        .text-highlight { color: #1acc79; }
        .logo-section { padding-top: 20px; padding-bottom: 20px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.2); }
        .logo-image { max-width: 280px; width: 100%; height: auto; max-height: 80px; }
        .content { padding: 25px 40px 25px 40px; }
        .content p { color: #FFFFFF !important; }
        .reset-button {
            display: inline-block;
            background-color: #10b981;
            color: #FFFFFF !important;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        .reset-button:hover { opacity: 0.9; }
        .footer { padding: 20px 40px; text-align: center; font-size: 14px; color: #FFFFFF; border-top: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0 0 12px 12px; }
        
        /* Responsive */
        @media only screen and (max-width: 425px) {
            body { padding: 10px !important; }
            .container { border-radius: 8px !important; width: calc(100% - 20px) !important; margin: 0 10px !important; }
            .content, .footer { padding: 15px 15px !important; }
            .logo-image { max-width: 180px !important; width: 180px !important; }
            .content p { font-size: 14px !important; }
            .reset-button { padding: 12px 24px !important; font-size: 16px !important; }
        }
        @media only screen and (min-width: 426px) and (max-width: 768px) {
            .container { width: 95% !important; max-width: 600px !important; }
            .logo-image { max-width: 240px !important; width: 240px !important; }
        }
    </style>
</head>
<body style="font-family: 'Inter', sans-serif; background-color: #FFFFFF; margin: 0; padding: 20px 0;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #FFFFFF; margin: 0; padding: 0;">
        <tr><td style="height: 10px; font-size: 10px; line-height: 10px;">&nbsp;</td></tr>
        <tr>
            <td align="center">
                <table class="container gradient-bg" width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; width: 100%; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5); background-color: #005430;">
                    <tr>
                        <td align="center" class="logo-section" style="padding-top: 20px; padding-bottom: 20px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
                            <img src="##LOGO_IMAGE_URL##" alt="ShareMatch Logo" class="logo-image" style="display: block; margin: 0 auto; max-width: 280px; height: auto;" onerror="this.style.display='none';">
                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="padding: 25px 40px 25px 40px; color: #FFFFFF; font-size: 18px;">
                            <h2 style="margin: 0 0 20px; font-size: 26px; color: #FFFFFF; text-align: center;">
                                Reset Your Password
                            </h2>
                            
                            <p class="greeting" style="font-weight: 600; margin-top: 0; margin-bottom: 15px; font-size: 18px; color: #FFFFFF;">Dear ##USER_FULL_NAME##,</p>
                            <p style="margin-bottom: 20px; font-size: 18px; color: #FFFFFF; text-align: center;">
                                We received a request to reset your ShareMatch account password. Click the button below to create a new password.
                            </p>
                            
                            <div style="padding: 20px 0; margin: 10px 0; text-align: center;">
                                <a href="##RESET_LINK##" class="reset-button" style="
                                    display: inline-block;
                                    background-color: #10b981;
                                    color: #FFFFFF;
                                    text-decoration: none;
                                    padding: 16px 40px;
                                    border-radius: 8px;
                                    font-size: 18px;
                                    font-weight: 700;
                                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);"
                                >
                                    Reset Password
                                </a>
                            </div>
                            
                            <p class="warning" style="margin-bottom: 4px; color: #FFFFFF; font-size: 16px; text-align: center;">
                                This link is valid for <span class="text-highlight" style="font-weight: 700; color: #1acc79;">##EXPIRY_TIME##</span>.
                            </p>
                            <p style="margin-top: 16px; font-size: 16px; text-align: center; color: #FFFFFF;">
                                If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                            </p>
                            
                            <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                                <p style="font-size: 14px; color: #FFFFFF; margin: 0;">
                                    <strong>Can't click the button?</strong> Copy and paste this link into your browser:<br>
                                    <span style="color: #1acc79; word-break: break-all;">##RESET_LINK##</span>
                                </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td class="footer" style="padding: 20px 40px; text-align: center; font-size: 18px; color: #FFFFFF; border-top: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0 0 12px 12px;">
                            <p style="margin: 0; font-size: 18px; color: #FFFFFF;">&copy; 2025 ShareMatch. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr><td style="height: 10px; font-size: 10px; line-height: 10px;">&nbsp;</td></tr>
    </table>
</body>
</html>`;

// ShareMatch Password Reset Email Template with Gradient Design (simplified version)
const PASSWORD_RESET_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Email - ShareMatch</title>
    <style>
        /* Base styles for email clients */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #FFFFFF;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            line-height: 1.6;
            padding: 20px 0;
        }

        /* Solid Background */
        .gradient-bg {
            background-color: #005430;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
        }
        
        /* Main Container */
        .container {
            max-width: 600px;
            width: 100%;
            border-radius: 12px;
            overflow: hidden;
            text-align: left;
            margin: 0 auto;
            box-sizing: border-box;
        }
        
        /* Outer wrapper table */
        table[role="presentation"] {
            width: 100%;
            height: auto;
        }
        
        /* Text Colors */
        .text-light { color: #FFFFFF; }
        .text-highlight { color: #1acc79; }
        
        /* Logo Section */
        .logo-section {
            padding-top: 20px;
            padding-bottom: 20px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .logo-image {
            max-width: 320px;
            width: 320px;
            height: auto;
        }
        
        /* Content Padding */
        .content {
            padding: 25px 40px 25px 40px;
        }
        
        .content p {
            color: #FFFFFF !important;
        }
        .content h2 {
            color: #FFFFFF !important;
        }
        
        /* Button Box Styling (similar to OTP box) */
        .button-box-wrapper {
            padding: 15px 0;
            margin: 20px 0;
            text-align: center;
        }
        
        .reset-button {
            display: inline-block;
            font-size: 18px;
            font-weight: 700;
            color: #064e3b;
            padding: 15px 35px;
            border-radius: 8px;
            text-align: center;
            background-color: #FFFFFF;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            text-decoration: none;
        }
        .reset-button:hover {
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
        }
        
        /* Warning/Footer Text */
        .warning {
            font-size: 14px;
            text-align: center;
            color: #FFFFFF !important;
        }
        
        .footer {
            padding: 20px 40px;
            text-align: center;
            font-size: 14px;
            color: #FFFFFF;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 0 0 12px 12px;
        }
        
        /* ========== COMPREHENSIVE RESPONSIVE DESIGN ========== */
        
        /* Mobile S - 320px */
        @media only screen and (max-width: 320px) {
            body {
                padding: 10px !important;
            }
            .container {
                border-radius: 8px !important;
                width: calc(100% - 20px) !important;
                max-width: calc(100% - 20px) !important;
                margin: 0 10px !important;
            }
            table[role="presentation"] {
                min-height: auto !important;
            }
            .content, .footer {
                padding: 15px 10px !important;
            }
            .logo-section {
                padding-top: 12px !important;
                padding-bottom: 12px !important;
            }
            .logo-image {
                max-width: 160px !important;
                width: 160px !important;
            }
            .button-box-wrapper {
                padding: 8px 0 !important;
                margin: 15px 0 !important;
            }
            .reset-button {
                font-size: 14px !important;
                padding: 10px 20px !important;
            }
            .content p {
                font-size: 13px !important;
                line-height: 1.4 !important;
            }
            .content h2 {
                font-size: 18px !important;
            }
            .warning {
                font-size: 11px !important;
            }
        }
        
        /* Mobile M - 375px */
        @media only screen and (min-width: 321px) and (max-width: 375px) {
            body {
                padding: 10px !important;
            }
            .container {
                border-radius: 8px !important;
                width: calc(100% - 20px) !important;
                max-width: calc(100% - 20px) !important;
                margin: 0 10px !important;
            }
            table[role="presentation"] {
                min-height: auto !important;
            }
            .content, .footer {
                padding: 18px 12px !important;
            }
            .logo-section {
                padding-top: 15px !important;
                padding-bottom: 15px !important;
            }
            .logo-image {
                max-width: 180px !important;
                width: 180px !important;
            }
            .button-box-wrapper {
                padding: 10px 0 !important;
                margin: 15px 0 !important;
            }
            .reset-button {
                font-size: 15px !important;
                padding: 11px 22px !important;
            }
            .content p {
                font-size: 14px !important;
            }
            .content h2 {
                font-size: 19px !important;
            }
            .warning {
                font-size: 12px !important;
            }
        }
        
        /* Mobile L - 425px */
        @media only screen and (min-width: 376px) and (max-width: 425px) {
            body {
                padding: 15px !important;
            }
            .container {
                border-radius: 8px !important;
                width: calc(100% - 30px) !important;
                max-width: calc(100% - 30px) !important;
                margin: 0 15px !important;
            }
            table[role="presentation"] {
                min-height: auto !important;
            }
            .content, .footer {
                padding: 20px 15px !important;
            }
            .logo-section {
                padding-top: 15px !important;
                padding-bottom: 15px !important;
            }
            .logo-image {
                max-width: 200px !important;
                width: 200px !important;
            }
            .button-box-wrapper {
                padding: 10px 0 !important;
                margin: 18px 0 !important;
            }
            .reset-button {
                font-size: 16px !important;
                padding: 12px 25px !important;
            }
            .content p {
                font-size: 14px !important;
            }
            .content h2 {
                font-size: 20px !important;
            }
        }
        
        /* Tablet & iPad (768px) - Portrait */
        @media only screen and (min-width: 426px) and (max-width: 768px) {
            body {
                padding: 20px !important;
            }
            .container {
                border-radius: 8px !important;
                width: 95% !important;
                max-width: 600px !important;
            }
            table[role="presentation"] {
                min-height: auto !important;
            }
            .content, .footer {
                padding: 22px 25px !important;
            }
            .logo-section {
                padding-top: 18px !important;
                padding-bottom: 18px !important;
            }
            .logo-image {
                max-width: 240px !important;
                width: 240px !important;
            }
            .button-box-wrapper {
                padding: 12px 0 !important;
                margin: 18px 0 !important;
            }
            .reset-button {
                font-size: 17px !important;
                padding: 13px 28px !important;
            }
            .content p {
                font-size: 15px !important;
            }
            .content h2 {
                font-size: 21px !important;
            }
        }
        
        /* iPad Air, iPad Pro (Portrait) - 820px to 1024px */
        @media only screen and (min-width: 769px) and (max-width: 1024px) {
            body {
                padding: 30px 20px !important;
            }
            .container {
                border-radius: 10px !important;
                width: 90% !important;
                max-width: 600px !important;
            }
            table[role="presentation"] {
                min-height: auto !important;
            }
            .content, .footer {
                padding: 24px 35px !important;
            }
            .logo-section {
                padding-top: 20px !important;
                padding-bottom: 20px !important;
            }
            .logo-image {
                max-width: 280px !important;
                width: 280px !important;
            }
            .button-box-wrapper {
                padding: 14px 0 !important;
                margin: 20px 0 !important;
            }
            .reset-button {
                font-size: 17px !important;
                padding: 14px 30px !important;
            }
            .content p {
                font-size: 15px !important;
            }
            .content h2 {
                font-size: 21px !important;
            }
        }
        
        /* Laptop - 1024px to 1440px */
        @media only screen and (min-width: 1025px) and (max-width: 1440px) {
            .container {
                border-radius: 12px !important;
                width: 600px !important;
                max-width: 600px !important;
            }
            .content, .footer {
                padding: 25px 40px !important;
            }
            .logo-section {
                padding-top: 20px !important;
                padding-bottom: 20px !important;
            }
            .logo-image {
                max-width: 320px !important;
                width: 320px !important;
            }
            .button-box-wrapper {
                padding: 15px 0 !important;
                margin: 20px 0 !important;
            }
            .reset-button {
                font-size: 18px !important;
                padding: 15px 35px !important;
            }
        }
        
        /* Large Desktop - 1440px to 2560px */
        @media only screen and (min-width: 1441px) and (max-width: 2560px) {
            .container {
                border-radius: 12px !important;
                width: 600px !important;
                max-width: 600px !important;
            }
            .content, .footer {
                padding: 25px 40px !important;
            }
            .logo-image {
                max-width: 320px !important;
                width: 320px !important;
            }
        }
        
        /* 4K and Ultra Wide - 2560px+ */
        @media only screen and (min-width: 2561px) {
            .container {
                border-radius: 12px !important;
                width: 600px !important;
                max-width: 600px !important;
            }
            .content, .footer {
                padding: 25px 40px !important;
            }
            .logo-image {
                max-width: 320px !important;
                width: 320px !important;
            }
        }
    </style>
</head>
<body style="font-family: 'Inter', sans-serif; background-color: #FFFFFF; margin: 0; padding: 20px 0;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #FFFFFF; margin: 0; padding: 0;">
        <tr>
            <td style="height: 10px; font-size: 10px; line-height: 10px;">&nbsp;</td>
        </tr>
        <tr>
            <td align="center">
                <table class="container gradient-bg" width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; width: 100%; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5); background-color: #005430;">
                    <!-- Logo Section -->
                    <tr>
                        <td align="center" class="logo-section" style="padding-top: 20px; padding-bottom: 20px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
                            <img src="##LOGO_IMAGE_URL##" alt="ShareMatch Logo" class="logo-image" style="display: block; margin: 0 auto; max-width: 280px; height: auto;" onerror="this.style.display='none';">
                        </td>
                    </tr>
                    <!-- Content Section -->
                    <tr>
                        <td class="content" style="padding: 25px 40px 25px 40px; color: #FFFFFF; font-size: 18px;">
                            <h2 style="margin: 0 0 20px; font-size: 26px; color: #FFFFFF; text-align: center;">
                                Reset Your Password
                            </h2>
                            <p style="margin-bottom: 30px; font-size: 18px; color: #FFFFFF; text-align: center;">
                                We received a request to reset the password associated with this email address. If you made this request, click the button below to choose a new password:
                            </p>

                            <div class="button-box-wrapper" style="padding: 15px 0; margin: 20px 0; text-align: center;">
                                <a href="\${magicLink}" class="reset-button" style="
                                    display: inline-block;
                                    font-size: 24px;
                                    font-weight: 700;
                                    color: #064e3b;
                                    padding: 15px 35px;
                                    border-radius: 8px;
                                    text-align: center;
                                    background-color: #FFFFFF;
                                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                                    text-decoration: none;"
                                >
                                    Reset Password
                                </a>
                            </div>

                            <p style="margin-bottom: 5px; font-size: 18px; color: #FFFFFF; text-align: center;">
                                For your security, this link will expire in <span class="text-highlight" style="font-weight: 700; color: #1acc79;">10 minutes</span>.
                            </p>
                            <p style="margin-top: 16px; font-size: 18px; color: #FFFFFF; text-align: center;">
                                If you did not request a password reset, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer Section -->
                    <tr>
                        <td class="footer" style="padding: 20px 40px; text-align: center; font-size: 18px; color: #FFFFFF; border-top: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0 0 12px 12px;">
                            <p style="margin: 0; font-size: 18px; color: #FFFFFF;">&copy; 2025 ShareMatch. All rights reserved.</p>
                        </td>
                    </tr>
            </table>
          </td>
        </tr>  
        <tr>
            <td style="height: 10px; font-size: 10px; line-height: 10px;">&nbsp;</td>
        </tr>
      </table>
    </body>
</html>`;
