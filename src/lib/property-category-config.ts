import {
  Building,
  Building2,
  Home,
  Store,
  Warehouse,
  LandPlot,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  ShieldCheck,
  Trees,
  Construction,
  Sprout,
  UserCheck,
  Handshake,
  ShoppingBag,
  LucideIcon,
} from 'lucide-react';

export type MainPropertyType = 'Residential' | 'Commercial' | 'Plot' | 'Project';

export interface CategoryFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'chips' | 'textarea' | 'checkbox' | 'radio';
  placeholder?: string;
  options?: string[];
  unit?: string;
  unitOptions?: string[];
  required?: boolean;
  gridSpan?: 1 | 2 | 3;
  helperText?: string;
}

export interface PropertyCategoryDefinition {
  id: string;
  slug: string;
  name: string;
  pluralName: string;
  mainType: MainPropertyType;
  icon: LucideIcon;
  emoji: string;
  description: string;
  defaultTitleTemplate: string;
  allowedPurposes: ('Sale' | 'Rent' | 'Lease' | 'PG' | 'CoLiving' | 'Hostel' | 'Vacation Rental')[];
  specsTitle?: string;
  showBhk?: boolean;
  showRoomsBeds?: boolean;
  showBathrooms?: boolean;
  showBalconies?: boolean;
  showFurnishing?: boolean;
  showFacing?: boolean;
  showFloorNumber?: boolean;
  showTotalFloors?: boolean;
  showParking?: boolean;
  showAgeOfProperty?: boolean;
  showConstructionStatus?: boolean;
  showCarpetArea?: boolean;
  showBuiltUpArea?: boolean;
  showPlotArea?: boolean;
  showSuperArea?: boolean;
  primaryAreaLabel?: string;
  primaryAreaKey?: 'carpet_area' | 'built_up_area' | 'plot_area' | 'super_area';
  customFields: CategoryFieldConfig[];
  recommendedAmenities: string[];
}

export const ALL_PROPERTY_CATEGORIES: PropertyCategoryDefinition[] = [
  // ─── RESIDENTIAL CATEGORIES ──────────────────────────────────────────────
  {
    id: 'apartment-flats',
    slug: 'apartment-flats',
    name: 'Apartment Flats',
    pluralName: 'Apartment Flats',
    mainType: 'Residential',
    icon: Building,
    emoji: '🏢',
    description: 'Modern apartments, flats & high-rise societies',
    defaultTitleTemplate: '{bhk} BHK Apartment Flat in {locality}, {city}',
    allowedPurposes: ['Sale', 'Rent', 'Lease', 'Vacation Rental'],
    showBhk: true,
    showBathrooms: true,
    showBalconies: true,
    showFurnishing: true,
    showFacing: true,
    showFloorNumber: true,
    showTotalFloors: true,
    showParking: true,
    showAgeOfProperty: true,
    showConstructionStatus: true,
    showCarpetArea: true,
    showBuiltUpArea: true,
    showSuperArea: true,
    primaryAreaLabel: 'Carpet Area',
    primaryAreaKey: 'carpet_area',
    customFields: [
      {
        id: 'maintenance',
        label: 'Maintenance (₹/month)',
        type: 'number',
        placeholder: 'e.g. 2500',
        gridSpan: 1,
      },
      {
        id: 'gated_society',
        label: 'Gated Society Name',
        type: 'text',
        placeholder: 'e.g. My Home Bhooja',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['lift', 'security', 'power_backup', 'parking', 'gym', 'pool', 'clubhouse', 'cctv', 'gas', 'play_area'],
  },
  {
    id: 'independent-houses',
    slug: 'independent-houses',
    name: 'Independent Houses',
    pluralName: 'Independent Houses',
    mainType: 'Residential',
    icon: Home,
    emoji: '🏡',
    description: 'Standalone houses, individual homes & kothis',
    defaultTitleTemplate: '{bhk} BHK Independent House in {locality}, {city}',
    allowedPurposes: ['Sale', 'Rent', 'Lease'],
    showBhk: true,
    showBathrooms: true,
    showBalconies: true,
    showFurnishing: true,
    showFacing: true,
    showFloorNumber: false,
    showTotalFloors: true,
    showParking: true,
    showAgeOfProperty: true,
    showConstructionStatus: true,
    showPlotArea: true,
    showBuiltUpArea: true,
    primaryAreaLabel: 'Plot Area',
    primaryAreaKey: 'plot_area',
    customFields: [
      {
        id: 'floors_built',
        label: 'Total Floors Built',
        type: 'select',
        options: ['G+1', 'G+2', 'G+3', 'G+4', 'Single Floor (G)'],
        placeholder: 'Select floors',
        gridSpan: 1,
      },
      {
        id: 'road_width',
        label: 'Approach Road Width (ft)',
        type: 'number',
        placeholder: 'e.g. 30',
        gridSpan: 1,
      },
      {
        id: 'boundary_wall',
        label: 'Compound / Boundary Wall',
        type: 'select',
        options: ['Yes', 'No'],
        placeholder: 'Select',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['parking', 'security', 'power_backup', 'garden', 'cctv', 'rainwater'],
  },
  {
    id: 'gated-community-homes',
    slug: 'gated-community-homes',
    name: 'Gated Community Homes',
    pluralName: 'Gated Community Homes',
    mainType: 'Residential',
    icon: ShieldCheck,
    emoji: '🛡️',
    description: 'Secured community villas & township homes',
    defaultTitleTemplate: '{bhk} BHK Gated Community Home in {locality}, {city}',
    allowedPurposes: ['Sale', 'Rent', 'Lease'],
    showBhk: true,
    showBathrooms: true,
    showBalconies: true,
    showFurnishing: true,
    showFacing: true,
    showTotalFloors: true,
    showParking: true,
    showAgeOfProperty: true,
    showConstructionStatus: true,
    showPlotArea: true,
    showBuiltUpArea: true,
    primaryAreaLabel: 'Built-up Area',
    primaryAreaKey: 'built_up_area',
    customFields: [
      {
        id: 'community_name',
        label: 'Community / Township Name',
        type: 'text',
        placeholder: 'e.g. Prestige Glenwood',
        gridSpan: 1,
      },
      {
        id: 'clubhouse_membership',
        label: 'Clubhouse Included',
        type: 'select',
        options: ['Included', 'Separate Charge', 'Not Available'],
        placeholder: 'Select option',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['security', 'clubhouse', 'pool', 'gym', 'cctv', 'power_backup', 'play_area', 'garden', 'ev_charging'],
  },
  {
    id: 'luxury-villas',
    slug: 'luxury-villas',
    name: 'Luxury Villas',
    pluralName: 'Luxury Villas',
    mainType: 'Residential',
    icon: Sparkles,
    emoji: '✨',
    description: 'High-end designer villas, mansions & estates',
    defaultTitleTemplate: '{bhk} BHK Luxury Villa in {locality}, {city}',
    allowedPurposes: ['Sale', 'Rent', 'Vacation Rental'],
    showBhk: true,
    showBathrooms: true,
    showBalconies: true,
    showFurnishing: true,
    showFacing: true,
    showTotalFloors: true,
    showParking: true,
    showAgeOfProperty: true,
    showConstructionStatus: true,
    showPlotArea: true,
    showBuiltUpArea: true,
    primaryAreaLabel: 'Built-up Area',
    primaryAreaKey: 'built_up_area',
    customFields: [
      {
        id: 'villa_type',
        label: 'Villa Type',
        type: 'select',
        options: ['Standalone Villa', 'Gated Villa', 'Duplex Villa', 'Triplex Villa', 'Waterfront Villa'],
        placeholder: 'Select type',
        gridSpan: 1,
      },
      {
        id: 'private_garden',
        label: 'Private Garden / Lawn',
        type: 'select',
        options: ['Yes', 'No'],
        placeholder: 'Select',
        gridSpan: 1,
      },
      {
        id: 'private_pool',
        label: 'Private Swimming Pool',
        type: 'select',
        options: ['Yes', 'No'],
        placeholder: 'Select',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['pool', 'garden', 'clubhouse', 'gym', 'security', 'servant', 'power_backup', 'cctv', 'ev_charging'],
  },
  {
    id: 'farm-houses',
    slug: 'farm-houses',
    name: 'Farm Houses',
    pluralName: 'Farm Houses',
    mainType: 'Residential',
    icon: Trees,
    emoji: '🌾',
    description: 'Serene farm houses, weekend homes & retreats',
    defaultTitleTemplate: 'Farm House with {plot_area} in {locality}, {city}',
    allowedPurposes: ['Sale', 'Rent', 'Vacation Rental'],
    showBhk: true,
    showBathrooms: true,
    showBalconies: true,
    showFurnishing: true,
    showFacing: true,
    showPlotArea: true,
    showBuiltUpArea: true,
    primaryAreaLabel: 'Plot / Land Area',
    primaryAreaKey: 'plot_area',
    customFields: [
      {
        id: 'water_source',
        label: 'Water Source',
        type: 'select',
        options: ['Borewell', 'Canal Water', 'Municipal Supply', 'Both Borewell & Municipal'],
        placeholder: 'Select water source',
        gridSpan: 1,
      },
      {
        id: 'plantation',
        label: 'Plantation / Trees',
        type: 'text',
        placeholder: 'e.g. Mango orchard, Teak wood',
        gridSpan: 1,
      },
      {
        id: 'fencing',
        label: 'Fencing / Boundary',
        type: 'select',
        options: ['Fenced with Solar Wire', 'Compound Wall', 'Barbed Wire Fenced', 'Not Fenced'],
        placeholder: 'Select fencing',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['garden', 'pool', 'power_backup', 'security', 'cctv'],
  },
  {
    id: 'duplex-houses',
    slug: 'duplex-houses',
    name: 'Duplex Houses',
    pluralName: 'Duplex Houses',
    mainType: 'Residential',
    icon: Layers,
    emoji: '🏢',
    description: 'Multi-level duplex homes with double-height living',
    defaultTitleTemplate: '{bhk} BHK Duplex House in {locality}, {city}',
    allowedPurposes: ['Sale', 'Rent', 'Lease'],
    showBhk: true,
    showBathrooms: true,
    showBalconies: true,
    showFurnishing: true,
    showFacing: true,
    showFloorNumber: true,
    showTotalFloors: true,
    showParking: true,
    showAgeOfProperty: true,
    showCarpetArea: true,
    showBuiltUpArea: true,
    primaryAreaLabel: 'Built-up Area',
    primaryAreaKey: 'built_up_area',
    customFields: [
      {
        id: 'internal_staircase',
        label: 'Internal Staircase / Private Lift',
        type: 'select',
        options: ['Internal Wooden Staircase', 'Marble Staircase', 'Private Home Lift', 'Standard Staircase'],
        placeholder: 'Select type',
        gridSpan: 1,
      },
      {
        id: 'terrace_access',
        label: 'Private Terrace Access',
        type: 'select',
        options: ['Yes', 'No'],
        placeholder: 'Select',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['lift', 'security', 'power_backup', 'parking', 'gym', 'clubhouse', 'cctv'],
  },
  {
    id: 'pent-houses',
    slug: 'pent-houses',
    name: 'Pent Houses',
    pluralName: 'Pent Houses',
    mainType: 'Residential',
    icon: Building2,
    emoji: '🌆',
    description: 'Sky villas & luxury rooftop penthouses',
    defaultTitleTemplate: '{bhk} BHK Luxury Penthouse in {locality}, {city}',
    allowedPurposes: ['Sale', 'Rent'],
    showBhk: true,
    showBathrooms: true,
    showBalconies: true,
    showFurnishing: true,
    showFacing: true,
    showFloorNumber: true,
    showTotalFloors: true,
    showParking: true,
    showAgeOfProperty: true,
    showCarpetArea: true,
    showBuiltUpArea: true,
    showSuperArea: true,
    primaryAreaLabel: 'Super Area',
    primaryAreaKey: 'super_area',
    customFields: [
      {
        id: 'sky_deck',
        label: 'Sky Deck / Private Rooftop',
        type: 'select',
        options: ['Private Sky Deck', 'Open Terrace Garden', 'Rooftop Gazebo', 'Standard Balcony'],
        placeholder: 'Select rooftop feature',
        gridSpan: 1,
      },
      {
        id: 'view_type',
        label: 'Scenic View',
        type: 'select',
        options: ['City Skyline View', 'Lake / River View', 'Park / Golf View', 'Garden View'],
        placeholder: 'Select view',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['lift', 'security', 'power_backup', 'parking', 'pool', 'gym', 'clubhouse', 'cctv', 'servant'],
  },
  {
    id: 'owner-properties',
    slug: 'owner-properties',
    name: 'Owner Properties',
    pluralName: 'Owner Properties',
    mainType: 'Residential',
    icon: UserCheck,
    emoji: '🤝',
    description: 'Direct zero-brokerage owner listings',
    defaultTitleTemplate: '{bhk} BHK Direct Owner Property in {locality}, {city}',
    allowedPurposes: ['Sale', 'Rent'],
    showBhk: true,
    showBathrooms: true,
    showBalconies: true,
    showFurnishing: true,
    showFacing: true,
    showFloorNumber: true,
    showTotalFloors: true,
    showParking: true,
    showAgeOfProperty: true,
    showCarpetArea: true,
    showBuiltUpArea: true,
    primaryAreaLabel: 'Built-up Area',
    primaryAreaKey: 'built_up_area',
    customFields: [
      {
        id: 'brokerage_policy',
        label: 'Zero Brokerage Certified',
        type: 'select',
        options: ['Zero Brokerage (Direct Owner)', 'Family Listing'],
        placeholder: 'Select',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['parking', 'security', 'power_backup', 'lift'],
  },
  {
    id: 'builder-share-properties',
    slug: 'builder-share-properties',
    name: 'Builder Share Properties',
    pluralName: 'Builder Share Properties',
    mainType: 'Residential',
    icon: Handshake,
    emoji: '🏗️',
    description: 'Direct builder floor & landowner share inventory',
    defaultTitleTemplate: '{bhk} BHK Builder Share Floor in {locality}, {city}',
    allowedPurposes: ['Sale', 'Rent'],
    showBhk: true,
    showBathrooms: true,
    showBalconies: true,
    showFurnishing: true,
    showFacing: true,
    showFloorNumber: true,
    showTotalFloors: true,
    showParking: true,
    showConstructionStatus: true,
    showCarpetArea: true,
    showBuiltUpArea: true,
    primaryAreaLabel: 'Built-up Area',
    primaryAreaKey: 'built_up_area',
    customFields: [
      {
        id: 'share_type',
        label: 'Inventory Share Type',
        type: 'select',
        options: ['Builder Share Unit', 'Landowner Share Unit', 'Investor Direct Share'],
        placeholder: 'Select share type',
        gridSpan: 1,
      },
      {
        id: 'rera_status',
        label: 'RERA Compliance',
        type: 'select',
        options: ['RERA Approved', 'Applied / In Process', 'Exempt'],
        placeholder: 'Select status',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['lift', 'parking', 'power_backup', 'security', 'cctv'],
  },

  // ─── PLOT & LAND CATEGORIES ──────────────────────────────────────────────
  {
    id: 'open-plots-land',
    slug: 'open-plots-land',
    name: 'Open Plots & Land',
    pluralName: 'Open Plots & Land',
    mainType: 'Plot',
    icon: LandPlot,
    emoji: '📐',
    description: 'Residential, commercial & layout plots',
    defaultTitleTemplate: '{plot_area} Sq.Yd Plot in {locality}, {city}',
    allowedPurposes: ['Sale', 'Lease'],
    showFacing: true,
    showPlotArea: true,
    primaryAreaLabel: 'Plot Area',
    primaryAreaKey: 'plot_area',
    customFields: [
      {
        id: 'plot_unit',
        label: 'Area Unit',
        type: 'select',
        options: ['Sq. Yd', 'Sq. Ft', 'Acre', 'Gunta'],
        placeholder: 'Select unit',
        required: true,
        gridSpan: 1,
      },
      {
        id: 'length_ft',
        label: 'Plot Length (ft)',
        type: 'number',
        placeholder: 'e.g. 60',
        gridSpan: 1,
      },
      {
        id: 'width_ft',
        label: 'Plot Width (ft)',
        type: 'number',
        placeholder: 'e.g. 40',
        gridSpan: 1,
      },
      {
        id: 'road_width',
        label: 'Facing Road Width (ft)',
        type: 'number',
        placeholder: 'e.g. 40',
        gridSpan: 1,
      },
      {
        id: 'corner_plot',
        label: 'Corner Plot',
        type: 'select',
        options: ['Yes (2+ Road Facing)', 'No (Single Road)'],
        placeholder: 'Select',
        gridSpan: 1,
      },
      {
        id: 'approval_authority',
        label: 'Layout Approval Status',
        type: 'select',
        options: ['HMDA Approved', 'DTCP Approved', 'GHMC Approved', 'RERA Registered Layout', 'Panchayat Approved', 'Unapproved / Other'],
        placeholder: 'Select approval',
        required: true,
        gridSpan: 1,
      },
      {
        id: 'boundary_wall',
        label: 'Boundary / Compound Wall',
        type: 'select',
        options: ['Gated Venture with Compound', 'Individual Boundary Wall', 'Fenced', 'Open / No Wall'],
        placeholder: 'Select boundary status',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['security', 'cctv', 'rainwater'],
  },
  {
    id: 'agriculture-land',
    slug: 'agriculture-land',
    name: 'Agriculture Land',
    pluralName: 'Agriculture Land',
    mainType: 'Plot',
    icon: Sprout,
    emoji: '🌱',
    description: 'Fertile agriculture land, farm acreage & estates',
    defaultTitleTemplate: '{plot_area} Agricultural Land in {locality}, {city}',
    allowedPurposes: ['Sale', 'Lease'],
    showFacing: true,
    showPlotArea: true,
    primaryAreaLabel: 'Land Area',
    primaryAreaKey: 'plot_area',
    customFields: [
      {
        id: 'land_unit',
        label: 'Area Unit',
        type: 'select',
        options: ['Acre', 'Gunta', 'Bigha', 'Sq. Yd'],
        placeholder: 'Select unit',
        required: true,
        gridSpan: 1,
      },
      {
        id: 'soil_type',
        label: 'Soil Type',
        type: 'select',
        options: ['Red Soil', 'Black Cotton Soil', 'Alluvial / Loamy Soil', 'Sandy Soil', 'Clay Soil'],
        placeholder: 'Select soil type',
        gridSpan: 1,
      },
      {
        id: 'water_source',
        label: 'Water Source / Borewell',
        type: 'select',
        options: ['Borewell (Running)', 'Canal Water Access', 'River / Lake Nearby', 'Rainfed Only'],
        placeholder: 'Select water availability',
        gridSpan: 1,
      },
      {
        id: 'electricity_supply',
        label: 'Agricultural Electricity Connection',
        type: 'select',
        options: ['3-Phase Agri Power Connected', 'Single Phase Connected', 'Nearby Available', 'No Connection'],
        placeholder: 'Select power status',
        gridSpan: 1,
      },
      {
        id: 'road_access',
        label: 'Road Connectivity',
        type: 'select',
        options: ['National / State Highway Touch', 'Tar Road Touch', 'Gravel / Panchayat Road', 'Mud / Cart Track'],
        placeholder: 'Select road access',
        gridSpan: 1,
      },
      {
        id: 'cultivation_type',
        label: 'Current Cultivation',
        type: 'text',
        placeholder: 'e.g. Paddy, Cotton, Horticulture, Fallow',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: [],
  },

  // ─── COMMERCIAL CATEGORIES ──────────────────────────────────────────────
  {
    id: 'commercial-spaces',
    slug: 'commercial-spaces',
    name: 'Commercial Spaces & Offices',
    pluralName: 'Commercial Spaces & Offices',
    mainType: 'Commercial',
    icon: Briefcase,
    emoji: '💼',
    description: 'Corporate office suites, IT tech parks & business centers',
    defaultTitleTemplate: '{carpet_area} Sq.Ft Commercial Office Space in {locality}, {city}',
    allowedPurposes: ['Rent', 'Lease', 'Sale'],
    showFurnishing: true,
    showFloorNumber: true,
    showTotalFloors: true,
    showParking: true,
    showCarpetArea: true,
    showBuiltUpArea: true,
    primaryAreaLabel: 'Carpet Area',
    primaryAreaKey: 'carpet_area',
    customFields: [
      {
        id: 'cabins',
        label: 'Executive Cabins',
        type: 'number',
        placeholder: 'e.g. 4',
        gridSpan: 1,
      },
      {
        id: 'workstations',
        label: 'Workstations / Seats',
        type: 'number',
        placeholder: 'e.g. 50',
        gridSpan: 1,
      },
      {
        id: 'conference_rooms',
        label: 'Conference / Meeting Rooms',
        type: 'number',
        placeholder: 'e.g. 2',
        gridSpan: 1,
      },
      {
        id: 'washrooms_count',
        label: 'Washrooms',
        type: 'number',
        placeholder: 'e.g. 2',
        gridSpan: 1,
      },
      {
        id: 'building_grade',
        label: 'Building Grade',
        type: 'select',
        options: ['Grade A+', 'Grade A', 'Grade B', 'Standalone Commercial'],
        placeholder: 'Select grade',
        gridSpan: 1,
      },
      {
        id: 'power_backup_kva',
        label: '100% Power Backup (DG)',
        type: 'select',
        options: ['100% DG Backup Included', 'Partial Backup', 'No Backup'],
        placeholder: 'Select power backup',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['lift', 'security', 'power_backup', 'parking', 'cctv', 'wifi', 'ev_charging'],
  },
  {
    id: 'shops-showrooms',
    slug: 'shops-showrooms',
    name: 'Shops & Showrooms',
    pluralName: 'Shops & Showrooms',
    mainType: 'Commercial',
    icon: Store,
    emoji: '🛍️',
    description: 'High-visibility retail shops, showrooms & retail centers',
    defaultTitleTemplate: '{carpet_area} Sq.Ft Retail Shop / Showroom in {locality}, {city}',
    allowedPurposes: ['Rent', 'Lease', 'Sale'],
    showFurnishing: true,
    showFloorNumber: true,
    showTotalFloors: true,
    showParking: true,
    showCarpetArea: true,
    showBuiltUpArea: true,
    primaryAreaLabel: 'Carpet Area',
    primaryAreaKey: 'carpet_area',
    customFields: [
      {
        id: 'frontage_ft',
        label: 'Shop Frontage (ft)',
        type: 'number',
        placeholder: 'e.g. 25',
        gridSpan: 1,
      },
      {
        id: 'road_facing',
        label: 'Road Facing Exposure',
        type: 'select',
        options: ['Main Road Facing', 'Corner Shop (2 Sides Open)', 'Inside Commercial Complex', 'Market Lane'],
        placeholder: 'Select exposure',
        gridSpan: 1,
      },
      {
        id: 'commercial_zone',
        label: 'Approved Commercial Zone',
        type: 'select',
        options: ['Commercial Approved', 'Mixed Use Zone', 'Local Commercial'],
        placeholder: 'Select zoning',
        gridSpan: 1,
      },
      {
        id: 'attached_washroom',
        label: 'Private Washroom',
        type: 'select',
        options: ['Yes (Private)', 'Common in Complex', 'No'],
        placeholder: 'Select',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['parking', 'security', 'power_backup', 'cctv', 'lift'],
  },
  {
    id: 'godowns-warehouses',
    slug: 'godowns-warehouses',
    name: 'Godowns / Warehouses',
    pluralName: 'Godowns & Warehouses',
    mainType: 'Commercial',
    icon: Warehouse,
    emoji: '🏭',
    description: 'Industrial warehouses, logistics hubs & cold storages',
    defaultTitleTemplate: '{built_up_area} Sq.Ft Warehouse / Godown in {locality}, {city}',
    allowedPurposes: ['Rent', 'Lease', 'Sale'],
    showParking: true,
    showPlotArea: true,
    showBuiltUpArea: true,
    primaryAreaLabel: 'Warehouse Covered Area',
    primaryAreaKey: 'built_up_area',
    customFields: [
      {
        id: 'ceiling_height_ft',
        label: 'Clear Ceiling Height (ft)',
        type: 'number',
        placeholder: 'e.g. 32',
        gridSpan: 1,
      },
      {
        id: 'loading_docks',
        label: 'Loading Docks / Bays',
        type: 'number',
        placeholder: 'e.g. 4',
        gridSpan: 1,
      },
      {
        id: 'truck_access',
        label: 'Truck / Container Accessibility',
        type: 'select',
        options: ['40-ft Container Accessible', '20-ft Container Accessible', 'Heavy Trucks Only', 'Light Commercial Vehicles (LCV)'],
        placeholder: 'Select accessibility',
        gridSpan: 1,
      },
      {
        id: 'power_capacity_kva',
        label: 'Power Capacity (KVA / HP)',
        type: 'text',
        placeholder: 'e.g. 100 KVA',
        gridSpan: 1,
      },
      {
        id: 'storage_type',
        label: 'Storage Structure Type',
        type: 'select',
        options: ['PEB Structure (Industrial)', 'RCC Covered Godown', 'Cold Storage', 'Open Storage Yard'],
        placeholder: 'Select type',
        gridSpan: 1,
      },
      {
        id: 'fire_noc',
        label: 'Fire NOC / Hydrant System',
        type: 'select',
        options: ['Installed with Fire NOC', 'Hydrants Available', 'Sprinklers Only', 'Not Installed'],
        placeholder: 'Select fire safety',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['security', 'cctv', 'power_backup', 'parking'],
  },
  {
    id: 'pg-coliving-spaces',
    slug: 'pg-coliving-spaces',
    name: 'PG & Co-Living Spaces',
    pluralName: 'PG & Co-Living Spaces',
    mainType: 'Commercial',
    icon: Users,
    emoji: '🛋️',
    description: 'Hostels, shared co-living spaces & paying guest accommodations',
    defaultTitleTemplate: 'Furnished PG / Co-Living Space in {locality}, {city}',
    allowedPurposes: ['PG', 'CoLiving', 'Hostel', 'Rent'],
    showFurnishing: true,
    showRoomsBeds: true,
    showFloorNumber: true,
    showTotalFloors: true,
    showCarpetArea: true,
    primaryAreaLabel: 'Total Area',
    primaryAreaKey: 'carpet_area',
    customFields: [
      {
        id: 'total_rooms',
        label: 'Total Rooms',
        type: 'number',
        placeholder: 'e.g. 12',
        gridSpan: 1,
      },
      {
        id: 'total_beds',
        label: 'Total Beds',
        type: 'number',
        placeholder: 'e.g. 30',
        gridSpan: 1,
      },
      {
        id: 'occupancy_types',
        label: 'Room Sharing Types',
        type: 'select',
        options: ['Single, Double & Triple Sharing', 'Single & Double Sharing Only', 'Double & Triple Sharing', 'Dormitory / Quad'],
        placeholder: 'Select sharing types',
        gridSpan: 1,
      },
      {
        id: 'gender_preference',
        label: 'Suitable For',
        type: 'select',
        options: ['Male Only', 'Female Only', 'Co-ed / Unisex', 'Working Professionals', 'Students Only'],
        placeholder: 'Select audience',
        gridSpan: 1,
      },
      {
        id: 'food_availability',
        label: 'Food & Meals Included',
        type: 'select',
        options: ['3 Meals Included (Breakfast, Lunch, Dinner)', 'Breakfast & Dinner Only', 'Optional / On-Demand', 'Self Cooking Allowed', 'No Food Provided'],
        placeholder: 'Select meal policy',
        gridSpan: 1,
      },
      {
        id: 'ac_type',
        label: 'AC / Non-AC Rooms',
        type: 'select',
        options: ['Both AC & Non-AC Available', 'All AC Rooms', 'All Non-AC Rooms'],
        placeholder: 'Select AC availability',
        gridSpan: 1,
      },
      {
        id: 'gate_closing_time',
        label: 'Curfew / Gate Closing Time',
        type: 'text',
        placeholder: 'e.g. 10:30 PM (or No Curfew)',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['wifi', 'security', 'power_backup', 'cctv', 'lift'],
  },
  {
    id: 'shopping-malls',
    slug: 'shopping-malls',
    name: 'Shopping Malls & Multiplex Units',
    pluralName: 'Shopping Malls',
    mainType: 'Commercial',
    icon: ShoppingBag,
    emoji: '🏬',
    description: 'Retail units, multiplex shops & food court anchors',
    defaultTitleTemplate: '{carpet_area} Sq.Ft Mall Retail Unit in {locality}, {city}',
    allowedPurposes: ['Rent', 'Lease', 'Sale'],
    showFloorNumber: true,
    showTotalFloors: true,
    showParking: true,
    showCarpetArea: true,
    showBuiltUpArea: true,
    primaryAreaLabel: 'Carpet Area',
    primaryAreaKey: 'carpet_area',
    customFields: [
      {
        id: 'mall_name',
        label: 'Mall / Complex Name',
        type: 'text',
        placeholder: 'e.g. Inorbit Mall',
        gridSpan: 1,
      },
      {
        id: 'unit_type',
        label: 'Unit Type',
        type: 'select',
        options: ['Anchor Store', 'Vanilla Retail Shop', 'Food Court Kiosk', 'Entertainment / Gaming Unit'],
        placeholder: 'Select unit type',
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['lift', 'security', 'power_backup', 'parking', 'cctv', 'wifi', 'ev_charging'],
  },

  // ─── PROJECT CATEGORIES ──────────────────────────────────────────────────
  {
    id: 'new-projects',
    slug: 'new-projects',
    name: 'New Projects & Townships',
    pluralName: 'New Projects & Townships',
    mainType: 'Project',
    icon: Construction,
    emoji: '🏗️',
    description: 'Upcoming gated residential & mixed-use developments',
    defaultTitleTemplate: 'New Project: {title} in {locality}, {city}',
    allowedPurposes: ['Sale'],
    showConstructionStatus: true,
    showPlotArea: true,
    showBuiltUpArea: true,
    primaryAreaLabel: 'Project Area (Acres/Sq.Ft)',
    primaryAreaKey: 'plot_area',
    customFields: [
      {
        id: 'total_units',
        label: 'Total Units in Project',
        type: 'number',
        placeholder: 'e.g. 450',
        gridSpan: 1,
      },
      {
        id: 'total_towers',
        label: 'Total Towers / Blocks',
        type: 'number',
        placeholder: 'e.g. 4',
        gridSpan: 1,
      },
      {
        id: 'project_configurations',
        label: 'Available Configurations',
        type: 'text',
        placeholder: 'e.g. 2 BHK, 3 BHK, 4 BHK Luxury Flats',
        gridSpan: 1,
      },
      {
        id: 'launch_date',
        label: 'Project Launch Date',
        type: 'text',
        placeholder: 'e.g. Q2 2026',
        gridSpan: 1,
      },
      {
        id: 'possession_year',
        label: 'Target Possession Date',
        type: 'text',
        placeholder: 'e.g. Dec 2028',
        gridSpan: 1,
      },
      {
        id: 'rera_number',
        label: 'RERA Project Registration ID',
        type: 'text',
        placeholder: 'e.g. P02400001234',
        required: true,
        gridSpan: 1,
      },
    ],
    recommendedAmenities: ['clubhouse', 'pool', 'gym', 'security', 'power_backup', 'play_area', 'garden', 'ev_charging', 'cctv'],
  },
];

/**
 * Lookup helper to find a category definition by slug, ID, or name
 */
export function getPropertyCategoryDef(slugOrIdOrName?: string | null): PropertyCategoryDefinition {
  if (!slugOrIdOrName) {
    return ALL_PROPERTY_CATEGORIES[0]; // fallback: Apartment Flats
  }
  const clean = slugOrIdOrName.toLowerCase().trim();

  // Try exact match by slug or ID
  const directMatch = ALL_PROPERTY_CATEGORIES.find(
    (c) => c.slug.toLowerCase() === clean || c.id.toLowerCase() === clean || c.name.toLowerCase() === clean
  );
  if (directMatch) return directMatch;

  // Fuzzy / Alias matching
  if (clean.includes('plot') || clean.includes('land') || clean.includes('hmda') || clean.includes('dtcp')) {
    if (clean.includes('agri') || clean.includes('farm land')) {
      return ALL_PROPERTY_CATEGORIES.find((c) => c.id === 'agriculture-land')!;
    }
    return ALL_PROPERTY_CATEGORIES.find((c) => c.id === 'open-plots-land')!;
  }
  if (clean.includes('villa')) {
    return ALL_PROPERTY_CATEGORIES.find((c) => c.id === 'luxury-villas')!;
  }
  if (clean.includes('house') || clean.includes('kothi') || clean.includes('bungalow')) {
    return ALL_PROPERTY_CATEGORIES.find((c) => c.id === 'independent-houses')!;
  }
  if (clean.includes('office') || clean.includes('commercial space') || clean.includes('it park')) {
    return ALL_PROPERTY_CATEGORIES.find((c) => c.id === 'commercial-spaces')!;
  }
  if (clean.includes('shop') || clean.includes('showroom') || clean.includes('retail')) {
    return ALL_PROPERTY_CATEGORIES.find((c) => c.id === 'shops-showrooms')!;
  }
  if (clean.includes('warehouse') || clean.includes('godown') || clean.includes('storage') || clean.includes('shed')) {
    return ALL_PROPERTY_CATEGORIES.find((c) => c.id === 'godowns-warehouses')!;
  }
  if (clean.includes('pg') || clean.includes('coliving') || clean.includes('hostel') || clean.includes('paying guest')) {
    return ALL_PROPERTY_CATEGORIES.find((c) => c.id === 'pg-coliving-spaces')!;
  }
  if (clean.includes('project')) {
    return ALL_PROPERTY_CATEGORIES.find((c) => c.id === 'new-projects')!;
  }
  if (clean.includes('farm house') || clean.includes('farmhouse')) {
    return ALL_PROPERTY_CATEGORIES.find((c) => c.id === 'farm-houses')!;
  }
  if (clean.includes('duplex')) {
    return ALL_PROPERTY_CATEGORIES.find((c) => c.id === 'duplex-houses')!;
  }
  if (clean.includes('pent')) {
    return ALL_PROPERTY_CATEGORIES.find((c) => c.id === 'pent-houses')!;
  }

  return ALL_PROPERTY_CATEGORIES[0];
}

/**
 * Filter categories by main property type
 */
export function getCategoriesByMainType(type: MainPropertyType): PropertyCategoryDefinition[] {
  return ALL_PROPERTY_CATEGORIES.filter((c) => c.mainType === type);
}
