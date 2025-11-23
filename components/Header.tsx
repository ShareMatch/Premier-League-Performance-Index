import React from 'react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <div className="text-center py-4">
      <h1 className="text-2xl font-bold text-[#3AA189] mb-1">{title} Performance Index</h1>
      <p className="text-gray-400 text-sm">Tokenised Asset Marketplace</p>
    </div>
  );
};

export default Header;