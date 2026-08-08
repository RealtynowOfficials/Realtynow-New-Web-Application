export type ListingPurpose = 'Sale' | 'Rent' | 'Lease' | 'PG' | 'CoLiving' | 'Hostel' | 'Vacation';
export type PropertyCategory = 'Residential' | 'Commercial' | 'Land' | 'Luxury' | 'Industrial' | 'PG' | 'Vacation' | string;

export interface WorkflowStep {
  id: string;
  name: string;
}

export function getCategoryOptions(purpose: ListingPurpose): string[] {
  switch (purpose) {
    case 'Sale':
      return ['Residential', 'Commercial', 'Land', 'Luxury'];
    case 'Rent':
      return ['Residential', 'Commercial'];
    case 'Lease':
      return ['Commercial', 'Residential', 'Industrial', 'Land'];
    case 'PG':
    case 'CoLiving':
    case 'Hostel':
    case 'Vacation':
      return []; // Skips category entirely
    default:
      return [];
  }
}

export function getPropertyTypeOptions(purpose: ListingPurpose, category?: string): string[] {
  if (purpose === 'Sale') {
    switch (category) {
      case 'Residential': return ['Apartment', 'Independent House', 'Villa', 'Builder Floor', 'Studio', 'Penthouse', 'Farmhouse'];
      case 'Commercial': return ['Office Space', 'Shop', 'Showroom', 'Warehouse', 'Factory', 'Commercial Building', 'Co-working Space'];
      case 'Land': return ['Residential Plot', 'Commercial Plot', 'Agricultural Land', 'Farm Land', 'Industrial Land', 'NA Land'];
      case 'Luxury': return ['Luxury Villa', 'Luxury Apartment', 'Penthouse', 'Estate', 'Farmhouse', 'Premium Independent House'];
      default: return [];
    }
  }

  if (purpose === 'Rent') {
    switch (category) {
      case 'Residential': return ['Apartment', 'Independent House', 'Villa', 'Builder Floor', 'Studio', 'Penthouse', 'Farmhouse'];
      case 'Commercial': return ['Office Space', 'Shop', 'Showroom', 'Warehouse', 'Factory', 'Co-working Space'];
      default: return [];
    }
  }

  if (purpose === 'Lease') {
    switch (category) {
      case 'Commercial': return ['Office Space', 'Retail Shop', 'Showroom', 'Warehouse', 'Factory', 'Commercial Building', 'Industrial Space'];
      case 'Residential': return ['Apartment', 'Independent House', 'Villa', 'Builder Floor'];
      case 'Industrial': return ['Factory', 'Warehouse', 'Industrial Building', 'Industrial Plot'];
      case 'Land': return ['Commercial Land', 'Industrial Land', 'Agricultural Land'];
      default: return [];
    }
  }

  if (purpose === 'PG') {
    return ['Boys PG', 'Girls PG', 'Co-ed PG', 'Student PG', 'Working Professionals PG', 'Family PG'];
  }

  if (purpose === 'CoLiving') {
    return ['Shared Apartment', 'Private Room', 'Shared Room', 'Premium CoLiving', 'Working Professionals', 'Student CoLiving'];
  }

  if (purpose === 'Hostel') {
    return ['Student Hostel', 'Boys Hostel', 'Girls Hostel', 'Working Men Hostel', 'Working Women Hostel', 'Premium Hostel'];
  }

  if (purpose === 'Vacation') {
    return ['Villa', 'Holiday Home', 'Resort', 'Cottage', 'Farmhouse', 'Apartment', 'Beach House', 'Homestay', 'Guest House'];
  }

  return [];
}

export function getWorkflowSteps(purpose: ListingPurpose, category?: string, type?: string): WorkflowStep[] {
  const steps: WorkflowStep[] = [
    { id: 'purpose', name: 'Purpose' }
  ];

  if (['Sale', 'Rent', 'Lease'].includes(purpose)) {
    steps.push({ id: 'category', name: 'Category' });
  }

  steps.push({ id: 'type', name: 'Property Type' });

  // Add specific details
  if (purpose === 'Sale') steps.push({ id: 'details-sale', name: 'Basic Details' });
  if (purpose === 'Rent') steps.push({ id: 'details-rent', name: 'Property Details' });
  if (purpose === 'Lease') steps.push({ id: 'details-lease', name: 'Lease Details' });
  if (purpose === 'PG') steps.push({ id: 'details-pg', name: 'PG Details' });
  if (purpose === 'CoLiving') steps.push({ id: 'details-coliving', name: 'CoLiving Details' });
  if (purpose === 'Hostel') steps.push({ id: 'details-hostel', name: 'Hostel Details' });
  if (purpose === 'Vacation') steps.push({ id: 'details-vacation', name: 'Property Details' });

  steps.push({ id: 'location', name: 'Location' });

  if (['PG', 'Hostel', 'CoLiving'].includes(purpose)) {
    steps.push({ id: 'room-config', name: 'Room Config' });
  }

  if (['Sale', 'Rent', 'PG', 'CoLiving', 'Vacation'].includes(purpose)) {
    steps.push({ id: 'amenities', name: 'Amenities' });
  }
  if (purpose === 'Hostel') {
    steps.push({ id: 'amenities', name: 'Facilities' });
  }
  if (purpose === 'Lease') {
    steps.push({ id: 'amenities', name: 'Features' });
  }
  
  if (purpose === 'CoLiving') {
    steps.push({ id: 'community', name: 'Community Features' });
  }

  if (purpose === 'PG') {
    steps.push({ id: 'food-services', name: 'Food / Services' });
  }

  if (purpose === 'Sale') steps.push({ id: 'pricing-sale', name: 'Sale Pricing' });
  if (purpose === 'Rent') steps.push({ id: 'pricing-rent', name: 'Rental Terms' });
  if (purpose === 'Lease') steps.push({ id: 'pricing-lease', name: 'Lease Terms' });
  if (purpose === 'PG' || purpose === 'CoLiving' || purpose === 'Hostel') steps.push({ id: 'pricing-pg', name: 'Pricing' });
  
  if (purpose === 'Vacation') {
    steps.push({ id: 'availability-vacation', name: 'Availability Calendar' });
    steps.push({ id: 'pricing-vacation', name: 'Pricing' });
  }
  if (purpose === 'CoLiving') {
    steps.push({ id: 'availability', name: 'Availability' });
  }

  if (['PG', 'Hostel', 'Vacation'].includes(purpose)) {
    steps.push({ id: 'rules', name: 'Rules' });
  }

  steps.push({ id: 'media', name: 'Media' });

  if (['Sale', 'Lease'].includes(purpose)) {
    steps.push({ id: 'ownership', name: 'Documents & Ownership' });
  }

  steps.push({ id: 'review', name: 'Preview' });
  steps.push({ id: 'submit', name: 'Submit' });

  return steps;
}
