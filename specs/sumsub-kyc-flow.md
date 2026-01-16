# Sumsub KYC Flow Test Plan

## Overview
This test plan audits the Sumsub Identity Verification (IDV) integration.

## Test Scenarios

### Scenario 1: Successful Verification (GREEN)
**Goal:** Verify that a user who uploads valid documents is approved.

**Steps:**
1. Navigate to the registration page
2. Fill out the signup form with valid data
3. Complete email/WhatsApp verification
4. When Sumsub widget appears, upload a valid "Sandbox GREEN" document
5. Wait for webhook processing
6. Verify UI shows "Verified" status
7. **Backend Check:** Call `sumsub.getApplicantReviewResult()` and confirm `reviewAnswer === 'GREEN'`

**Expected Result:**
- UI displays verification success
- API returns GREEN status
- User can access KYC-protected features

---

### Scenario 2: Failed Verification (RED)
**Goal:** Verify that a user who uploads rejected documents is denied.

**Steps:**
1. Navigate to the registration page
2. Fill out the signup form with valid data
3. Complete email/WhatsApp verification
4. When Sumsub widget appears, upload a "Sandbox RED" document (e.g., OCF_RED template)
5. Wait for webhook processing
6. Verify UI shows rejection message

**Backend Check:**
- Call `sumsub.getApplicantReviewResult()` and confirm `reviewAnswer === 'RED'`

**Expected Result:**
- UI displays verification failure
- API returns RED status
- User cannot access KYC-protected features

---

### Scenario 3: Webhook Reliability
**Goal:** Verify that webhooks are received and processed correctly.

**Steps:**
1. Trigger a Sumsub verification in Sandbox
2. Monitor webhook endpoint logs
3. Confirm user_compliance table is updated
4. Confirm auth.users metadata is updated

---

## Sandbox Test Documents
- **GREEN (Approved):** Use Sumsub's "OCF Green" template
- **RED (Rejected):** Use Sumsub's "OCF Red" template

## Notes
- All tests must run in Sumsub Sandbox mode
- Tests should clean up created users after completion

