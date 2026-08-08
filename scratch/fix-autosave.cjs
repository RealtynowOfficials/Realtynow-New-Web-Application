const fs = require('fs');
let content = fs.readFileSync('src/pages/portal/list-property.tsx', 'utf-8');

const oldUseEffect = `
  // Autosave
  React.useEffect(() => {
    if (isRestoring) return;
    const timer = setTimeout(() => {
      handleSaveDraft();
    }, 1000);
    return () => clearTimeout(timer);
  }, [JSON.stringify(watch()), activeStep, completedSteps, bedrooms, bathrooms, balconies, furnishing, selectedAmenities, mediaItems, negotiable]);
`;

const newUseEffect = `
  // Autosave
  React.useEffect(() => {
    if (isRestoring) return;
    
    // Check if the form actually has meaningful data before auto-saving to DB.
    // Avoid creating blank drafts in the database just by visiting the page.
    const vals = watch();
    const hasMeaningfulData = !!vals.purpose || !!vals.category || !!vals.property_type_id || activeStep > 0;
    
    if (!hasMeaningfulData && !draftId) return;

    const timer = setTimeout(() => {
      handleSaveDraft(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [JSON.stringify(watch()), activeStep, completedSteps, bedrooms, bathrooms, balconies, furnishing, selectedAmenities, mediaItems, negotiable]);
`;

content = content.replace(oldUseEffect, newUseEffect);

const oldHandleSaveDraft = 'const handleSaveDraft = async () => {';
const newHandleSaveDraft = 'const handleSaveDraft = async (isAutoSave = false) => {\n    // If it is an autosave, ensure we have some data so we do not spam empty drafts\n    if (isAutoSave && !draftId && activeStep === 0 && !getValues(\'purpose\')) return;';
content = content.replace(oldHandleSaveDraft, newHandleSaveDraft);

fs.writeFileSync('src/pages/portal/list-property.tsx', content);
console.log('Fixed autosave');
