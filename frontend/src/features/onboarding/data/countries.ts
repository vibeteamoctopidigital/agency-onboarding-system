export interface CountryData {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  phoneFormat: RegExp;
  idFormat: RegExp;
}

export const COUNTRIES: CountryData[] = [
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸", phoneFormat: /^\d{10}$/, idFormat: /^\d{3}-\d{2}-\d{4}$/ }, // SSN format
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", phoneFormat: /^\d{10}$/, idFormat: /^[A-Z]{2}\d{6}[A-D]$/i }, // NIN format
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦", phoneFormat: /^\d{10}$/, idFormat: /^\d{3}-\d{3}-\d{3}$/ }, // SIN format
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺", phoneFormat: /^\d{9}$/, idFormat: /^\d{9}$/ },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳", phoneFormat: /^\d{11}$/, idFormat: /^\d{18}$/ }, // Resident ID
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳", phoneFormat: /^\d{10}$/, idFormat: /^\d{12}$/ }, // Aadhaar
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪", phoneFormat: /^\d{10,11}$/, idFormat: /^\d{11}$/ }, // Tax ID
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷", phoneFormat: /^\d{9}$/, idFormat: /^\d{15}$/ },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵", phoneFormat: /^\d{10,11}$/, idFormat: /^\d{12}$/ }, // My Number
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷", phoneFormat: /^\d{10,11}$/, idFormat: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/ }, // CPF
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽", phoneFormat: /^\d{10}$/, idFormat: /^[A-Z]{4}\d{6}[HM][A-Z]{5}\d{2}$/i }, // CURP
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦", phoneFormat: /^\d{9}$/, idFormat: /^\d{13}$/ },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬", phoneFormat: /^\d{10}$/, idFormat: /^\d{11}$/ }, // NIN
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪", phoneFormat: /^\d{9}$/, idFormat: /^784-\d{4}-\d{7}-\d{1}$/ },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬", phoneFormat: /^\d{8}$/, idFormat: /^[STFG]\d{7}[A-Z]$/i },
];
