
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#3AA189] tracking-wider">
        Premier League Performance Index
      </h1>
      <p className="text-gray-400 mt-2 text-sm sm:text-base">
        Tokenised Asset Marketplace
      </p>
    </header>
  );
};

export default Header;