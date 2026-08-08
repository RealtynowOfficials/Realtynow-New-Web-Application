const fs = require('fs');
let content = fs.readFileSync('src/pages/portal/wizard-schema.ts', 'utf-8');
content += `\nexport const WIZARD_STEPS = [\n  'Purpose',\n  'Category',\n  'Property Type',\n  'Basic Details',\n  'Location',\n  'Amenities',\n  'Media',\n  'Pricing',\n  'Availability',\n  'SEO',\n  'Review',\n  'Submit',\n];\n`;
fs.writeFileSync('src/pages/portal/wizard-schema.ts', content);
