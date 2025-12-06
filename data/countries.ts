export interface Country {
  name: string;
  code: string;
  dial_code: string;
  flag: string;
  format?: string;
  length?: number | [number, number];
}

export const countries: Country[] = [
  { name: "Saudi Arabia", code: "SA", dial_code: "+966", flag: "🇸🇦", format: "XX XXX XXXX", length: 9 },
  { name: "United States", code: "US", dial_code: "+1", flag: "🇺🇸", format: "XXX XXX XXXX", length: 10 },
  { name: "United Kingdom", code: "GB", dial_code: "+44", flag: "🇬🇧", format: "XXXX XXXXXX", length: 10 },
  { name: "United Arab Emirates", code: "AE", dial_code: "+971", flag: "🇦🇪", format: "XX XXX XXXX", length: 9 },
  { name: "India", code: "IN", dial_code: "+91", flag: "🇮🇳", format: "XXXXX XXXXX", length: 10 },
  { name: "Pakistan", code: "PK", dial_code: "+92", flag: "🇵🇰", format: "XXX XXXXXXX", length: 10 },
  { name: "Canada", code: "CA", dial_code: "+1", flag: "🇨🇦", format: "XXX XXX XXXX", length: 10 },
  { name: "Australia", code: "AU", dial_code: "+61", flag: "🇦🇺", format: "XXX XXX XXX", length: 9 },
  { name: "Germany", code: "DE", dial_code: "+49", flag: "🇩🇪", format: "XXXX XXXXXXX", length: [10, 11] },
  { name: "France", code: "FR", dial_code: "+33", flag: "🇫🇷", format: "X XX XX XX XX", length: 9 },
  { name: "Italy", code: "IT", dial_code: "+39", flag: "🇮🇹", format: "XXX XXX XXXX", length: 10 },
  { name: "Spain", code: "ES", dial_code: "+34", flag: "🇪🇸", format: "XXX XXX XXX", length: 9 },
  { name: "Netherlands", code: "NL", dial_code: "+31", flag: "🇳🇱", format: "X XXXXXXXX", length: 9 },
  { name: "Belgium", code: "BE", dial_code: "+32", flag: "🇧🇪", format: "XXX XX XX XX", length: 9 },
  { name: "Switzerland", code: "CH", dial_code: "+41", flag: "🇨🇭", format: "XX XXX XX XX", length: 9 },
  { name: "Austria", code: "AT", dial_code: "+43", flag: "🇦🇹", format: "XXX XXXXXXX", length: [10, 11] },
  { name: "Sweden", code: "SE", dial_code: "+46", flag: "🇸🇪", format: "XX XXX XX XX", length: 9 },
  { name: "Norway", code: "NO", dial_code: "+47", flag: "🇳🇴", format: "XXX XX XXX", length: 8 },
  { name: "Denmark", code: "DK", dial_code: "+45", flag: "🇩🇰", format: "XX XX XX XX", length: 8 },
  { name: "Finland", code: "FI", dial_code: "+358", flag: "🇫🇮", format: "XX XXX XXXX", length: [9, 10] },
  { name: "Poland", code: "PL", dial_code: "+48", flag: "🇵🇱", format: "XXX XXX XXX", length: 9 },
  { name: "Portugal", code: "PT", dial_code: "+351", flag: "🇵🇹", format: "XXX XXX XXX", length: 9 },
  { name: "Ireland", code: "IE", dial_code: "+353", flag: "🇮🇪", format: "XX XXX XXXX", length: 9 },
  { name: "New Zealand", code: "NZ", dial_code: "+64", flag: "🇳🇿", format: "XX XXX XXXX", length: [9, 10] },
  { name: "Singapore", code: "SG", dial_code: "+65", flag: "🇸🇬", format: "XXXX XXXX", length: 8 },
  { name: "Hong Kong", code: "HK", dial_code: "+852", flag: "🇭🇰", format: "XXXX XXXX", length: 8 },
  { name: "Japan", code: "JP", dial_code: "+81", flag: "🇯🇵", format: "XX XXXX XXXX", length: 10 },
  { name: "South Korea", code: "KR", dial_code: "+82", flag: "🇰🇷", format: "XX XXXX XXXX", length: 10 },
  { name: "China", code: "CN", dial_code: "+86", flag: "🇨🇳", format: "XXX XXXX XXXX", length: 11 },
  { name: "Malaysia", code: "MY", dial_code: "+60", flag: "🇲🇾", format: "XX XXXX XXXX", length: [9, 10] },
  { name: "Thailand", code: "TH", dial_code: "+66", flag: "🇹🇭", format: "XX XXX XXXX", length: 9 },
  { name: "Indonesia", code: "ID", dial_code: "+62", flag: "🇮🇩", format: "XXX XXXX XXXX", length: [10, 12] },
  { name: "Philippines", code: "PH", dial_code: "+63", flag: "🇵🇭", format: "XXX XXX XXXX", length: 10 },
  { name: "Vietnam", code: "VN", dial_code: "+84", flag: "🇻🇳", format: "XXX XXX XXXX", length: 10 },
  { name: "Brazil", code: "BR", dial_code: "+55", flag: "🇧🇷", format: "XX XXXXX XXXX", length: 11 },
  { name: "Mexico", code: "MX", dial_code: "+52", flag: "🇲🇽", format: "XX XXXX XXXX", length: 10 },
  { name: "Argentina", code: "AR", dial_code: "+54", flag: "🇦🇷", format: "XX XXXX XXXX", length: 10 },
  { name: "Chile", code: "CL", dial_code: "+56", flag: "🇨🇱", format: "X XXXX XXXX", length: 9 },
  { name: "Colombia", code: "CO", dial_code: "+57", flag: "🇨🇴", format: "XXX XXX XXXX", length: 10 },
  { name: "South Africa", code: "ZA", dial_code: "+27", flag: "🇿🇦", format: "XX XXX XXXX", length: 9 },
  { name: "Nigeria", code: "NG", dial_code: "+234", flag: "🇳🇬", format: "XXX XXX XXXX", length: 10 },
  { name: "Egypt", code: "EG", dial_code: "+20", flag: "🇪🇬", format: "XX XXXX XXXX", length: 10 },
  { name: "Kenya", code: "KE", dial_code: "+254", flag: "🇰🇪", format: "XXX XXXXXX", length: 9 },
  { name: "Morocco", code: "MA", dial_code: "+212", flag: "🇲🇦", format: "XX XXXX XXX", length: 9 },
  { name: "Turkey", code: "TR", dial_code: "+90", flag: "🇹🇷", format: "XXX XXX XXXX", length: 10 },
  { name: "Russia", code: "RU", dial_code: "+7", flag: "🇷🇺", format: "XXX XXX XX XX", length: 10 },
  { name: "Ukraine", code: "UA", dial_code: "+380", flag: "🇺🇦", format: "XX XXX XX XX", length: 9 },
  { name: "Israel", code: "IL", dial_code: "+972", flag: "🇮🇱", format: "XX XXX XXXX", length: 9 },
  { name: "Qatar", code: "QA", dial_code: "+974", flag: "🇶🇦", format: "XXXX XXXX", length: 8 },
  { name: "Kuwait", code: "KW", dial_code: "+965", flag: "🇰🇼", format: "XXXX XXXX", length: 8 },
  { name: "Bahrain", code: "BH", dial_code: "+973", flag: "🇧🇭", format: "XXXX XXXX", length: 8 },
  { name: "Oman", code: "OM", dial_code: "+968", flag: "🇴🇲", format: "XXXX XXXX", length: 8 },
  { name: "Jordan", code: "JO", dial_code: "+962", flag: "🇯🇴", format: "X XXXX XXXX", length: 9 },
  { name: "Lebanon", code: "LB", dial_code: "+961", flag: "🇱🇧", format: "XX XXX XXX", length: 8 },
  { name: "Bangladesh", code: "BD", dial_code: "+880", flag: "🇧🇩", format: "XXXX XXXXXX", length: 10 },
  { name: "Sri Lanka", code: "LK", dial_code: "+94", flag: "🇱🇰", format: "XX XXX XXXX", length: 9 },
  { name: "Nepal", code: "NP", dial_code: "+977", flag: "🇳🇵", format: "XXX XXX XXXX", length: 10 },
  { name: "Greece", code: "GR", dial_code: "+30", flag: "🇬🇷", format: "XXX XXX XXXX", length: 10 },
  { name: "Czech Republic", code: "CZ", dial_code: "+420", flag: "🇨🇿", format: "XXX XXX XXX", length: 9 },
  { name: "Romania", code: "RO", dial_code: "+40", flag: "🇷🇴", format: "XXX XXX XXX", length: 9 },
  { name: "Hungary", code: "HU", dial_code: "+36", flag: "🇭🇺", format: "XX XXX XXXX", length: 9 },
];

export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(c => c.code === code);
};

export const getCountryByDialCode = (dialCode: string): Country | undefined => {
  return countries.find(c => c.dial_code === dialCode);
};

