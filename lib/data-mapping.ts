/**
 * Data mapping and normalization rules for Ready2Cut production data
 * Based on expected patterns from Magento EAV system
 */

// Material mappings and categories
export const MATERIAL_MAPPINGS = {
  // Wood-based materials
  'MDF': { category: 'Wood', displayName: 'MDF', sortOrder: 1 },
  'Plywood': { category: 'Wood', displayName: 'Plywood', sortOrder: 2 },
  'MFC': { category: 'Wood', displayName: 'MFC (Melamine)', sortOrder: 3 },
  'Chipboard': { category: 'Wood', displayName: 'Chipboard', sortOrder: 4 },
  'OSB': { category: 'Wood', displayName: 'OSB', sortOrder: 5 },
  'Hardwood': { category: 'Wood', displayName: 'Hardwood', sortOrder: 6 },
  'Softwood': { category: 'Wood', displayName: 'Softwood', sortOrder: 7 },
  
  // Plastic materials
  'Acrylic': { category: 'Plastic', displayName: 'Acrylic', sortOrder: 10 },
  'Polycarbonate': { category: 'Plastic', displayName: 'Polycarbonate', sortOrder: 11 },
  'Perspex': { category: 'Plastic', displayName: 'Perspex', sortOrder: 12 },
  'PVC': { category: 'Plastic', displayName: 'PVC', sortOrder: 13 },
  'HDPE': { category: 'Plastic', displayName: 'HDPE', sortOrder: 14 },
  'Nylon': { category: 'Plastic', displayName: 'Nylon', sortOrder: 15 },
  
  // Metal materials
  'Aluminium': { category: 'Metal', displayName: 'Aluminium', sortOrder: 20 },
  'Steel': { category: 'Metal', displayName: 'Steel', sortOrder: 21 },
  'Brass': { category: 'Metal', displayName: 'Brass', sortOrder: 22 },
  'Copper': { category: 'Metal', displayName: 'Copper', sortOrder: 23 },
  
  // Other materials
  'Glass': { category: 'Other', displayName: 'Glass', sortOrder: 30 },
  'Mirror': { category: 'Other', displayName: 'Mirror', sortOrder: 31 },
  'Foam': { category: 'Other', displayName: 'Foam', sortOrder: 32 },
  'Rubber': { category: 'Other', displayName: 'Rubber', sortOrder: 33 },
};

// Type mappings
export const TYPE_MAPPINGS: Record<string, string> = {
  'Sheet': 'Sheet Material',
  'Board': 'Board',
  'Panel': 'Panel',
  'Custom': 'Custom Cut',
  'Standard': 'Standard Size',
  // Add more as discovered
};

// Finish mappings
export const FINISH_MAPPINGS: Record<string, { displayName: string; category: string }> = {
  'Raw': { displayName: 'Raw/Unfinished', category: 'Unfinished' },
  'Sanded': { displayName: 'Sanded', category: 'Prepared' },
  'Primed': { displayName: 'Primed', category: 'Prepared' },
  'Painted': { displayName: 'Painted', category: 'Finished' },
  'Varnished': { displayName: 'Varnished', category: 'Finished' },
  'Lacquered': { displayName: 'Lacquered', category: 'Finished' },
  'Laminated': { displayName: 'Laminated', category: 'Finished' },
  'Veneer': { displayName: 'Veneer', category: 'Finished' },
  'Melamine': { displayName: 'Melamine', category: 'Finished' },
  'Gloss': { displayName: 'High Gloss', category: 'Finished' },
  'Matt': { displayName: 'Matt', category: 'Finished' },
  'Satin': { displayName: 'Satin', category: 'Finished' },
};

// Shape mappings
export const SHAPE_MAPPINGS: Record<string, { displayName: string; icon?: string }> = {
  'rectangle': { displayName: 'Rectangle', icon: '▭' },
  'square': { displayName: 'Square', icon: '□' },
  'circle': { displayName: 'Circle', icon: '○' },
  'semi_circle': { displayName: 'Semi-Circle', icon: '◗' },
  'oval': { displayName: 'Oval', icon: '⬭' },
  'triangle': { displayName: 'Triangle', icon: '△' },
  'hexagon': { displayName: 'Hexagon', icon: '⬡' },
  'octagon': { displayName: 'Octagon', icon: '⯃' },
  'custom': { displayName: 'Custom Shape', icon: '✦' },
};

// Tag mappings
export const TAG_MAPPINGS: Record<string, { displayName: string; color: string }> = {
  'Straight': { displayName: 'Straight Cut', color: 'blue' },
  'Cutouts': { displayName: 'Has Cutouts', color: 'orange' },
  'Drilling': { displayName: 'Requires Drilling', color: 'purple' },
  'Edge': { displayName: 'Edge Treatment', color: 'green' },
  'Rush': { displayName: 'Rush Order', color: 'red' },
  'Special': { displayName: 'Special Instructions', color: 'yellow' },
};

/**
 * Normalize thickness value to consistent format
 * Examples: "18", "18mm", "18 mm" -> "18mm"
 */
export function normalizeThickness(value: string | null): string | null {
  if (!value) return null;
  
  // Remove spaces and convert to lowercase
  const cleaned = value.replace(/\s+/g, '').toLowerCase();
  
  // Extract numeric value
  const match = cleaned.match(/^(\d+(?:\.\d+)?)/);
  if (!match) return value; // Return original if no number found
  
  const numericValue = match[1];
  
  // Check if it already has units
  if (cleaned.includes('mm')) {
    return `${numericValue}mm`;
  } else if (cleaned.includes('cm')) {
    // Convert cm to mm
    return `${parseFloat(numericValue) * 10}mm`;
  } else if (cleaned.includes('m') && !cleaned.includes('mm')) {
    // Convert m to mm
    return `${parseFloat(numericValue) * 1000}mm`;
  } else {
    // Assume mm if no unit specified
    return `${numericValue}mm`;
  }
}

/**
 * Normalize dimension values
 * Handles various formats and converts to consistent numeric string
 */
export function normalizeDimension(value: string | null): string | null {
  if (!value) return null;
  
  // Remove spaces and convert to lowercase
  const cleaned = value.replace(/\s+/g, '').toLowerCase();
  
  // Extract numeric value
  const match = cleaned.match(/^(\d+(?:\.\d+)?)/);
  if (!match) return null; // Return null if no number found
  
  const numericValue = parseFloat(match[1]);
  
  // Convert units to mm (assuming mm as standard)
  if (cleaned.includes('cm') && !cleaned.includes('mm')) {
    return String(numericValue * 10);
  } else if (cleaned.includes('m') && !cleaned.includes('mm') && !cleaned.includes('cm')) {
    return String(numericValue * 1000);
  } else {
    return String(numericValue);
  }
}

/**
 * Get material category for grouping
 */
export function getMaterialCategory(material: string | null): string {
  if (!material) return 'Unknown';
  
  const mapping = MATERIAL_MAPPINGS[material as keyof typeof MATERIAL_MAPPINGS];
  return mapping?.category || 'Other';
}

/**
 * Get display name for material
 */
export function getMaterialDisplayName(material: string | null): string {
  if (!material) return 'Unknown';
  
  const mapping = MATERIAL_MAPPINGS[material as keyof typeof MATERIAL_MAPPINGS];
  return mapping?.displayName || material;
}

/**
 * Get color for tag
 */
export function getTagColor(tag: string): string {
  const mapping = TAG_MAPPINGS[tag];
  return mapping?.color || 'gray';
}

/**
 * Parse and format cutting date
 * Input: "01 Sep 2025" or similar
 * Output: Date object or formatted string
 */
export function parseCuttingDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  const months: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  const parts = dateStr.split(' ');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = months[parts[1]];
    const year = parseInt(parts[2]);
    
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  return null;
}

/**
 * Format status for display
 */
export function formatStatus(status: string | null): { text: string; color: string } {
  const statusMap: Record<string, { text: string; color: string }> = {
    'Processing': { text: 'Processing', color: 'blue' },
    'In Progress': { text: 'In Progress', color: 'orange' },
    'ready_to_cut': { text: 'Ready to Cut', color: 'green' },
    'assigned_to_saw': { text: 'Assigned to Saw', color: 'yellow' },
    'assigned_to_router': { text: 'Assigned to Router', color: 'yellow' },
    'assigned_to_laser': { text: 'Assigned to Laser', color: 'yellow' },
    'cutting_saw': { text: 'Cutting (Saw)', color: 'purple' },
    'cutting_router': { text: 'Cutting (Router)', color: 'purple' },
    'cutting_laser': { text: 'Cutting (Laser)', color: 'purple' },
    'parts_to_edge_band': { text: 'Edge Banding', color: 'indigo' },
    'parts_to_lacquer': { text: 'Lacquering', color: 'indigo' },
    'ready_to_pack': { text: 'Ready to Pack', color: 'teal' },
    'recuts': { text: 'Requires Recut', color: 'red' },
  };
  
  return statusMap[status || ''] || { text: status || 'Unknown', color: 'gray' };
}

/**
 * Data validation rules
 */
export const VALIDATION_RULES = {
  thickness: {
    min: 1,
    max: 100,
    unit: 'mm',
    pattern: /^\d+(\.\d+)?mm$/
  },
  dimensions: {
    min: 1,
    max: 5000,
    unit: 'mm'
  },
  requiredFields: ['sheet_id', 'increment_id', 'material'],
  dateFormat: /^\d{1,2} \w{3} \d{4}$/
};

/**
 * Validate a Ready2Cut part record
 */
export function validatePartRecord(part: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  for (const field of VALIDATION_RULES.requiredFields) {
    if (!part[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate thickness if present
  if (part.thickness) {
    const normalized = normalizeThickness(part.thickness);
    if (normalized) {
      const value = parseFloat(normalized);
      if (value < VALIDATION_RULES.thickness.min || value > VALIDATION_RULES.thickness.max) {
        errors.push(`Thickness ${value}mm is outside valid range (${VALIDATION_RULES.thickness.min}-${VALIDATION_RULES.thickness.max}mm)`);
      }
    }
  }
  
  // Validate dimensions
  for (const dim of ['length', 'width', 'height', 'depth', 'diameter']) {
    if (part[dim]) {
      const normalized = normalizeDimension(part[dim]);
      if (normalized) {
        const value = parseFloat(normalized);
        if (value < VALIDATION_RULES.dimensions.min || value > VALIDATION_RULES.dimensions.max) {
          errors.push(`${dim} ${value}mm is outside valid range`);
        }
      }
    }
  }
  
  // Validate date format
  if (part.cutting_date && !VALIDATION_RULES.dateFormat.test(part.cutting_date)) {
    errors.push(`Invalid date format: ${part.cutting_date}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}