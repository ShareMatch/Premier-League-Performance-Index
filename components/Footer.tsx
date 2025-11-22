
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="text-center mt-8 text-xs text-gray-500">
      <p className="max-w-md mx-auto">
        <strong>Index Valuation:</strong> The index for the top-performing team will be valued at 100. All other team indices will be valued at 0.1. Prices reflect the current market valuation for each team's performance index asset.
      </p>
    </footer>
  );
};

export default Footer;