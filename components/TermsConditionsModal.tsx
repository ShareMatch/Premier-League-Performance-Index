import React from "react";
import { createPortal } from "react-dom";
import { FileText, X } from "lucide-react";
// Import text files directly using Vite's ?raw suffix
import termsContent from "../resources/TermandConditions.txt?raw";
import legalContent from "../resources/LegalandRegulatory.txt?raw";
import privacyContent from "../resources/PrivacyPolicy.txt?raw";
import riskContent from "../resources/RiskandPerformance.txt?raw";

interface TermsConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "terms" | "risk" | "privacy";
  // Optional callback to open a different legal modal from inside this modal
  onOpenOther?: (type: "terms" | "risk" | "privacy") => void;
}

// Parse content and render with proper formatting
const renderFormattedContent = (
  content: string,
  type: "terms" | "risk" | "privacy",
  // optional modalTitle allows injecting a consistent title when the
  // source file doesn't include the large heading the Terms file has.
  modalTitle?: string,
  onOpenOther?: (type: "terms" | "risk" | "privacy") => void
) => {
  const lines = content.split("\n").filter((line) => line.trim() !== "");
  const elements: React.ReactNode[] = [];

  // Main section heading pattern: number followed by period, space, and the heading text (like "1. THESE TERMS" or "1. Information We May Collect From You") or just "TAX"
  // Accept Title Case headings as well as ALL CAPS so PrivacyPolicy headings are detected.
  const sectionHeadingPattern = /^(\d+\.\s+.*$|^TAX$)/;

  // Explicit short headings list - add words/phrases here to force them to render
  // as section headings. Use lower-case values; matching is done against the
  // normalized line (trailing period removed). Examples: 'cookies',
  // 'information you give us'. You can add or remove entries as needed.
  const explicitShortHeadings = new Set<string>([
    "information you give us",
    "information we collect about you",
    "information we receive from other sources",
    "cookies",
    "uses made of your information",
    "disclosure of your information",
    "where we store your personal data",
    "your rights",
    "access to information",
    "changes to our privacy policy",
    "contact",
    // Legal & Regulatory specific headings
    "certified sophisticated investor",
    "self certified sophisticated investor",
    "high net worth investor",
    "risk factors",
    "contents of this website",
    "data protection",
  ]);

  // Sub-section pattern: starts with number.number (like 3.1, 6.2)
  const subSectionPattern = /^(\d+\.\d+)/;

  let isFirstLines = true;
  let introCount = 0;
  let skipOriginalFirstLine = false;
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    const normalized = trimmedLine.replace(/\.$/, "").toLowerCase();

    // If caller provided a modalTitle and the file doesn't already start
    // with that title, inject the large title as the first rendered block.
    // This ensures Privacy Policy uses the same big heading styling as
    // the Terms & Risk docs even if the raw text file omits it.
    if (index === 0 && modalTitle) {
      const firstLineLower = trimmedLine.toLowerCase();
      const modalTitleLower = modalTitle.toLowerCase();
      if (!firstLineLower.includes(modalTitleLower)) {
        elements.push(
          <h1
            key={`injected-title`}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-2"
          >
            {modalTitle}
          </h1>
        );
        // If we inject the canonical title, skip rendering the raw first line
        // to avoid duplicate large headings (so you see only the injected title).
        skipOriginalFirstLine = true;
      }
    }

    // First line - Main title (Terms & Conditions or Risk & Performance Statement)
    if (index === 0) {
      if (skipOriginalFirstLine) return; // already injected canonical title
      elements.push(
        <h1
          key={index}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-2"
        >
          {trimmedLine}
        </h1>
      );
      return;
    }

    // Second line - Company name (ShareMatch Ltd)
    if (index === 1 && trimmedLine === "ShareMatch Ltd") {
      elements.push(
        <h2
          key={index}
          className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center mb-4"
        >
          {trimmedLine}
        </h2>
      );
      return;
    }

    // Third line - Subtitle (TERMS OF USE or IMPORTANT RISK DISCLOSURE)
    if (
      index === 2 &&
      (trimmedLine === "TERMS OF USE" ||
        trimmedLine === "IMPORTANT RISK DISCLOSURE")
    ) {
      elements.push(
        <h3
          key={index}
          className="text-lg sm:text-xl md:text-2xl font-semibold text-[#005430] text-center mb-6"
        >
          {trimmedLine}
        </h3>
      );
      return;
    }

    // Intro/disclaimer paragraphs (ALL CAPS, before numbered sections)
    // Skip this rule for any lines we've explicitly marked as short headings
    if (
      isFirstLines &&
      trimmedLine === trimmedLine.toUpperCase() &&
      trimmedLine.length > 20 &&
      !sectionHeadingPattern.test(trimmedLine) &&
      !explicitShortHeadings.has(normalized)
    ) {
      introCount++;
      elements.push(
        <p
          key={index}
          className="text-sm sm:text-base text-white text-center font-medium mb-4 px-2"
        >
          {trimmedLine}
        </p>
      );
      if (introCount >= 2) isFirstLines = false;
      return;
    }

    // Once we hit a numbered section, we're past the intro
    if (sectionHeadingPattern.test(trimmedLine)) {
      isFirstLines = false;
    }

    // Short title detection: first check explicit list (easiest to control).
    // `normalized` was calculated earlier to avoid redeclaration.
    if (
      !sectionHeadingPattern.test(trimmedLine) &&
      explicitShortHeadings.has(normalized)
    ) {
      elements.push(
        <h4
          key={index}
          className="text-base sm:text-lg font-semibold mt-6 mb-3"
          style={{
            background:
              "linear-gradient(180deg, #019170 16.1%, #09FFC6 50.42%, #019170 84.75%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {trimmedLine.replace(/\.$/, "")}
        </h4>
      );
      isFirstLines = false;
      return;
    }

    // Section headings (1. THESE TERMS, 2. OUR PRIVACY POLICY, TAX, etc.)
    if (sectionHeadingPattern.test(trimmedLine)) {
      elements.push(
        <h4
          key={index}
          className="text-base sm:text-lg font-semibold mt-6 mb-3"
          style={{
            background:
              "linear-gradient(180deg, #019170 16.1%, #09FFC6 50.42%, #019170 84.75%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {trimmedLine}
        </h4>
      );
      return;
    }

    // Sub-sections (3.1, 6.2, etc.) - bold the number
    if (subSectionPattern.test(trimmedLine)) {
      const match = trimmedLine.match(subSectionPattern);
      if (match) {
        const number = match[1];
        const rest = trimmedLine.slice(number.length);
        elements.push(
          <p
            key={index}
            className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-2"
          >
            <span className="font-semibold text-white">{number}</span>
            {rest}
          </p>
        );
        return;
      }
    }

    // List items (a), (b), (c), etc.
    if (/^\([a-z]\)/.test(trimmedLine)) {
      elements.push(
        <p
          key={index}
          className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-1 pl-4 sm:pl-6"
        >
          {trimmedLine}
        </p>
      );
      return;
    }

    // Helper function to render text with email links
    const renderTextWithEmailLinks = (text: string): React.ReactNode[] => {
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const parts = text.split(emailRegex);
      
      return parts.map((part, i) => {
        if (emailRegex.test(part)) {
          // Reset regex lastIndex since we're reusing it
          emailRegex.lastIndex = 0;
          return (
            <a
              key={i}
              href={`mailto:${part}`}
              className="text-[#00A651] hover:underline"
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      });
    };

    // Regular paragraphs - detect inline references to Terms or Privacy and
    // render them as clickable links that call onOpenOther(type).
    const linkRegex = /(terms of use|privacy policy)/i;
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const hasEmail = emailRegex.test(trimmedLine);
    emailRegex.lastIndex = 0; // Reset after test
    
    if (onOpenOther && linkRegex.test(trimmedLine)) {
      const parts = trimmedLine.split(linkRegex);
      const matches = trimmedLine.match(linkRegex);
      elements.push(
        <p
          key={index}
          className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-2"
        >
          {parts.map((part, i) => {
            // parts alternates: text, match, text, match, ... so check original
            if (i % 2 === 1) {
              const match = part.toLowerCase();
              if (match.includes("terms")) {
                return (
                  <button
                    key={i}
                    onClick={() => onOpenOther("terms")}
                    className="text-brand-primary hover:underline"
                  >
                    {part}
                  </button>
                );
              }
              if (match.includes("privacy")) {
                return (
                  <button
                    key={i}
                    onClick={() => onOpenOther("privacy")}
                    className="text-brand-primary hover:underline"
                  >
                    {part}
                  </button>
                );
              }
            }
            // Check for emails in this part
            return <span key={i}>{renderTextWithEmailLinks(part)}</span>;
          })}
        </p>
      );
    } else if (hasEmail) {
      // Line has email but no Terms/Privacy links
      elements.push(
        <p
          key={index}
          className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-2"
        >
          {renderTextWithEmailLinks(trimmedLine)}
        </p>
      );
    } else {
      elements.push(
        <p
          key={index}
          className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-2"
        >
          {trimmedLine}
        </p>
      );
    }
  });

  return elements;
};

const TermsConditionsModal: React.FC<TermsConditionsModalProps> = ({
  isOpen,
  onClose,
  type,
  onOpenOther,
}) => {
  if (!isOpen) return null;

  let content = termsContent;
  let title = "Terms & Conditions";
  if (type === "risk") {
    content = riskContent;
    title = "Risk & Performance Statement";
  } else if (type === "privacy") {
    content = privacyContent;
    title = "Privacy Policy";
  }

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        data-testid={`${type}-modal`}
        className="max-w-[95vw] sm:max-w-lg md:max-w-2xl lg:max-w-3xl w-full overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          borderRadius: "16px",
          background: "rgba(4, 34, 34, 0.85)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          maxHeight: "85vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-10"
          style={{
            background: "#021A1A",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#005430] flex-shrink-0" />
            <span>{title}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            data-testid={`${type}-modal-close-button`}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className="px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto scrollbar-hide"
          style={{ maxHeight: "calc(85vh - 60px)" }}
        >
          {renderFormattedContent(content, type, title, onOpenOther)}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TermsConditionsModal;
