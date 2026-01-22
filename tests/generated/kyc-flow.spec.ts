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
      
      // For this test, we expect GREEN (approved)
      expect(reviewAnswer).toBe("GREEN");

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

      // Since we're only testing approved flow, status should be approved
      expect(reviewAnswer).toBe("GREEN");
      const kycStatus = "approved";

      // Update KYC compliance status
      const updated = await supabaseAdapter.updateKycStatus(TEST_USER.email, {
        kycStatus,
        applicantId,
        level: "id-and-liveness",
        coolingOffUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reviewedAt: new Date().toISOString(),
      });
      expect(updated).toBe(true);
      console.log(`✓ Updated KYC status in database: ${kycStatus}`);

      // Update verified name
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

      // Verify the database was updated
      const dbStatus = await supabaseAdapter.getKycStatus(TEST_USER.email);
      expect(dbStatus).not.toBeNull();
      expect(dbStatus?.kycStatus).toBe(kycStatus);
      expect(dbStatus?.applicantId).toBe(applicantId);
      console.log(`✓ Verified database status: ${dbStatus?.kycStatus}`);
    });
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