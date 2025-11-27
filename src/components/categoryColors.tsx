import { schemePaired, schemeSet3 } from "d3-scale-chromatic";

// Mapping of subcategory to categories
const SUBCATEGORY_TO_CATEGORIES: Record<string, string[]> = {
  "Change of Use": [
    "Change of Use - Permitted Use",
    "Change of Use - Discretionary Use or Relaxations Required",
    "Change of Use - With Change to Site Plan",
  ],
  "Signs": [
    "Signs - Permitted Use",
    "Signs - Permitted Use with Relaxation",
    "Signs - Discretionary Use",
    "Signs - Discretionary Use - Third Party Signs",
  ],
  "Relaxation - Existing": [
    "Relaxation - Existing - Residential",
    "Relaxation - Existing - Residential - FastTrack",
    "Relaxation - Existing - Residential - FastTrack - Comp Follow-Up",
    "Relaxation - Existing - Compliance Follow-Up",
    "Relaxation - Existing - Accessory Building",
  ],
  "Relaxation - New": [
    "Relaxation - New - Residential",
    "Relaxation - New - Accessory Building",
  ],
  "Residential - New": [
    "Residential - New Single / Semi / Duplex",
    "Residential - New Accessory Building",
    "Residential - Contextual Dwelling",
    "Residential - Modest Residential Development",
  ],
  "Residential - Additions": [
    "Residential - Additions over 10 sq metres",
    "Residential - Additions 10 sq metres and under",
  ],
  "Residential - Multi-Family": [
    "Residential - Multi-Family",
    "Residential - Multi-Family - Renovations",
    "Residential - Multi-Family - Minor and Rowhouses",
  ],
  "Residential - Secondary Suite": [
    "Residential - Secondary Suite",
  ],
  "Residential - Single/Semi/Duplex Renovations": [
    "Residential - Single/Semi/Duplex Renovations",
  ],
  "Commercial": [
    "Commercial - Other Areas",
    "Commercial - Downtown",
  ],
  "Industrial": [
    "Industrial - Other Areas",
    "Industrial - Downtown",
  ],
  "Mixed Use": [
    "Mixed Use - Other Areas",
    "Mixed Use - Downtown",
  ],
  "Other": [
    "Temporary Structure",
    "Surface Parking Lots",
    "Special Function Tents",
    "Outdoor Cafe",
    "Excavating, Stripping and Grading",
    "Development Design Guidelines",
    "Retaining Wall",
    "Manufactured Home - New",
    "Manufactured Home - Addition over 10 sq metres",
    "Portable Classroom",
    "Residential - Fence",
    "Home Occupation Class 2",
    "Renovations - Non-Residential",
  ],
};

// Default color for unknown categories
const DEFAULT_COLOR: [number, number, number] = [54, 116, 217];

// Convert hex color to RGB array
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

// Get all subcategories
const subcategories = Object.keys(SUBCATEGORY_TO_CATEGORIES);

const colorScheme = [...schemePaired];

// Create color mapping for subcategories using d3 categorical color scale
const SUBCATEGORY_COLORS = new Map<string, [number, number, number]>(
  subcategories.map((subcategory, index) => {
    const colorHex = colorScheme[index % colorScheme.length];
    return [subcategory, hexToRgb(colorHex)];
  })
);

// Create color mapping for all categories based on their subcategory
const categoryColorMap = new Map<string, [number, number, number]>();
for (const [subcategory, categories] of Object.entries(SUBCATEGORY_TO_CATEGORIES)) {
  const color = SUBCATEGORY_COLORS.get(subcategory) || DEFAULT_COLOR;
  for (const category of categories) {
    categoryColorMap.set(category, color);
  }
}

export const CATEGORY_COLORS = categoryColorMap;
export { DEFAULT_COLOR };
export { SUBCATEGORY_TO_CATEGORIES, SUBCATEGORY_COLORS };

// Export all categories as a flat list
export const ALL_CATEGORIES = Object.values(SUBCATEGORY_TO_CATEGORIES).flat().sort();

// Export subcategories list
export const SUBCATEGORIES = subcategories.sort();

