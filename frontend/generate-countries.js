const fs = require('fs');

async function fetchCountries() {
  try {
    const res = await fetch('https://restcountries.com/v3.1/all');
    const data = await res.json();
    
    // Process and sort by name
    const countries = data
      .filter(c => c.idd && c.idd.root)
      .map(c => {
        const dialCode = c.idd.root + (c.idd.suffixes ? c.idd.suffixes[0] : '');
        return {
          code: c.cca2,
          name: c.name.common,
          dialCode: dialCode,
          flag: c.flag || '',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const fileContent = `export interface CountryData {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES: CountryData[] = ${JSON.stringify(countries, null, 2)};
`;

    fs.mkdirSync('./src/features/onboarding/data', { recursive: true });
    fs.writeFileSync('./src/features/onboarding/data/countries.ts', fileContent);
    console.log('Successfully generated countries.ts with ' + countries.length + ' countries.');
  } catch (err) {
    console.error('Error generating countries:', err);
  }
}

fetchCountries();
