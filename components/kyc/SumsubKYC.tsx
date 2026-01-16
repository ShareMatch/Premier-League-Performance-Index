import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';

// Lazy load Sumsub SDK for code splitting (Vite/React compatible)
const SumsubWebSdk = lazy(() => import('@sumsub/websdk-react'));

// Supabase configuration - use the same values as lib/supabase.ts
import { SUPABASE_URL } from '../../lib/config';
import { supabase } from '../../lib/supabase';

// Helper to call Supabase Edge Functions
const callEdgeFunction = async (functionName: string, body?: any) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('No active session available');
  }
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, data: await response.json() };
};

// Loading component for SDK
const SDKLoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#005430] mx-auto mb-4"></div>
      <p className="text-white text-xl">Loading verification SDK...</p>
    </div>
  </div>
);

export interface SumsubKYCProps {
  userId: string;
  levelName?: string;
  onComplete?: (data: any) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export default function SumsubKYC({
  userId,
  levelName = "basic-kyc-level",
  onComplete,
  onError,
  onClose,
}: SumsubKYCProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent double-fetch in React Strict Mode
  const fetchingRef = useRef(false);

  // Track if we've already saved the applicant ID
  const applicantIdSavedRef = useRef(false);

  // Track if user has submitted documents in THIS session
  const hasSubmittedInSessionRef = useRef(false);


  // Fetch access token from backend
  useEffect(() => {
    // Prevent double-fetch in Strict Mode
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    const getAccessToken = async () => {
      try {
        setLoading(true);

        // Call Supabase Edge Function
        const { response, data } = await callEdgeFunction('sumsub-access-token', {
          user_id: userId,
          levelName
        });

        if (!response.ok) {
          const errorMsg = data.error || data.detail || 'Failed to get access token';
          console.error('❌ Token error:', errorMsg);
          throw new Error(errorMsg);
        }

        if (!data.token) {
          throw new Error('No token returned from server');
        }

        setAccessToken(data.token);
      } catch (err: any) {
        console.error('❌ Access token error:', err);
        setError(err.message);
        onError?.(err);
      } finally {
        setLoading(false);
      }
    };

    getAccessToken();
  }, [userId, levelName, onError]);

  // Token expiration handler
  const accessTokenExpirationHandler = useCallback(async () => {
    try {
      const { data } = await callEdgeFunction('sumsub-access-token', {
        user_id: userId,
        levelName
      });

      if (!data?.token) {
        throw new Error('No token returned from server');
      }

      return data.token;
    } catch (err: any) {
      console.error('❌ Access token refresh failed during expiration handling:', err);
      setError('Your session has expired. Please refresh the page or log in again.');
      onError?.(err);
      return null;
    }
  }, [userId, levelName, onError]);

  // Save applicant ID to database (from SDK callback)
  const saveApplicantId = useCallback(async (applicantId: string) => {
    try {
      const { response, data } = await callEdgeFunction('sumsub-update-status', {
        user_id: userId,
        applicant_id: applicantId,
      });
      if (response.ok) {
      } else {
        console.error('❌ Failed to save applicant ID:', data);
      }
    } catch (err) {
      console.error('❌ Error saving applicant ID:', err);
    }
  }, [userId]);

  // Update KYC status in database
  const updateKycStatus = useCallback(async (reviewStatus: string, reviewAnswer: string, reviewRejectType?: string) => {
    try {
      const { response, data } = await callEdgeFunction('sumsub-update-status', {
        user_id: userId,
        review_status: reviewStatus,
        review_answer: reviewAnswer,
        review_reject_type: reviewRejectType,
      });
      if (response.ok) {
      } else {
        console.error('❌ Failed to update KYC status:', data);
      }
    } catch (err) {
      console.error('❌ Error updating KYC status:', err);
    }
  }, [userId]);

  // Reset refs on mount (handles React Strict Mode re-mount)
  useEffect(() => {
    applicantIdSavedRef.current = false;
    hasSubmittedInSessionRef.current = false;

    return () => {
    };
  }, []);

  // Message handler
  const messageHandler = useCallback((type: string, payload: any) => {
    if (type === 'idCheck.onApplicantLoaded') {
      // Save applicant ID when SDK loads applicant (only once)
      const applicantId = payload?.applicantId;
      if (applicantId && !applicantIdSavedRef.current) {
        applicantIdSavedRef.current = true;
        saveApplicantId(applicantId);
      }
    } else if (type === 'idCheck.onApplicantSubmitted' || type === 'idCheck.onApplicantResubmitted') {
      // Mark that user has submitted documents in this session
      hasSubmittedInSessionRef.current = true;
      // Status will be updated via onApplicantStatusChanged event or webhook
    } else if (type === 'idCheck.onApplicantStatusChanged') {
      // Update database when status changes
      const reviewStatus = payload?.reviewStatus;
      const reviewAnswer = payload?.reviewResult?.reviewAnswer;
      const isReprocessing = payload?.reprocessing === true;

      // Check multiple possible locations for reviewRejectType
      const reviewRejectType = payload?.reviewResult?.reviewRejectType
        || payload?.reviewRejectType
        || payload?.rejectType;
      const rejectLabels = payload?.reviewResult?.rejectLabels || payload?.rejectLabels || [];
      const moderationComment = payload?.reviewResult?.moderationComment || payload?.moderationComment || null;
      const buttonIds = payload?.reviewResult?.buttonIds || payload?.buttonIds || [];

      // Always process status changes to update the database
      // The webhook is the authoritative source, but we also update from SDK events for faster UX

      // Update database whenever we have a review answer (GREEN or RED)
      if (reviewAnswer === 'GREEN' || reviewAnswer === 'RED') {
        // Determine the final status based on reviewAnswer and reviewRejectType
        let kycStatus = 'pending';
        let shouldCloseSDK = false;

        if (reviewAnswer === 'GREEN') {
          kycStatus = 'approved';
          shouldCloseSDK = true; // Close SDK for approved
        } else if (reviewAnswer === 'RED') {
          // RETRY means user can resubmit, FINAL means permanently rejected
          const isFinalRejection = reviewRejectType === 'FINAL';
          kycStatus = isFinalRejection ? 'rejected' : 'resubmission';
          // Only close SDK for FINAL rejection, NOT for resubmission
          shouldCloseSDK = isFinalRejection;
        }

        // Update database with status and rejection type
        updateKycStatus(reviewStatus, reviewAnswer, reviewRejectType);

        // DON'T auto-close SDK - let user see the result and close manually via X button
        // The SDK will show its own success/failure screen

        // Note: User will close the modal manually by clicking X
        // The onComplete callback is no longer called automatically
      } else {
      }
    } else if (type === 'idCheck.onError') {
      console.error('❌ Sumsub error:', payload);
      onError?.(payload);
    }
  }, [onComplete, onError, updateKycStatus, saveApplicantId]);

  // Error handler
  const errorHandler = useCallback((error: any) => {
    console.error('❌ Sumsub SDK error:', error);
    onError?.(error);
  }, [onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#005430] mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading KYC verification...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 h-full">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Error loading KYC: {error}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#005430] text-white rounded-full font-semibold hover:bg-[#005430]/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center p-8 h-full">
        <div className="text-center">
          <p className="text-white text-xl">Initializing verification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden kyc-sdk-container">
      <Suspense fallback={<SDKLoadingSpinner />}>
        <SumsubWebSdk
          accessToken={accessToken}
          expirationHandler={accessTokenExpirationHandler}
          config={{
            lang: 'en',
            customizationName: 'sharematch_dark_mode',
          }}
          options={{
            addViewportTag: true,
            adaptIframeHeight: true,  // SDK controls its own height
          }}
          onMessage={messageHandler}
          onError={errorHandler}
        />
      </Suspense>
    </div>
  );
}
