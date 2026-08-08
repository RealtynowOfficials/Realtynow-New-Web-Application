const fs = require('fs');
let content = fs.readFileSync('src/lib/properties.ts', 'utf-8');

const oldSaveDraft = 'export async function savePropertyDraft(draftId: string | null, payload: any, submissionId?: string) {';
const newSaveDraft = `export async function savePropertyDraft(draftId: string | null, payload: any, submissionId?: string) {
  // Database-level protection against empty drafts
  if (!draftId && !payload.purpose && !payload.category && !payload.property_type_id && !payload.address) {
    throw new Error('Cannot create an empty draft property');
  }`;

content = content.replace(oldSaveDraft, newSaveDraft);

fs.writeFileSync('src/lib/properties.ts', content);
console.log('Fixed properties.ts savePropertyDraft backend protection');
