import fs from 'fs';

const filePath = 'e:/Realtynow_new/src/pages/public/home.tsx';
let code = fs.readFileSync(filePath, 'utf8');

if (!code.includes('ChevronDown')) {
  // Find the lucide-react import and add ChevronDown
  const lucideImportMatch = code.match(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"]/);
  if (lucideImportMatch) {
    const importContent = lucideImportMatch[1];
    if (!importContent.includes('ChevronDown')) {
      const newImportContent = importContent + ', ChevronDown';
      code = code.replace(lucideImportMatch[0], `import {${newImportContent}} from 'lucide-react'`);
    }
  }
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully added ChevronDown to imports.');
