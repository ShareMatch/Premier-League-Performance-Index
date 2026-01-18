/**
 * KYC Flow Test - SumSub API Integration
 *
 * Tests the complete KYC verification flow using SumSub's REST API
 * instead of interacting with the iframe UI.
 */

import { test, expect } from "../../adapters";
import {
  getOrCreateApplicant,
  uploadSumsubDocument,
  requestVerification,
  pollForVerificationResult,
  simulateReviewInSandbox,
  getApplicantStatus,
  getVerifiedName,
} from "../../adapters/sumsub";
import path from "path";

const TEST_USER = {
  email: "affan@sharematch.me",
  password: "Affan@1234",
  fullName: "Affan Parkar",
  phone: "561164259",
  dob: { month: "0", year: "1990", day: "15" },
};

test.describe("KYC Flow - SumSub API Integration", () => {
  test.setTimeout(120000); // 2 minutes for API calls and polling

  test("should complete KYC verification via SumSub API", async ({
    supabaseAdapter,
  }) => {
    console.log("\n=== Starting KYC Flow Test ===\n");

    // Step 1: Verify user exists in Supabase
    await test.step("Verify user exists in Supabase", async () => {
      const user = await supabaseAdapter.getUserByEmail(TEST_USER.email);
      expect(user).not.toBeNull();
      console.log(`✓ User found in Supabase: ${user.email}`);
    });

    let applicantId: string;

    // Step 2: Create a FRESH SumSub applicant with unique ID
    await test.step("Create SumSub applicant", async () => {
      const user = await supabaseAdapter.getUserByEmail(TEST_USER.email);
      // Use a unique ID with timestamp to ensure fresh applicant
      const uniqueId = `${user.email}.doc-upload.${Date.now()}`;
      applicantId = await getOrCreateApplicant(
        uniqueId,
        "id-and-liveness",
        false, // Don't try to recreate, it's a fresh ID
      );
      expect(applicantId).toBeTruthy();
      console.log(`✓ Created SumSub applicant: ${applicantId}`);
    });

    // Step 3: Upload identity documents
    await test.step("Upload front side of ID card", async () => {
      const frontPath = path.join(
        process.cwd(),
        "fixtures/Germany-ID_front.png",
      );

      await uploadSumsubDocument(
        applicantId,
        frontPath,
        "ID_CARD",
        "FRONT_SIDE",
        "DEU", // Germany
      );

      console.log("✓ Uploaded front side of ID card");
    });

    await test.step("Upload back side of ID card", async () => {
      const backPath = path.join(process.cwd(), "fixtures/Germany-ID_back.png");

      await uploadSumsubDocument(
        applicantId,
        backPath,
        "ID_CARD",
        "BACK_SIDE",
        "DEU", // Germany
      );

      console.log("✓ Uploaded back side of ID card");
    });

    // Step 4: Request verification
    await test.step("Request verification", async () => {
      await requestVerification(applicantId);
      console.log("✓ Verification requested");
    });

    // Step 5: Poll for verification result
    await test.step("Poll for verification result", async () => {
      const finalStatus = await pollForVerificationResult(
        applicantId,
        30, // max attempts (increased for real verification)
        5000, // 5 seconds between attempts
      );

      // Assert the verification completed
      const reviewAnswer =
        finalStatus.review?.reviewResult?.reviewAnswer ||
        finalStatus.reviewResult?.reviewAnswer;

      expect(reviewAnswer).toBeDefined();
      // Note: Real verification might return GREEN, RED, or RETRY
      expect(["GREEN", "RED", "RETRY"]).toContain(reviewAnswer);

      console.log(`✓ Verification completed with result: ${reviewAnswer}`);

      // Check review status
      const reviewStatus =
        finalStatus.review?.reviewStatus || finalStatus.reviewStatus;
      expect(reviewStatus).toBe("completed");

      console.log("\n=== KYC Flow Test Completed Successfully ===\n");
    });

    // Step 6: Update Supabase database with verification result
    await test.step("Update KYC status in Supabase database", async () => {
      const finalStatus = await getApplicantStatus(applicantId);
      const reviewAnswer =
        finalStatus.review?.reviewResult?.reviewAnswer ||
        finalStatus.reviewResult?.reviewAnswer;

      // Map SumSub review answer to KYC status
      let kycStatus: "approved" | "rejected" | "resubmission_requested" | "pending" = "pending";
      if (reviewAnswer === "GREEN") {
        kycStatus = "approved";
      } else if (reviewAnswer === "RED") {
        const rejectType =
          finalStatus.review?.reviewResult?.reviewRejectType ||
          finalStatus.reviewResult?.reviewRejectType;
        kycStatus = rejectType === "FINAL" ? "rejected" : "resubmission_requested";
      }

      // Update KYC compliance status
      const updated = await supabaseAdapter.updateKycStatus(TEST_USER.email, {
        kycStatus,
        applicantId,
        level: "id-and-liveness",
        coolingOffUntil: kycStatus === "approved" 
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : undefined,
        reviewedAt: new Date().toISOString(),
      });
      expect(updated).toBe(true);
      console.log(`✓ Updated KYC status in database: ${kycStatus}`);

      // If approved, also update verified name
      if (kycStatus === "approved") {
        const verifiedName = await getVerifiedName(applicantId);
        if (verifiedName) {
          const nameUpdated = await supabaseAdapter.updateVerifiedName(
            TEST_USER.email,
            verifiedName,
          );
          if (nameUpdated) {
            console.log(`✓ Updated verified name in database: ${verifiedName}`);
          }
        }
      }

      // Verify the database was updated
      const dbStatus = await supabaseAdapter.getKycStatus(TEST_USER.email);
      expect(dbStatus).not.toBeNull();
      expect(dbStatus?.kycStatus).toBe(kycStatus);
      expect(dbStatus?.applicantId).toBe(applicantId);
      console.log(`✓ Verified database status: ${dbStatus?.kycStatus}`);
    });
  });

  test("should handle verification rejection gracefully", async ({
    supabaseAdapter,
  }) => {
    // This test demonstrates handling of rejected applications using sandbox simulation
    console.log("\n=== Testing Rejection Handling (Sandbox) ===\n");

    const user = await supabaseAdapter.getUserByEmail(TEST_USER.email);
    expect(user).not.toBeNull();

    // Use unique ID for this test
    const testUserId = `${user.email}.rejection-test`;
    const applicantId = await getOrCreateApplicant(
      testUserId,
      "id-and-liveness",
      false, // Don't recreate, reuse existing
    );

    // Simulate a RED (rejected) review result with reject labels
    await simulateReviewInSandbox(applicantId, "RED", [
      "FORGERY",
      "DOCUMENT_DAMAGED",
    ]);
    console.log("✓ Simulated RED review result in Sandbox");

    // Verify the status from SumSub
    const status = await getApplicantStatus(applicantId);

    const reviewAnswer =
      status.review?.reviewResult?.reviewAnswer ||
      status.reviewResult?.reviewAnswer;

    expect(reviewAnswer).toBeDefined();
    expect(reviewAnswer).toBe("RED");

    const rejectLabels =
      status.review?.reviewResult?.rejectLabels ||
      status.reviewResult?.rejectLabels;
    console.log("Application rejected. Reasons:", rejectLabels);

    // Update rejection status in Supabase database
    const rejectType =
      status.review?.reviewResult?.reviewRejectType ||
      status.reviewResult?.reviewRejectType;
    const kycStatus = rejectType === "FINAL" ? "rejected" : "resubmission_requested";

    const updated = await supabaseAdapter.updateKycStatus(TEST_USER.email, {
      kycStatus: kycStatus as "rejected" | "resubmission_requested",
      applicantId,
      level: "id-and-liveness",
      reviewedAt: new Date().toISOString(),
    });
    
    if (updated) {
      console.log(`✓ Updated rejection status in database: ${kycStatus}`);
    }

    console.log("\n=== Rejection Handling Test Completed ===\n");
  });
});

test.describe("SumSub Adapter - Unit Tests", () => {
  test("should validate environment variables", () => {
    expect(process.env.SUMSUB_APP_TOKEN).toBeDefined();
    expect(process.env.SUMSUB_SECRET_KEY).toBeDefined();
    console.log("✓ SumSub environment variables are configured");
  });

  test("should validate test fixtures exist", async () => {
    const frontPath = path.join(process.cwd(), "fixtures/Germany-ID_front.png");
    const backPath = path.join(process.cwd(), "fixtures/Germany-ID_back.png");

    const fs = await import("fs");
    expect(fs.existsSync(frontPath)).toBe(true);
    expect(fs.existsSync(backPath)).toBe(true);
    console.log("✓ Test fixture files exist");
  });
});
