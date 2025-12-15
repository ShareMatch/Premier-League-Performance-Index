import React from 'react';
import { createPortal } from 'react-dom';
import { FileText, X } from 'lucide-react';
// Import text files directly using Vite's ?raw suffix
import termsContent from '../resources/TermandConditions.txt?raw';
import riskContent from '../resources/RiskandPerformance.txt?raw';

interface TermsConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'risk';
}

// Parse content and render with proper formatting
const renderFormattedContent = (content: string, type: 'terms' | 'risk') => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const elements: React.ReactNode[] = [];

  // Main section heading pattern: number followed by period, space, and ALL CAPS text (like "1. THESE TERMS") or just "TAX"
  const sectionHeadingPattern = /^(\d+\.\s+[A-Z][A-Z\s&]+$|^TAX$)/;

  // Sub-section pattern: starts with number.number (like 3.1, 6.2)
  const subSectionPattern = /^(\d+\.\d+)/;

  let isFirstLines = true;
  let introCount = 0;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // First line - Main title (Terms & Conditions or Risk & Performance Statement)
    if (index === 0) {
      elements.push(
        <h1 key={index} className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-2">
          {trimmedLine}
        </h1>
      );
      return;
    }

    // Second line - Company name (ShareMatch Ltd)
    if (index === 1 && trimmedLine === 'ShareMatch Ltd') {
      elements.push(
        <h2 key={index} className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center mb-4">
          {trimmedLine}
        </h2>
      );
      return;
    }

    // Third line - Subtitle (TERMS OF USE or IMPORTANT RISK DISCLOSURE)
    if (index === 2 && (trimmedLine === 'TERMS OF USE' || trimmedLine === 'IMPORTANT RISK DISCLOSURE')) {
      elements.push(
        <h3 key={index} className="text-lg sm:text-xl md:text-2xl font-semibold text-[#005430] text-center mb-6">
          {trimmedLine}
        </h3>
      );
      return;
    }

    // Intro/disclaimer paragraphs (ALL CAPS, before numbered sections)
    if (isFirstLines && trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 20 && !sectionHeadingPattern.test(trimmedLine)) {
      introCount++;
      elements.push(
        <p key={index} className="text-sm sm:text-base text-white text-center font-medium mb-4 px-2">
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

    // Section headings (1. THESE TERMS, 2. OUR PRIVACY POLICY, TAX, etc.)
    if (sectionHeadingPattern.test(trimmedLine)) {
      elements.push(
        <h4
          key={index}
          className="text-base sm:text-lg font-semibold mt-6 mb-3"
          style={{
            background: 'linear-gradient(180deg, #019170 16.1%, #09FFC6 50.42%, #019170 84.75%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
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
          <p key={index} className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-2">
            <span className="font-semibold text-white">{number}</span>{rest}
          </p>
        );
        return;
      }
    }

    // List items (a), (b), (c), etc.
    if (/^\([a-z]\)/.test(trimmedLine)) {
      elements.push(
        <p key={index} className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-1 pl-4 sm:pl-6">
          {trimmedLine}
        </p>
      );
      return;
    }

    // Regular paragraphs
    elements.push(
      <p key={index} className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-2">
        {trimmedLine}
      </p>
    );
  });

  return elements;
};

const TermsConditionsModal: React.FC<TermsConditionsModalProps> = ({
  isOpen,
  onClose,
  type,
}) => {
  if (!isOpen) return null;

  const content = type === 'terms' ? termsContent : riskContent;
  const title = type === 'terms' ? 'Terms & Conditions' : 'Risk & Performance Statement';

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="max-w-[95vw] sm:max-w-lg md:max-w-2xl lg:max-w-3xl w-full overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          borderRadius: '16px',
          background: 'rgba(4, 34, 34, 0.85)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-10"
          style={{
            background: '#021A1A',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#005430] flex-shrink-0" />
            <span>{title}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className="px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto scrollbar-hide"
          style={{ maxHeight: 'calc(85vh - 60px)' }}
        >
          {renderFormattedContent(content, type)}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TermsConditionsModal;

