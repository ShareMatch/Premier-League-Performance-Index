/**
 * Maps Sumsub rejection labels to human-readable messages
 * Based on Sumsub API documentation
 */

// Resubmission requested labels - user can try again
export const RESUBMISSION_LABELS: Record<string, string> = {
  // Bad document issues
  BAD_PROOF_OF_IDENTITY: "The ID document you uploaded has quality issues. Please upload a clearer photo.",
  BAD_PROOF_OF_ADDRESS: "The proof of address document has quality issues. Please upload a clearer photo.",
  BAD_PROOF_OF_PAYMENT: "The payment proof has quality issues. Please upload a clearer image.",
  BAD_SELFIE: "The selfie you uploaded has quality issues. Please take a new, clearer selfie.",
  BAD_VIDEO_SELFIE: "The video selfie has quality issues. Please record a new video.",
  BAD_FACE_MATCHING: "We couldn't match your face to your ID document. Please try again with better lighting.",
  
  // Document issues
  DOCUMENT_DAMAGED: "Your document appears to be damaged. Please upload an undamaged document.",
  DOCUMENT_PAGE_MISSING: "Some pages of your document are missing. Please upload all pages.",
  EXPIRATION_DATE: "Your document has expired or is about to expire. Please upload a valid document.",
  ID_INVALID: "The ID document you uploaded is not valid. Please upload a different document.",
  DIGITAL_DOCUMENT: "Digital documents are not accepted. Please upload a photo of the physical document.",
  INCOMPATIBLE_LANGUAGE: "We need an English translation of your document.",
  
  // Photo issues
  UNSATISFACTORY_PHOTOS: "The photos you uploaded don't meet our quality requirements. Please upload clearer photos.",
  LOW_QUALITY: "The image quality is too low. Please upload a higher quality image.",
  SCREENSHOTS: "Screenshots are not accepted. Please upload original photos.",
  BLACK_AND_WHITE: "Please upload color photos of your documents.",
  GRAPHIC_EDITOR: "We detected that the image may have been edited. Please upload an unedited photo.",
  
  // Data issues
  PROBLEMATIC_APPLICANT_DATA: "The information you provided doesn't match your documents. Please check and try again.",
  REQUESTED_DATA_MISMATCH: "Some information doesn't match. Please verify your details.",
  WRONG_ADDRESS: "The address on your document doesn't match what you entered.",
  
  // Missing items
  ADDITIONAL_DOCUMENT_REQUIRED: "We need additional documents to verify your identity.",
  MORE_DOCUMENTS_REQUIRED: "Please provide additional documents for verification.",
  FRONT_SIDE_MISSING: "Please upload the front side of your document.",
  BACK_SIDE_MISSING: "Please upload the back side of your document.",
  
  // Selfie issues  
  SELFIE_MISMATCH: "Your selfie doesn't match the photo on your ID. Please try again.",
  FRAUDULENT_LIVENESS: "We couldn't verify you're a real person. Please try the liveness check again.",
  
  // Check issues
  CHECK_UNAVAILABLE: "Our verification service is temporarily unavailable. Please try again later.",
  DB_DATA_MISMATCH: "Your information doesn't match official records. Please verify your details.",
  DB_DATA_NOT_FOUND: "We couldn't find your information in official records. Please check your details.",
  
  // General
  INCOMPLETE_DOCUMENT: "Your document is incomplete or partially visible. Please upload a complete image.",
  UNFILLED_ID: "Your document is missing signatures or stamps.",
  NOT_DOCUMENT: "The file you uploaded is not a valid document.",
}

// Final rejection labels - user cannot try again
export const FINAL_REJECTION_LABELS: Record<string, string> = {
  FORGERY: "We detected signs of document tampering. Your verification cannot proceed.",
  DUPLICATE: "An account with your information already exists.",
  SPAM: "Your verification was rejected due to suspicious activity.",
  BLOCKLIST: "Your account has been blocked from verification.",
  BLACKLIST: "Your account has been blocked from verification.",
  
  // Compliance issues
  SANCTIONS: "You appear on a sanctions list and cannot be verified.",
  PEP: "As a politically exposed person, additional verification is required.",
  CRIMINAL: "Your verification was declined due to criminal records.",
  ADVERSE_MEDIA: "Your verification was declined due to adverse media findings.",
  
  // Fraud
  FRAUDULENT_PATTERNS: "Suspicious activity was detected during your verification.",
  INCONSISTENT_PROFILE: "The documents and information provided appear to belong to different people.",
  THIRD_PARTY_INVOLVED: "We detected that someone else may be involved in this verification.",
  
  // Regulation
  REGULATIONS_VIOLATIONS: "Your verification doesn't meet regulatory requirements.",
  WRONG_USER_REGION: "Verification is not available in your region.",
  AGE_REQUIREMENT_MISMATCH: "You don't meet the age requirements.",
  
  // Identity
  SELFIE_MISMATCH: "Your selfie doesn't match the photo on your documents.",
  COMPROMISED_PERSONS: "Your verification was declined based on compliance checks.",
}

/**
 * Get human-readable message for a rejection label
 */
export function getRejectionMessage(label: string): string {
  return RESUBMISSION_LABELS[label] || FINAL_REJECTION_LABELS[label] || `Verification issue: ${label.toLowerCase().replace(/_/g, ' ')}`
}

/**
 * Get all human-readable messages for an array of rejection labels
 */
export function getRejectionMessages(labels: string[]): string[] {
  return labels.map(getRejectionMessage)
}

/**
 * Determine if the rejection is final or allows resubmission
 */
export function isResubmissionAllowed(rejectType: string | null, labels: string[]): boolean {
  if (rejectType === 'FINAL') return false
  if (rejectType === 'RETRY') return true
  
  // Check if any label is a final rejection
  const hasFinalLabel = labels.some(label => FINAL_REJECTION_LABELS[label])
  return !hasFinalLabel
}

/**
 * Get a summary message based on rejection type
 */
export function getRejectionSummary(rejectType: string | null, labels: string[]): string {
  if (rejectType === 'RETRY' || isResubmissionAllowed(rejectType, labels)) {
    return "We need you to fix some issues with your verification. Please review the details below and try again."
  }
  return "Unfortunately, we cannot verify your identity. Please contact support if you believe this is an error."
}

/**
 * Map button IDs to more specific messages
 */
export function getButtonIdMessage(buttonId: string): string {
  const buttonMessages: Record<string, string> = {
    // Selfie issues
    'selfie_badFaceComparison': "Your selfie doesn't match your ID photo",
    'selfie_selfieLiveness': "Liveness check failed - please try again in good lighting",
    'selfie_webcamSelfie': "Please take a new selfie using your camera",
    
    // Document issues
    'badDocument_expiredId': "Your ID document has expired",
    'badDocument_damagedId': "Your document appears damaged",
    'badDocument_wrongType': "This document type is not accepted",
    'badDocument_withoutFace': "Your face is not visible in the document",
    'badDocument_copyOfIdDoc': "Please upload the original document, not a copy",
    
    // Photo issues
    'badPhoto_dataNotVisible': "Information on your document is not readable",
    'badPhoto_lowQuality': "Photo quality is too low",
    'badPhoto_screenshot': "Screenshots are not accepted",
    'badPhoto_imageEditor': "The photo appears to have been edited",
    
    // Additional pages
    'additionalPages_anotherSide': "Please upload the other side of your document",
    'additionalPages_mainPageId': "The main page of your ID is missing",
    
    // Data mismatch
    'dataMismatch_fullName': "Your name doesn't match your documents",
    'dataMismatch_dateOfBirth': "Your date of birth doesn't match your documents",
    'dataMismatch_address': "Your address doesn't match your documents",
    
    // Fraud
    'fake_editedId': "Signs of document editing detected",
    'fake_forgedId': "Document appears to be forged",
    'fraudulentPatterns_selfieMismatch': "Selfie doesn't match document photo",
    
    // Spam
    'spam': "Too many failed attempts",
  }
  
  return buttonMessages[buttonId] || buttonId.replace(/_/g, ' ')
}

