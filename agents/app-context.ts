/**
 * App Context for Test Generation
 * 
 * This file provides detailed context about the ShareMatch application
 * to the Test Writer Agent. It includes:
 * - Exact selectors for all form elements
 * - Multi-step user flow documentation
 * - Actual error messages from the app
 * - Test data requirements
 */

export const APP_CONTEXT = {
  name: 'ShareMatch',
  baseUrl: 'http://localhost:3000',
  
  /**
   * User Journey Flow
   * The app has a multi-step verification process
   */
  userFlow: `
## ShareMatch User Journey (CRITICAL - READ THIS!)

### Complete Registration Flow:
1. **Signup Step 1** (/?action=signup)
   - Fill personal info: full name, email, password, confirm password
   - Select date of birth (custom date picker - NOT native input)
   - Select country (custom dropdown - NOT native select)
   - Click "Continue" button

2. **Signup Step 2** (same modal, step 2)
   - Enter phone number (custom phone input with country code selector)
   - Enter WhatsApp number (or check "Use same number")
   - Check required agreements (WhatsApp OTP consent, Terms)
   - Click "Create Account" button

3. **Email Verification** (verification modal appears)
   - User receives OTP via email
   - Enter 6-digit code in OTP input
   - Click "Verify" button
   - TEST MODE: Use bypass code "123456"

4. **WhatsApp Verification** (verification modal appears)
   - User receives OTP via WhatsApp
   - Enter 6-digit code in OTP input  
   - Click "Verify" button
   - TEST MODE: Use bypass code "123456"

5. **Login** (/?action=login)
   - User can now login with email + password
   - Modal has data-testid="login-modal"

6. **KYC Verification** (ONLY AFTER LOGIN)
   - KYC page is NOT accessible without being logged in
   - KYC uses Sumsub embedded widget (iframe)
   - DO NOT test KYC as a standalone flow
   - DO NOT generate file upload tests for KYC
   - KYC widget appears automatically for unverified users after login

### Important Notes:
- All modals use custom components, not native HTML elements
- Country selector is a searchable dropdown, not a <select>
- Date picker is a custom calendar, not a native date input
- Phone input has a country code selector built-in
- Buttons may be disabled until form is valid
`,

  /**
   * Login Modal Selectors
   */
  loginModal: {
    modal: 'data-testid="login-modal"',
    email: '#login-email',
    password: '#login-password',
    submitButton: 'button:has-text("Login")',
    submitButtonDisabled: 'Button is disabled when email or password is empty',
    forgotPassword: 'button:has-text("Forgot password?")',
    switchToSignup: 'button:has-text("Sign up")',
    errorMessage: '.text-red-400',
    
    // How to interact
    howToOpen: 'Navigate to /?action=login OR click "LOG IN" button on homepage',
    howToSubmit: `
1. Fill email: page.locator('#login-email').fill(email)
2. Fill password: page.locator('#login-password').fill(password)
3. Wait for button enabled: await expect(page.getByRole('button', { name: /login/i })).toBeEnabled()
4. Click: await page.getByRole('button', { name: /login/i }).click()
`,
  },

  /**
   * Signup Modal Selectors
   */
  signupModal: {
    modal: 'data-testid="signup-modal"',
    
    // Step 1 fields
    step1: {
      fullName: '#fullName',
      email: 'input[name="email"]',
      password: '#password',
      confirmPassword: '#confirmPassword',
      dateOfBirth: 'button:has-text("Select date of birth")',
      countryOfResidence: 'button:has-text("Select country")',
      referralCode: 'input[name="referralCode"]',
      continueButton: 'button:has-text("Continue")',
    },
    
    // Step 2 fields
    step2: {
      phoneInput: 'input[name="phone"]',
      whatsappInput: 'input[name="whatsapp"]',
      useSameNumberCheckbox: '#useSameNumber',
      agreeToWhatsappOtp: '#agreeToWhatsappOtp',
      agreeToTerms: '#agreeToTerms',
      agreeToMarketingComms: '#agreeToMarketingComms',
      createAccountButton: 'button:has-text("Create Account")',
    },
    
    // How to interact with custom components
    howToSelectDate: `
1. Click the date button: await page.getByText('Select date of birth').click()
2. Select month from dropdown: await page.locator('select').first().selectOption('0') // 0 = January
3. Select year from dropdown: await page.locator('select').last().selectOption('1990')
4. Click day button: await page.getByRole('button', { name: '15' }).click()
`,
    howToSelectCountry: `
1. Click the country button: await page.getByText('Select country').click()
2. Optionally search: await page.locator('input[placeholder="Search..."]').fill('United')
3. Click country from list: await page.getByText('United Arab Emirates').click()
`,
    howToFillPhone: `
1. The phone input has country code selector built-in
2. Just fill the number part: await page.locator('input[name="phone"]').fill('501234567')
3. Country code defaults based on country of residence selection
`,
  },

  /**
   * OTP Verification Modal Selectors
   */
  verificationModal: {
    otpInput: 'input[placeholder*="code" i], input[maxlength="6"]',
    verifyButton: 'button:has-text("Verify")',
    resendButton: 'button:has-text("Resend")',
    
    // Test mode bypass
    testBypassOtp: '123456',
    
    howToVerify: `
1. Wait for modal: await expect(page.locator('input[maxlength="6"]')).toBeVisible({ timeout: 10000 })
2. Fill OTP: await page.locator('input[maxlength="6"]').fill('123456')
3. Click verify: await page.getByRole('button', { name: /verify/i }).click()
4. Wait for processing: await page.waitForTimeout(2000)
`,
  },

  /**
   * Error Messages (actual text shown in the app)
   */
  errorMessages: {
    login: {
      invalidCredentials: 'Invalid login credentials',
      emailRequired: 'Email is required',
      passwordRequired: 'Password is required',
      verificationRequired: 'Please verify your email first',
    },
    signup: {
      emailExists: 'An account with this email already exists',
      emailInvalid: 'Invalid email format',
      passwordTooShort: 'Password must be at least 8 characters',
      passwordMismatch: 'Passwords do not match',
      phoneInvalid: 'Invalid phone number',
      whatsappInvalid: 'Invalid WhatsApp number',
      dobRequired: 'Date of birth is required',
      dobUnder18: 'You must be at least 18 years old',
      countryRequired: 'Country is required',
      termsRequired: 'You must agree to the terms',
    },
  },

  /**
   * Test Data Requirements
   */
  testData: {
    emailFormat: 'test.${Date.now()}@example.com',
    passwordMinLength: 8,
    passwordExample: 'TestPassword123!',
    otpBypassCode: '123456',
    phoneExample: '501234567',
    phoneE164Example: '+971501234567',
    minAge: 18,
    dobExample: '1990-01-15',
    countryExample: 'AE',
    countryNameExample: 'United Arab Emirates',
  },

  /**
   * Backend Verification
   */
  backendVerification: {
    getUserByEmail: 'supabaseAdapter.getUserByEmail(email)',
    getEmailOtp: 'supabaseAdapter.getEmailOtp(email)',
    getWhatsAppOtp: 'supabaseAdapter.getWhatsAppOtp(email)',
    isUserVerified: 'supabaseAdapter.isUserVerified(email)',
    deleteTestUser: 'supabaseAdapter.deleteTestUser(email)',
    createUser: 'supabaseAdapter.createUser(email, password)',
  },

  /**
   * KYC Flow (Post-Login Only)
   */
  kycFlow: {
    important: 'KYC is ONLY accessible after login. Do NOT test as standalone page.',
    widget: 'Uses Sumsub embedded widget (iframe)',
    cannotTestFileUploads: true,
    howToTest: `
1. First, complete signup and verification flow
2. Login with the verified user
3. Check if Sumsub widget appears: await page.locator('[id*="sumsub"], iframe[src*="sumsub"]').isVisible()
4. KYC completion happens in the iframe - cannot be automated with Playwright
5. Only verify that the widget loads, do not try to interact with it
`,
  },
};

/**
 * Generate the full context string for Groq prompts
 */
export function getAppContextForPrompt(): string {
  return `
## ShareMatch Application Context (CRITICAL - USE THIS INFORMATION)

${APP_CONTEXT.userFlow}

### Login Modal Selectors
- Modal: ${APP_CONTEXT.loginModal.modal}
- Email input: ${APP_CONTEXT.loginModal.email}
- Password input: ${APP_CONTEXT.loginModal.password}
- Submit button: ${APP_CONTEXT.loginModal.submitButton}
- Note: ${APP_CONTEXT.loginModal.submitButtonDisabled}

**How to interact:**
${APP_CONTEXT.loginModal.howToSubmit}

### Signup Modal Selectors

**Step 1 (Personal Info):**
- Full Name: ${APP_CONTEXT.signupModal.step1.fullName}
- Email: ${APP_CONTEXT.signupModal.step1.email}
- Password: ${APP_CONTEXT.signupModal.step1.password}
- Confirm Password: ${APP_CONTEXT.signupModal.step1.confirmPassword}
- Date of Birth: Custom date picker (see instructions below)
- Country: Custom dropdown (see instructions below)
- Continue Button: ${APP_CONTEXT.signupModal.step1.continueButton}

**How to select date:**
${APP_CONTEXT.signupModal.howToSelectDate}

**How to select country:**
${APP_CONTEXT.signupModal.howToSelectCountry}

**Step 2 (Phone & Verification):**
- Phone: ${APP_CONTEXT.signupModal.step2.phoneInput}
- WhatsApp: ${APP_CONTEXT.signupModal.step2.whatsappInput}
- Use Same Number: ${APP_CONTEXT.signupModal.step2.useSameNumberCheckbox}
- WhatsApp OTP Consent: ${APP_CONTEXT.signupModal.step2.agreeToWhatsappOtp}
- Terms Agreement: ${APP_CONTEXT.signupModal.step2.agreeToTerms}
- Create Account Button: ${APP_CONTEXT.signupModal.step2.createAccountButton}

### OTP Verification
- OTP Input: ${APP_CONTEXT.verificationModal.otpInput}
- Verify Button: ${APP_CONTEXT.verificationModal.verifyButton}
- TEST BYPASS CODE: "${APP_CONTEXT.verificationModal.testBypassOtp}"

${APP_CONTEXT.verificationModal.howToVerify}

### Actual Error Messages (DO NOT GUESS - USE THESE EXACT MESSAGES)

**Login Errors:**
- Invalid credentials: "${APP_CONTEXT.errorMessages.login.invalidCredentials}"
- Email required: "${APP_CONTEXT.errorMessages.login.emailRequired}"
- Verification required: "${APP_CONTEXT.errorMessages.login.verificationRequired}"

**Signup Errors:**
- Email exists: "${APP_CONTEXT.errorMessages.signup.emailExists}"
- Invalid email: "${APP_CONTEXT.errorMessages.signup.emailInvalid}"
- Password too short: "${APP_CONTEXT.errorMessages.signup.passwordTooShort}"
- Password mismatch: "${APP_CONTEXT.errorMessages.signup.passwordMismatch}"
- Invalid phone: "${APP_CONTEXT.errorMessages.signup.phoneInvalid}"
- Under 18: "${APP_CONTEXT.errorMessages.signup.dobUnder18}"

### Test Data Requirements
- Email format: test.\${Date.now()}@example.com (MUST use Date.now() for uniqueness)
- Password: Minimum 8 characters, example: "${APP_CONTEXT.testData.passwordExample}"
- OTP bypass: "${APP_CONTEXT.testData.otpBypassCode}" (works when TEST_MODE=true)
- Phone: "${APP_CONTEXT.testData.phoneExample}" (without country code)
- DOB: Must be 18+ years old, example: "${APP_CONTEXT.testData.dobExample}"

### KYC Flow (IMPORTANT!)
${APP_CONTEXT.kycFlow.important}
${APP_CONTEXT.kycFlow.howToTest}

### Backend Verification Methods
- Get user: ${APP_CONTEXT.backendVerification.getUserByEmail}
- Get email OTP: ${APP_CONTEXT.backendVerification.getEmailOtp}
- Get WhatsApp OTP: ${APP_CONTEXT.backendVerification.getWhatsAppOtp}
- Check verified: ${APP_CONTEXT.backendVerification.isUserVerified}
- Delete user: ${APP_CONTEXT.backendVerification.deleteTestUser}
- Create user: ${APP_CONTEXT.backendVerification.createUser}

### Button State Awareness
IMPORTANT: Many buttons are disabled until form is valid. Always check:
\`\`\`typescript
// Wait for button to be enabled before clicking
await expect(page.getByRole('button', { name: /login/i })).toBeEnabled();
await page.getByRole('button', { name: /login/i }).click();
\`\`\`
`;
}

/**
 * Get list of testable features (excludes KYC which requires login)
 */
export function getTestableFeatures(): Array<{ url: string; name: string; description: string }> {
  return [
    {
      url: '/?action=login',
      name: 'Login Flow',
      description: 'Test login with valid/invalid credentials. Login modal has email and password fields.',
    },
    {
      url: '/?action=signup',
      name: 'Signup Flow',
      description: 'Test user registration. Two-step process: personal info then phone verification.',
    },
  ];
}

export default APP_CONTEXT;

