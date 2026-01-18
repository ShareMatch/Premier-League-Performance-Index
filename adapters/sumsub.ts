/**
 * SumSub API Adapter for KYC Testing
 *
 * Provides programmatic access to SumSub's REST API for:
 * - Creating applicants
 * - Uploading identity documents
 * - Triggering verification
 * - Polling verification status
 */

import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";
import crypto from "crypto";
import axios from "axios";
import https from "https";

const BASE_URL = "https://api.sumsub.com";
const APP_TOKEN = process.env.SUMSUB_APP_TOKEN!;
const SECRET_KEY = process.env.SUMSUB_SECRET_KEY!;

if (!APP_TOKEN || !SECRET_KEY) {
  throw new Error("Missing SUMSUB_APP_TOKEN or SUMSUB_SECRET_KEY in env");
}

// Type definitions based on SumSub API docs
export interface SumsubStatusResponse {
  id: string;
  createdAt: string;
  key: string;
  clientId: string;
  inspectionId: string;
  externalUserId: string;
  info: {
    firstName?: string;
    lastName?: string;
    dob?: string;
    country?: string;
  };
  email?: string;
  phone?: string;
  review?: {
    reviewId: string;
    attemptId: string;
    attemptCnt: number;
    elapsedSincePendingMs: number;
    elapsedSinceQueuedMs: number;
    reprocessing: boolean;
    levelName: string;
    createDate: string;
    reviewStatus: string;
    priority: number;
    reviewResult?: {
      reviewAnswer: "GREEN" | "RED" | "RETRY";
      rejectLabels?: string[];
      reviewRejectType?: string;
      moderationComment?: string;
      clientComment?: string;
    };
  };
  reviewStatus?: string;
  reviewResult?: {
    reviewAnswer: "GREEN" | "RED" | "RETRY";
    rejectLabels?: string[];
    reviewRejectType?: string;
    moderationComment?: string;
    clientComment?: string;
  };
}

export interface SumsubApplicantCreateResponse {
  id: string;
  createdAt: string;
  key: string;
  clientId: string;
  inspectionId: string;
  externalUserId: string;
  info: object;
  applicantId: string;
}

/**
 * Generate signature for SumSub API requests
 * According to SumSub docs: HMAC-SHA256 hex of (ts + method + path + body)
 * The body must be included exactly as it will be sent (including for multipart)
 * @see https://docs.sumsub.com/reference/authentication
 */
function generateSignature(
  method: string,
  path: string,
  timestamp: number,
  body: string | Buffer = "",
): string {
  const ts = timestamp.toString();
  const methodUpper = method.toUpperCase();
  
  // Create the prefix (timestamp + method + path)
  const prefix = ts + methodUpper + path;
  
  // Create HMAC and update with prefix
  const hmac = crypto.createHmac("sha256", SECRET_KEY);
  hmac.update(prefix);
  
  // For Buffer bodies (multipart), update with raw bytes
  // For string bodies (JSON), update with the string
  if (Buffer.isBuffer(body)) {
    hmac.update(body);
    console.log(`[SumSub Sig] ts=${ts}, method=${methodUpper}, path=${path}, bodyLen=${body.length} (Buffer)`);
  } else if (body) {
    hmac.update(body);
    console.log(`[SumSub Sig] ts=${ts}, method=${methodUpper}, path=${path}, bodyLen=${body.length}`);
  } else {
    console.log(`[SumSub Sig] ts=${ts}, method=${methodUpper}, path=${path}, bodyLen=0`);
  }
  
  return hmac.digest("hex");
}

/**
 * Get existing applicant by external user ID
 * @param externalUserId The external user ID to search for
 * @returns The applicant ID if found, null otherwise
 */
export async function getApplicantByExternalUserId(
  externalUserId: string,
): Promise<string | null> {
  const endpoint = `/resources/applicants/-;externalUserId=${externalUserId}/one`;
  const url = `${BASE_URL}${endpoint}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = generateSignature("GET", endpoint, timestamp, "");

  const res = await fetch(url, {
    headers: {
      "X-App-Token": APP_TOKEN,
      "X-App-Access-Ts": timestamp.toString(),
      "X-App-Access-Sig": signature,
    },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const error = await res.text();
    console.warn(
      `[SumSub] Warning checking for existing applicant: ${res.status} - ${error}`,
    );
    return null;
  }

  const data = (await res.json()) as { id?: string };
  return data.id || null;
}

/**
 * Delete an applicant (for cleanup)
 * @param applicantId The SumSub applicant ID to delete
 * @returns true if deleted successfully, false otherwise
 */
export async function deleteApplicant(applicantId: string): Promise<boolean> {
  const endpoint = `/resources/applicants/${applicantId}`;
  const url = `${BASE_URL}${endpoint}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = generateSignature("DELETE", endpoint, timestamp, "");

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "X-App-Token": APP_TOKEN,
      "X-App-Access-Ts": timestamp.toString(),
      "X-App-Access-Sig": signature,
    },
  });

  if (res.ok) {
    console.log(`[SumSub] Deleted applicant: ${applicantId}`);
    return true;
  } else {
    const error = await res.text();
    console.warn(
      `[SumSub] Failed to delete applicant: ${res.status} - ${error}`,
    );
    return false;
  }
}

/**
 * Create a new SumSub applicant
 * @param externalUserId Unique identifier (typically user email)
 * @param levelName KYC level (default: "id-and-liveness")
 * @returns The applicant ID
 */
export async function createSumsubApplicant(
  externalUserId: string,
  levelName: string = "id-and-liveness",
): Promise<string> {
  const endpoint = `/resources/applicants?levelName=${levelName}`;
  const url = `${BASE_URL}${endpoint}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ externalUserId, email: externalUserId });

  const signature = generateSignature("POST", endpoint, timestamp, body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Token": APP_TOKEN,
      "X-App-Access-Ts": timestamp.toString(),
      "X-App-Access-Sig": signature,
    },
    body,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to create applicant: ${res.status} - ${error}`);
  }

  const data = (await res.json()) as SumsubApplicantCreateResponse;

  if (!data.id) {
    throw new Error("Failed to create applicant: No ID in response");
  }

  console.log(`[SumSub] Created applicant: ${data.id} for ${externalUserId}`);
  return data.id;
}

/**
 * Get or create an applicant (idempotent)
 * Checks if applicant exists first, creates if not
 * @param externalUserId Unique identifier
 * @param levelName KYC level
 * @param recreate If true, attempts to delete existing applicant and creates new one
 *                 If delete fails (e.g., 403), falls back to using the existing applicant
 * @returns The applicant ID
 */
export async function getOrCreateApplicant(
  externalUserId: string,
  levelName: string = "id-and-liveness",
  recreate: boolean = false,
): Promise<string> {
  // Check if applicant already exists
  const existingId = await getApplicantByExternalUserId(externalUserId);

  if (existingId) {
    if (recreate) {
      console.log(
        `[SumSub] Attempting to delete existing applicant ${existingId} for fresh test`,
      );
      const deleted = await deleteApplicant(existingId);
      if (deleted) {
        return createSumsubApplicant(externalUserId, levelName);
      } else {
        // Delete failed (e.g., 403 forbidden), use existing applicant
        console.log(
          `[SumSub] Delete failed, using existing applicant: ${existingId}`,
        );
        return existingId;
      }
    } else {
      console.log(
        `[SumSub] Using existing applicant: ${existingId} for ${externalUserId}`,
      );
      return existingId;
    }
  }

  // Create new applicant
  return createSumsubApplicant(externalUserId, levelName);
}

/**
 * Upload a document to an applicant
 * Uses FormData with the EXACT body included in signature calculation
 * @see https://docs.sumsub.com/reference/add-id-documents
 * @param applicantId The SumSub applicant ID
 * @param filePath Path to the document file
 * @param docType Document type (e.g., "ID_CARD", "PASSPORT")
 * @param subType Document side ("FRONT_SIDE" or "BACK_SIDE")
 * @param country ISO country code (default: "ARE")
 */
export async function uploadSumsubDocument(
  applicantId: string,
  filePath: string,
  docType: string,
  subType: string,
  country: string = "ARE",
): Promise<any> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const endpoint = `/resources/applicants/${applicantId}/info/idDoc`;

  const metadata = {
    idDocType: docType,
    idDocSubType: subType,
    country,
  };

  // Read file as buffer
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = filePath.split(/[\\/]/).pop() || "document.png";

  // Build the form data
  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  form.append("content", fileBuffer, {
    filename: fileName,
    contentType: "image/png",
  });

  // CRITICAL: Get the EXACT bytes that will be sent
  // This includes the multipart boundaries
  const formBuffer = form.getBuffer();
  const formHeaders = form.getHeaders();

  // Calculate signature WITH the actual form body (as Buffer)
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateSignature("POST", endpoint, timestamp, formBuffer);

  console.log(`[SumSub] Uploading to: ${endpoint}`);
  console.log(`[SumSub] Timestamp: ${timestamp}`);
  console.log(`[SumSub] Metadata: ${JSON.stringify(metadata)}`);
  console.log(`[SumSub] Form buffer size: ${formBuffer.length}`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.sumsub.com",
      port: 443,
      path: endpoint,
      method: "POST",
      headers: {
        ...formHeaders,
        "Content-Length": formBuffer.length,
        "X-App-Token": APP_TOKEN,
        "X-App-Access-Ts": timestamp.toString(),
        "X-App-Access-Sig": signature,
        "X-Return-Doc-Warnings": "true",
      },
    };

    console.log(`[SumSub] Request headers:`, Object.keys(options.headers));

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        console.log(`[SumSub] Response status: ${res.statusCode}`);
        console.log(`[SumSub] Response: ${data.substring(0, 500)}`);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const parsed = JSON.parse(data);
            console.log(`[SumSub] Uploaded ${docType} ${subType} for applicant ${applicantId}`);
            resolve(parsed);
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`Failed to upload document: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on("error", (error) => {
      console.error(`[SumSub] Request error: ${error.message}`);
      reject(error);
    });

    // Write the EXACT same bytes we used for signature calculation
    req.write(formBuffer);
    req.end();
  });
}

/**
 * Request verification for an applicant
 * Moves the applicant to "pending" status
 */
export async function requestVerification(applicantId: string): Promise<any> {
  const endpoint = `/resources/applicants/${applicantId}/status/pending`;
  const url = `${BASE_URL}${endpoint}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = generateSignature("POST", endpoint, timestamp, "");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Token": APP_TOKEN,
      "X-App-Access-Ts": timestamp.toString(),
      "X-App-Access-Sig": signature,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to request verification: ${res.status} - ${error}`);
  }

  const data = await res.json();
  console.log(`[SumSub] Requested verification for applicant ${applicantId}`);
  return data;
}

/**
 * Get applicant status and review results
 * @param applicantId The SumSub applicant ID
 * @returns Status response with review results
 */
export async function getApplicantStatus(
  applicantId: string,
): Promise<SumsubStatusResponse> {
  const endpoint = `/resources/applicants/${applicantId}/one`;
  const url = `${BASE_URL}${endpoint}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = generateSignature("GET", endpoint, timestamp, "");

  const res = await fetch(url, {
    headers: {
      "X-App-Token": APP_TOKEN,
      "X-App-Access-Ts": timestamp.toString(),
      "X-App-Access-Sig": signature,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to get applicant status: ${res.status} - ${error}`);
  }

  const data = (await res.json()) as SumsubStatusResponse;

  console.log(`[SumSub] Applicant ${applicantId} status:`, {
    reviewStatus: data.review?.reviewStatus || data.reviewStatus,
    reviewAnswer:
      data.review?.reviewResult?.reviewAnswer ||
      data.reviewResult?.reviewAnswer,
  });

  return data;
}

/**
 * Simulate a review response in Sandbox mode
 * This bypasses the need to upload actual documents
 * @see https://docs.sumsub.com/reference/simulate-review-response
 * @param applicantId The SumSub applicant ID
 * @param reviewAnswer "GREEN" for approved, "RED" for rejected
 * @param rejectLabels Optional rejection reasons (for RED)
 */
export async function simulateReviewInSandbox(
  applicantId: string,
  reviewAnswer: "GREEN" | "RED" = "GREEN",
  rejectLabels?: string[],
): Promise<any> {
  const endpoint = `/resources/applicants/${applicantId}/status/testCompleted`;
  const url = `${BASE_URL}${endpoint}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const body: any = {
    reviewAnswer,
  };

  if (reviewAnswer === "RED" && rejectLabels) {
    body.rejectLabels = rejectLabels;
  }

  const bodyStr = JSON.stringify(body);
  const signature = generateSignature("POST", endpoint, timestamp, bodyStr);

  console.log(`[SumSub] Simulating review for applicant ${applicantId}`);
  console.log(`[SumSub] Review answer: ${reviewAnswer}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Token": APP_TOKEN,
      "X-App-Access-Ts": timestamp.toString(),
      "X-App-Access-Sig": signature,
    },
    body: bodyStr,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to simulate review: ${res.status} - ${error}`);
  }

  const data = await res.json();
  console.log(`[SumSub] Simulated review completed: ${reviewAnswer}`);
  return data;
}

/**
 * Get verified name from applicant info
 * Extracts the verified name from SumSub's applicant data
 * @param applicantId The SumSub applicant ID
 * @returns The verified full name or null
 */
export async function getVerifiedName(
  applicantId: string,
): Promise<string | null> {
  try {
    const status = await getApplicantStatus(applicantId);
    
    // The verified name is in info or fixedInfo
    const info = status.info || {};
    const fixedInfo = (status as any).fixedInfo || {};
    
    // Prefer fixedInfo (verified), then info with English variants
    const firstName = fixedInfo.firstName || (info as any).firstNameEn || info.firstName || "";
    const lastName = fixedInfo.lastName || (info as any).lastNameEn || info.lastName || "";
    
    if (firstName || lastName) {
      const fullName = `${firstName} ${lastName}`.trim();
      console.log(`[SumSub] Verified name: ${fullName}`);
      return fullName;
    }
    
    return null;
  } catch (err) {
    console.error("[SumSub] Error getting verified name:", err);
    return null;
  }
}

/**
 * Poll for verification completion
 * @param applicantId The SumSub applicant ID
 * @param maxAttempts Maximum polling attempts (default: 20)
 * @param delayMs Delay between attempts in ms (default: 3000)
 * @returns Final status response
 */
export async function pollForVerificationResult(
  applicantId: string,
  maxAttempts: number = 20,
  delayMs: number = 3000,
): Promise<SumsubStatusResponse> {
  console.log(
    `[SumSub] Polling for verification result (max ${maxAttempts} attempts)...`,
  );

  for (let i = 0; i < maxAttempts; i++) {
    const status = await getApplicantStatus(applicantId);

    // Check both possible locations for review status
    const reviewStatus = status.review?.reviewStatus || status.reviewStatus;
    const reviewAnswer =
      status.review?.reviewResult?.reviewAnswer ||
      status.reviewResult?.reviewAnswer;

    if (reviewStatus === "completed" && reviewAnswer) {
      console.log(
        `[SumSub] Verification completed with result: ${reviewAnswer}`,
      );
      return status;
    }

    console.log(
      `[SumSub] Attempt ${i + 1}/${maxAttempts}: Status = ${reviewStatus || "unknown"}`,
    );

    if (i < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(
    `Verification did not complete after ${maxAttempts} attempts`,
  );
}
