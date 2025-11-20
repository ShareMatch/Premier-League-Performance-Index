import React from 'react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <div className="text-center py-8">
      <h1 className="text-4xl font-bold text-[#3AA189] mb-2">{title} Performance Index</h1>
      <p className="text-gray-400">Tokenised Asset Marketplace</p>
    </div>
  );
};

export default Header;