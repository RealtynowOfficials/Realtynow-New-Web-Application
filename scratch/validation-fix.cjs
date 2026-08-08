const fs = require('fs');
let content = fs.readFileSync('src/pages/portal/list-property.tsx', 'utf-8');

const validationCode = `
  const validateStep = () => {
    const vals = getValues();
    const stepName = WIZARD_STEPS[activeStep];
    
    if (stepName === 'Purpose' && !vals.purpose) {
      toast.addToast('error', 'Please select a listing purpose to continue.');
      return false;
    }
    
    if (stepName === 'Category' && !vals.category) {
      toast.addToast('error', 'Please select a property category to continue.');
      return false;
    }
    
    if (stepName === 'Property Type' && !vals.property_type_id) {
      toast.addToast('error', 'Please select a property type to continue.');
      return false;
    }
    
    if (stepName === 'Location' && !vals.place_id) {
      toast.addToast('error', 'Please search and select a location from Google Maps before continuing.');
      return false;
    }
    
    // Media validation: At least one cover photo or some images required
    if (stepName === 'Media' && mediaItems.length === 0) {
      toast.addToast('error', 'Please upload at least one image to continue.');
      return false;
    }
    
    if (stepName === 'Pricing' && !vals.price && !vals.rent_amount) {
      toast.addToast('error', 'Please enter the pricing details to continue.');
      return false;
    }

    return true;
  };
`;

const newHandleNext = `
  const handleNext = async () => {
    if (!validateStep()) return;
    
    if (activeStep < WIZARD_STEPS.length - 1) {
      if (!completedSteps.includes(activeStep)) {
        setCompletedSteps(prev => [...prev, activeStep]);
      }
      setActiveStep((prev) => prev + 1);
    }
  };
`;

const handleNextStart = content.indexOf('  const handleNext = async () => {');
const handleNextEnd = content.indexOf('  const handleBack = () => {');

content = content.substring(0, handleNextStart) + validationCode + '\n' + newHandleNext + '\n' + content.substring(handleNextEnd);

fs.writeFileSync('src/pages/portal/list-property.tsx', content);
console.log('Fixed handleNext validation');
