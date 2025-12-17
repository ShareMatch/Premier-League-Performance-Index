import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import DetailsCard from "./DetailsCard";
import KYCVerificationCard, {
  KYCStatus,
  DocumentStatus,
} from "./KYCVerificationCard";
import MarketingPreferencesCard from "./MarketingPreferencesCard";
import AccountActionsCard from "./AccountActionsCard";
import EditDetailsModal from "./EditDetailsModal";
import EditMarketingPreferencesModal from "./EditMarketingPreferencesModal";
import ChangePasswordModal from "./ChangePasswordModal";
import DeleteAccountModal from "./DeleteAccountModal";
import PaymentDetailsCard, { PaymentMethod } from "./PaymentDetailsCard";
import PaymentMethodModal, { PaymentOption } from "./PaymentMethodModal";
import BankDetailsModal, { BankDetails } from "./BankDetailsModal";
import { EmailVerificationModal } from "../auth/EmailVerificationModal";
import { WhatsAppVerificationModal } from "../auth/WhatsAppVerificationModal";
import {
  getKycUserStatus,
  fetchUserDetails,
  fetchUserBankingDetails,
  UserDetails,
  UserBankingDetails,
  sendEmailOtp,
  verifyEmailOtp,
  sendWhatsAppOtp,
  verifyWhatsAppOtp,
  updateUserProfile,
  editUserProfile,
  updateMarketingPreferences,
} from "../../lib/api";
import { supabase } from "../../lib/supabase";

// Pending changes interface for verification flows
interface PendingAboutYouChanges {
  email?: string;
  phone?: string;
  whatsapp?: string;
  emailChanged: boolean;
  whatsappChanged: boolean;
}

interface UserData {
  // About You
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  // Address
  address: string;
  city: string;
  state: string;
  country: string;
  postCode: string;
  // Bank Details
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftBic: string;
  bankName: string;
}

interface MyDetailsPageProps {
  onBack: () => void;
  userId?: string;
  userData?: UserData;
  onSignOut?: () => void;
  onOpenKYCModal?: () => void;
}

// Map Sumsub/database status to our display status
const mapKycStatus = (status: string): KYCStatus => {
  switch (status) {
    case "approved":
      return "verified";
    case "rejected":
      return "rejected";
    case "resubmission_requested":
      return "resubmission_requested";
    case "pending":
    case "on_hold":
      return "pending";
    case "started":
    case "not_started":
    default:
      return "not_verified";
  }
};

// Determine document statuses based on overall KYC status
const getDocumentStatuses = (kycStatus: KYCStatus): DocumentStatus => {
  switch (kycStatus) {
    case "verified":
      return "verified";
    case "not_verified":
      return "not_uploaded";
    case "resubmission_requested":
      return "resubmit";
    case "expired":
      return "expired";
    case "rejected":
      return "rejected";
    case "pending":
      return "pending";
    default:
      return "not_uploaded";
  }
};

type EditModalType =
  | "about"
  | "address"
  | "bank"
  | "marketing"
  | "password"
  | "delete"
  | null;

const MyDetailsPage: React.FC<MyDetailsPageProps> = ({
  onBack,
  userId,
  userData,
  onSignOut,
  onOpenKYCModal,
}) => {
  const [kycStatus, setKycStatus] = useState<KYCStatus>("not_verified");
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [userBankingDetails, setUserBankingDetails] =
    useState<UserBankingDetails | null>(null);
  const [activeModal, setActiveModal] = useState<EditModalType>(null);

  // Verification flow state
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showWhatsAppVerification, setShowWhatsAppVerification] =
    useState(false);
  const [pendingChanges, setPendingChanges] =
    useState<PendingAboutYouChanges | null>(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationWhatsApp, setVerificationWhatsApp] = useState("");

  // Marketing preferences state - will be loaded from DB
  const [preferences, setPreferences] = useState([
    { id: "email", label: "Email", enabled: false },
    { id: "whatsapp", label: "WhatsApp", enabled: false },
    { id: "sms", label: "SMS", enabled: false },
  ]);
  const [personalizedMarketing, setPersonalizedMarketing] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Payment details state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("none");
  const [bankDetails, setBankDetails] = useState<BankDetails | undefined>(
    undefined
  );
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);

  // Sync bankDetails state with userBankingDetails from database
  useEffect(() => {
    if (userBankingDetails) {
      setBankDetails({
        accountName: userBankingDetails.account_name || "",
        accountNumber: userBankingDetails.account_number || "",
        iban: userBankingDetails.iban || "",
        swiftBic: userBankingDetails.swift_bic || "",
        bankName: userBankingDetails.bank_name || "",
      });
      setPaymentMethod("bank");
    }
  }, [userBankingDetails]);

  // Format the last login timestamp
  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Build login history from user's source_ip and updated_at
  const loginHistory = userDetails
    ? [
        {
          id: "1",
          timestamp: formatLastLogin(userDetails.updated_at),
          location: userDetails.country || "Unknown",
          countryCode: userDetails.country_code?.toLowerCase() || undefined,
          ip: userDetails.source_ip || "N/A",
          successful: true,
        },
      ]
    : [];

  // Fetch user details, KYC status, banking details, and marketing preferences
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user details, KYC status, banking details, and preferences in parallel
        const fetchPreferences = async () => {
          try {
            // Use maybeSingle() instead of single() to avoid 406 error when no row exists
            const { data, error } = await supabase
              .from("user_preferences")
              .select("*")
              .eq("id", userId)
              .maybeSingle();
            if (error) {
              console.error("Error fetching preferences:", error);
              return null;
            }
            return { data };
          } catch (err) {
            console.error("Exception fetching preferences:", err);
            return null;
          }
        };

        const [details, kycStatusResponse, bankingDetails, userPrefs] =
          await Promise.all([
            fetchUserDetails(userId),
            getKycUserStatus(userId).catch(() => null),
            fetchUserBankingDetails(userId).catch(() => null),
            fetchPreferences(),
          ]);

        if (details) {
          setUserDetails(details);
        }

        // Get KYC status from user_compliance table
        if (kycStatusResponse) {
          setKycStatus(mapKycStatus(kycStatusResponse.kyc_status));
        }

        // Set banking details
        if (bankingDetails) {
          setUserBankingDetails(bankingDetails);
        }

        // Set marketing preferences from database
        if (userPrefs?.data) {
          const prefs = userPrefs.data;
          console.log("📧 User preferences from DB:", prefs);
          setPreferences([
            { id: "email", label: "Email", enabled: Boolean(prefs.email) },
            {
              id: "whatsapp",
              label: "WhatsApp",
              enabled: Boolean(prefs.whatsapp),
            },
            { id: "sms", label: "SMS", enabled: Boolean(prefs.sms) },
          ]);
          setPersonalizedMarketing(Boolean(prefs.personalized_marketing));
          setPreferencesLoaded(true);
        } else {
          // No preferences found - use defaults (for users who signed up before this feature)
          setPreferences([
            { id: "email", label: "Email", enabled: true },
            { id: "whatsapp", label: "WhatsApp", enabled: true },
            { id: "sms", label: "SMS", enabled: false },
          ]);
          setPersonalizedMarketing(true);
          setPreferencesLoaded(true);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setKycStatus("not_verified");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Build user object from fetched data or fallback to props/defaults
  const user = {
    name: userDetails?.full_name || userData?.name || "N/A",
    email: userDetails?.email || userData?.email || "N/A",
    phone: userDetails?.phone_e164 || userData?.phone || "N/A",
    whatsapp: userDetails?.whatsapp_phone_e164 || userData?.whatsapp || "N/A",
    address: userDetails?.address_line || userData?.address || "N/A",
    city: userDetails?.city || userData?.city || "N/A",
    state: userDetails?.region || userData?.state || "N/A",
    country: userDetails?.country || userData?.country || "N/A",
    postCode: userDetails?.postal_code || userData?.postCode || "N/A",
    // Bank details from user_banking_details table
    accountName: userBankingDetails?.account_name || "N/A",
    accountNumber: userBankingDetails?.account_number || "N/A",
    iban: userBankingDetails?.iban || "N/A",
    swiftBic: userBankingDetails?.swift_bic || "N/A",
    bankName: userBankingDetails?.bank_name || "N/A",
  };

  // Get document statuses based on KYC status
  const docStatus = getDocumentStatuses(kycStatus);
  const documents = [
    { name: "Identity Document (ID/Passport)", status: docStatus },
    { name: "Selfie Verification", status: docStatus },
    { name: "Proof of Address", status: docStatus },
  ];

  // Save About You handler - with email/WhatsApp verification
  // IMPORTANT: Email/WhatsApp is NOT updated until OTP is verified
  const handleSaveAboutYou = async (updatedFields: Record<string, string>) => {
    if (!userId) return;

    const currentEmail = userDetails?.email || "";
    const currentWhatsApp = userDetails?.whatsapp_phone_e164 || "";
    const newEmail = updatedFields.email || "";
    const newWhatsApp = updatedFields.whatsapp || "";

    const emailChanged = newEmail !== currentEmail && newEmail !== "";
    const whatsappChanged =
      newWhatsApp !== currentWhatsApp && newWhatsApp !== "";

    // Store pending changes (NOT in DB yet - only after OTP verification)
    const changes: PendingAboutYouChanges = {
      email: newEmail,
      phone: updatedFields.phone,
      whatsapp: newWhatsApp,
      emailChanged,
      whatsappChanged,
    };

    // If email changed, send OTP to NEW email to verify access
    if (emailChanged) {
      try {
        // Send OTP to the NEW email to verify user has access to it
        // currentEmail is used to identify the user, newEmail is where OTP is sent
        console.log(
          "📧 Sending email OTP to new email for verification:",
          newEmail
        );
        await sendEmailOtp(currentEmail, {
          targetEmail: newEmail,
          forProfileChange: true,
        });
        console.log("📧 Email OTP sent to new email successfully");

        setPendingChanges(changes);
        setVerificationEmail(newEmail); // Show NEW email in modal (where OTP was sent)
        setActiveModal(null); // Close edit modal
        setShowEmailVerification(true);
        return; // Wait for email verification before proceeding
      } catch (error: any) {
        console.error("❌ Email OTP error:", error);
        throw new Error(
          error.message || "Failed to send email verification code"
        );
      }
    }

    // If only WhatsApp changed (no email change), send OTP to NEW WhatsApp
    if (whatsappChanged) {
      try {
        // Send OTP to the NEW WhatsApp number to verify user has access to it
        // Identify user by current email, send OTP to new number
        console.log(
          "📱 Sending WhatsApp OTP to new number for verification:",
          newWhatsApp
        );
        await sendWhatsAppOtp({
          email: currentEmail,
          targetPhone: newWhatsApp,
          forProfileChange: true,
        });
        console.log("📱 WhatsApp OTP sent to new number successfully");

        setPendingChanges(changes);
        setVerificationWhatsApp(newWhatsApp); // Show NEW number in modal (where OTP was sent)
        setActiveModal(null); // Close edit modal
        setShowWhatsAppVerification(true);
        return; // Wait for WhatsApp verification before proceeding
      } catch (error: any) {
        console.error("❌ WhatsApp OTP error:", error);
        throw new Error(
          error.message || "Failed to send WhatsApp verification code"
        );
      }
    }

    // No verification needed - just update phone number via edge function
    await editUserProfile({
      currentEmail: currentEmail,
      phone: updatedFields.phone,
    });

    // Refresh user details
    const details = await fetchUserDetails(userId);
    if (details) setUserDetails(details);

    // Close the edit modal (no verification needed)
    setActiveModal(null);
  };

  // Handle email verification success
  // NOW we update the email to the new value (OTP was verified)
  const handleEmailVerificationSuccess = async () => {
    console.log("🎉 handleEmailVerificationSuccess called");
    console.log("📋 pendingChanges:", pendingChanges);

    // Don't close email modal yet if WhatsApp also needs verification
    // This keeps the overlay visible for a continuous experience

    if (!pendingChanges || !userId) {
      console.log("❌ No pending changes or userId - aborting");
      setShowEmailVerification(false);
      setPendingChanges(null);
      return;
    }

    const currentEmail = userDetails?.email || "";

    try {
      // Use the simple edit function (no OTP sending) - we already verified
      if (pendingChanges.emailChanged && pendingChanges.email) {
        console.log(
          "✅ Email verified, updating via editUserProfile to:",
          pendingChanges.email
        );

        // editUserProfile just updates the DB - no OTP sending
        await editUserProfile({
          currentEmail: currentEmail,
          newEmail: pendingChanges.email,
          phone: pendingChanges.phone || undefined,
          emailAlreadyVerified: true,
        });

        console.log("✅ Email updated successfully via editUserProfile");
      }

      // Check if WhatsApp also needs verification
      if (pendingChanges.whatsappChanged && pendingChanges.whatsapp) {
        // Send OTP to NEW WhatsApp number to verify user has access to it
        // Use the NEW email (now in DB) to identify user
        const emailForLookup = pendingChanges.email || currentEmail;
        console.log(
          "📱 WhatsApp also changed, sending OTP to new number:",
          pendingChanges.whatsapp
        );
        await sendWhatsAppOtp({
          email: emailForLookup,
          targetPhone: pendingChanges.whatsapp,
          forProfileChange: true,
        });
        setVerificationWhatsApp(pendingChanges.whatsapp);
        // Close email modal and immediately open WhatsApp modal for seamless transition
        setShowEmailVerification(false);
        setShowWhatsAppVerification(true);
        return; // Don't clear pendingChanges yet
      }

      // All done - close modal and refresh user details
      setShowEmailVerification(false);
      console.log("🔄 Refreshing user details...");
      const details = await fetchUserDetails(userId);
      if (details) {
        console.log("✅ User details refreshed:", details);
        setUserDetails(details);
      }
      setPendingChanges(null);
      console.log("🎉 Email update complete!");
    } catch (error: any) {
      console.error("❌ Failed to update email:", error);
      setShowEmailVerification(false);
      alert("Failed to update email: " + error.message);
      setPendingChanges(null);
    }
  };

  // Handle WhatsApp verification success
  // NOW we update the WhatsApp to the new value (OTP was verified)
  const handleWhatsAppVerificationSuccess = async () => {
    setShowWhatsAppVerification(false);

    if (!pendingChanges || !userId) {
      setPendingChanges(null);
      return;
    }

    // Get the current email (might have been updated if email was also changed)
    const currentEmail =
      pendingChanges.emailChanged && pendingChanges.email
        ? pendingChanges.email
        : userDetails?.email || "";

    try {
      // Use the simple edit function (no OTP sending) - we already verified
      if (pendingChanges.whatsappChanged && pendingChanges.whatsapp) {
        console.log(
          "✅ WhatsApp verified, updating via editUserProfile to:",
          pendingChanges.whatsapp
        );

        // editUserProfile just updates the DB - no OTP sending
        await editUserProfile({
          currentEmail: currentEmail,
          whatsappPhone: pendingChanges.whatsapp,
          phone: pendingChanges.phone || undefined,
          whatsappAlreadyVerified: true,
        });

        console.log("✅ WhatsApp updated successfully via editUserProfile");
      }

      // Refresh user details
      const details = await fetchUserDetails(userId);
      if (details) setUserDetails(details);
    } catch (error: any) {
      console.error("Failed to update WhatsApp:", error);
      alert("Failed to update WhatsApp number: " + error.message);
    }

    setPendingChanges(null);
  };

  // Handle email OTP verification
  // OTP is stored against the user's CURRENT email record
  const handleVerifyEmailOtp = async (code: string): Promise<boolean> => {
    try {
      // OTP is stored against user's current email, so verify using current email
      const currentEmail = userDetails?.email || "";
      console.log(
        "🔐 Verifying email OTP (user identified by:",
        currentEmail,
        ")"
      );
      const result = await verifyEmailOtp(currentEmail, code);
      return result.ok === true;
    } catch (error) {
      console.error("Email OTP verification failed:", error);
      return false;
    }
  };

  // Handle WhatsApp OTP verification
  // OTP is stored against the user's record (identified by email)
  const handleVerifyWhatsAppOtp = async (code: string): Promise<boolean> => {
    try {
      // OTP is stored against user's record, so verify using email to find user
      // Use the email that's currently in DB (might have been updated if email was also changed)
      const emailForLookup =
        pendingChanges?.emailChanged && pendingChanges?.email
          ? pendingChanges.email
          : userDetails?.email || "";
      console.log(
        "🔐 Verifying WhatsApp OTP (user identified by email:",
        emailForLookup,
        ")"
      );
      // forProfileChange: true skips the "already verified" check since user is changing to new number
      const result = await verifyWhatsAppOtp({
        email: emailForLookup,
        token: code,
        forProfileChange: true,
      });
      return result.ok === true;
    } catch (error) {
      console.error("WhatsApp OTP verification failed:", error);
      return false;
    }
  };

  // Handle resend email OTP
  // Send to NEW email (same as initial send)
  const handleResendEmailOtp = async (): Promise<boolean> => {
    try {
      // verificationEmail contains the NEW email (where OTP should be sent)
      // We need current email to identify the user
      const currentEmail = userDetails?.email || "";
      console.log("📧 Resending email OTP to new email:", verificationEmail);
      await sendEmailOtp(currentEmail, {
        targetEmail: verificationEmail,
        forProfileChange: true,
      });
      return true;
    } catch (error) {
      console.error("Failed to resend email OTP:", error);
      return false;
    }
  };

  // Handle resend WhatsApp OTP
  // Send to NEW WhatsApp (same as initial send)
  const handleResendWhatsAppOtp = async (): Promise<boolean> => {
    try {
      // verificationWhatsApp contains the NEW number (where OTP should be sent)
      // We need current email to identify the user
      const currentEmail = userDetails?.email || "";
      console.log(
        "📱 Resending WhatsApp OTP to new number:",
        verificationWhatsApp
      );
      await sendWhatsAppOtp({
        email: currentEmail,
        targetPhone: verificationWhatsApp,
        forProfileChange: true,
      });
      return true;
    } catch (error) {
      console.error("Failed to resend WhatsApp OTP:", error);
      return false;
    }
  };

  // Save Address handler - uses edit-user-profile edge function
  const handleSaveAddress = async (updatedFields: Record<string, string>) => {
    if (!userDetails?.email) return;

    const result = await editUserProfile({
      currentEmail: userDetails.email,
      addressLine: updatedFields.address,
      city: updatedFields.city,
      region: updatedFields.state,
      addressCountry: updatedFields.country,
      postalCode: updatedFields.postCode,
    });

    if (!result.ok) {
      throw new Error("Failed to update address");
    }

    // Refresh user details
    if (userId) {
      const details = await fetchUserDetails(userId);
      if (details) setUserDetails(details);
    }

    // Close the edit modal
    setActiveModal(null);
  };

  // Handle payment method selection
  const handleSelectPaymentMethod = (method: PaymentOption) => {
    setShowPaymentMethodModal(false);
    if (method === "bank") {
      setShowBankDetailsModal(true);
    }
    // Future: handle 'card' and 'crypto' when available
  };

  // Bank Details Modal just displays ShareMatch's company bank accounts
  // No save handler needed - it's a read-only display

  // Save Marketing Preferences handler
  const handleSaveMarketingPreferences = async (
    newPreferences: typeof preferences,
    newPersonalized: boolean
  ) => {
    if (!userId || !userDetails?.email) return;

    // Convert preferences array to payload format
    const emailPref =
      newPreferences.find((p) => p.id === "email")?.enabled ?? false;
    const whatsappPref =
      newPreferences.find((p) => p.id === "whatsapp")?.enabled ?? false;
    const smsPref =
      newPreferences.find((p) => p.id === "sms")?.enabled ?? false;

    // Call edge function to update preferences (bypasses RLS)
    await updateMarketingPreferences({
      email: userDetails.email,
      preferences: {
        email: emailPref,
        whatsapp: whatsappPref,
        sms: smsPref,
        personalized_marketing: newPersonalized,
      },
    });

    // Update local state
    setPreferences(newPreferences);
    setPersonalizedMarketing(newPersonalized);
  };

  // Change Password handler
  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    // Get current user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser?.email) throw new Error("No user email found");

    // Verify current password by attempting to sign in
    // This validates the password without creating a new session
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password: currentPassword,
    });

    if (verifyError) {
      // Check for specific error messages
      if (verifyError.message.includes("Invalid login credentials")) {
        throw new Error("Current password is incorrect");
      }
      throw new Error("Failed to verify current password");
    }

    // Current password is correct, now update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      if (updateError.message.includes("should be different")) {
        throw new Error("New password must be different from current password");
      }
      throw new Error(updateError.message || "Failed to update password");
    }

    // Password updated successfully - modal will show success message
  };

  // Delete Account handler
  const handleDeleteAccount = async () => {
    // TODO: Implement account deletion
    // This should call a backend function to properly delete the user
    console.log("Delete account requested");
    alert("Account deletion feature coming soon. Please contact support.");
  };

  // Show loading spinner while fetching data OR while userId is not yet available
  // This prevents flash of stale data on page refresh
  if (loading || !userDetails) {
    return (
      <div className="h-screen bg-gray-900 text-white flex flex-col font-sans overflow-hidden">
        {/* Header - Sticky on scroll */}
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-4 max-w-7xl mx-auto">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold font-sans">
              My Details
            </h1>
          </div>
        </div>
        {/* Loading Spinner */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm font-sans">
              Loading your details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col font-sans overflow-hidden">
      {/* Header - Sticky on scroll */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold font-sans">My Details</h1>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-y-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto">
          {/* Cards Grid - Responsive: 1 col mobile, 2 cols tablet, 3 cols desktop */}
          {/* On mobile: cards take natural height. On tablet+: equal heights */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4 md:[grid-auto-rows:1fr]">
            {/* Row 1 */}
            {/* About You */}
            <DetailsCard
              title="About You"
              fields={[
                { label: "Name:", value: user.name },
                { label: "Email Address", value: user.email },
                { label: "Phone Number:", value: user.phone },
                { label: "WhatsApp Number:", value: user.whatsapp },
              ]}
              onEdit={() => setActiveModal("about")}
            />

            {/* Address */}
            <DetailsCard
              title="Address"
              fields={[
                { label: "Address:", value: user.address },
                { label: "Town/City:", value: user.city },
                { label: "State/Region:", value: user.state },
                { label: "Country:", value: user.country },
                { label: "Post Code:", value: user.postCode },
              ]}
              onEdit={() => setActiveModal("address")}
            />

            {/* KYC Verification */}
            {loading ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-md sm:rounded-xl overflow-hidden animate-pulse border border-gray-700">
                <div className="h-6 sm:h-12 bg-gray-800" />
                <div className="p-2 sm:p-4 space-y-1 sm:space-y-3">
                  <div className="h-3 sm:h-6 bg-gray-700 rounded-full w-12 sm:w-24" />
                  <div className="h-1.5 sm:h-3 bg-gray-700 rounded w-20 sm:w-40" />
                  <div className="space-y-0.5 sm:space-y-2">
                    <div className="h-5 sm:h-10 bg-gray-700 rounded sm:rounded-lg" />
                    <div className="h-5 sm:h-10 bg-gray-700 rounded sm:rounded-lg" />
                    <div className="h-5 sm:h-10 bg-gray-700 rounded sm:rounded-lg" />
                  </div>
                </div>
              </div>
            ) : (
              <KYCVerificationCard
                status={kycStatus}
                documents={documents}
                onUpdateKYC={onOpenKYCModal}
              />
            )}

            {/* Row 2 */}
            {/* Marketing Preferences */}
            <MarketingPreferencesCard
              preferences={preferences}
              personalizedMarketing={personalizedMarketing}
              onEdit={() => setActiveModal("marketing")}
            />

            {/* Payment Details */}
            <PaymentDetailsCard
              paymentMethod={paymentMethod}
              bankDetails={bankDetails}
              onAddPayment={() => setShowPaymentMethodModal(true)}
              onEdit={() => setShowBankDetailsModal(true)}
            />

            {/* Account Actions */}
            <AccountActionsCard
              loginHistory={loginHistory}
              onChangePassword={() => setActiveModal("password")}
              onSignOut={onSignOut}
              onDeleteAccount={() => setActiveModal("delete")}
            />
          </div>

          {/* Footer Links */}
          <div className="mt-4 sm:mt-6 pb-4 text-left">
            <p className="text-gray-500 text-[10px] sm:text-xs font-sans">
              Read our{" "}
              <button className="text-brand-primary hover:underline font-sans">
                Privacy Policy
              </button>
              ,{" "}
              <button className="text-brand-primary hover:underline font-sans">
                Terms & Conditions
              </button>{" "}
              and{" "}
              <button className="text-brand-primary hover:underline font-sans">
                Legal & Regulatory
              </button>{" "}
              for more information.
            </p>
          </div>
        </div>
      </div>

      {/* Edit About You Modal */}
      <EditDetailsModal
        isOpen={activeModal === "about"}
        onClose={() => setActiveModal(null)}
        title="About You"
        fields={[
          {
            key: "name",
            label: "Name",
            value: user.name === "N/A" ? "" : user.name,
            editable: false,
          },
          {
            key: "email",
            label: "Email Address",
            value: user.email === "N/A" ? "" : user.email,
            type: "email",
            hint: "OTP will be sent to the new email",
          },
          {
            key: "phone",
            label: "Phone Number",
            value: user.phone === "N/A" ? "" : user.phone,
            type: "tel",
          },
          {
            key: "whatsapp",
            label: "WhatsApp Number",
            value: user.whatsapp === "N/A" ? "" : user.whatsapp,
            type: "tel",
            hint: "OTP will be sent to the new WhatsApp number",
          },
        ]}
        onSave={handleSaveAboutYou}
        currentEmail={
          userDetails?.email || (user.email !== "N/A" ? user.email : undefined)
        }
        currentWhatsApp={
          userDetails?.whatsapp_phone_e164 ||
          (user.whatsapp !== "N/A" ? user.whatsapp : undefined)
        }
        currentUserId={userId}
      />

      {/* Edit Address Modal */}
      <EditDetailsModal
        isOpen={activeModal === "address"}
        onClose={() => setActiveModal(null)}
        title="Address"
        fields={[
          {
            key: "address",
            label: "Address",
            value: user.address === "N/A" ? "" : user.address,
          },
          {
            key: "city",
            label: "Town/City",
            value: user.city === "N/A" ? "" : user.city,
          },
          {
            key: "state",
            label: "State/Region",
            value: user.state === "N/A" ? "" : user.state,
          },
          {
            key: "country",
            label: "Country",
            value: user.country === "N/A" ? "" : user.country,
          },
          {
            key: "postCode",
            label: "Post Code",
            value: user.postCode === "N/A" ? "" : user.postCode,
          },
        ]}
        onSave={handleSaveAddress}
      />

      {/* Payment Method Selection Modal */}
      <PaymentMethodModal
        isOpen={showPaymentMethodModal}
        onClose={() => setShowPaymentMethodModal(false)}
        onSelectMethod={handleSelectPaymentMethod}
      />

      {/* Bank Details Modal - Shows ShareMatch company bank accounts */}
      <BankDetailsModal
        isOpen={showBankDetailsModal}
        onClose={() => setShowBankDetailsModal(false)}
        onBack={() => {
          setShowBankDetailsModal(false);
          setShowPaymentMethodModal(true);
        }}
      />

      {/* Edit Marketing Preferences Modal */}
      <EditMarketingPreferencesModal
        isOpen={activeModal === "marketing"}
        onClose={() => setActiveModal(null)}
        preferences={preferences}
        personalizedMarketing={personalizedMarketing}
        onSave={handleSaveMarketingPreferences}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={activeModal === "password"}
        onClose={() => setActiveModal(null)}
        onSave={handleChangePassword}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={activeModal === "delete"}
        onClose={() => setActiveModal(null)}
        onDelete={handleDeleteAccount}
      />

      {/* Email Verification Modal - for email change */}
      <EmailVerificationModal
        isOpen={showEmailVerification}
        onClose={() => {
          setShowEmailVerification(false);
          setPendingChanges(null);
        }}
        email={verificationEmail}
        onVerificationSuccess={handleEmailVerificationSuccess}
        onVerifyCode={handleVerifyEmailOtp}
        onResendCode={handleResendEmailOtp}
      />

      {/* WhatsApp Verification Modal - for WhatsApp number change */}
      <WhatsAppVerificationModal
        isOpen={showWhatsAppVerification}
        onClose={() => {
          setShowWhatsAppVerification(false);
          setPendingChanges(null);
        }}
        whatsappPhone={verificationWhatsApp}
        onVerificationSuccess={handleWhatsAppVerificationSuccess}
        onVerifyCode={handleVerifyWhatsAppOtp}
        onResendCode={handleResendWhatsAppOtp}
      />
    </div>
  );
};

export default MyDetailsPage;
