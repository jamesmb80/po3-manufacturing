/**
 * Parse material information from item_name field
 * Based on patterns found in the Magento data
 */

export interface ParsedMaterial {
  material: string | null;
  type: string | null;
  thickness: string | null;
  finish: string | null;
  colour: string | null;
}

/**
 * Parse material data from item name
 */
export function parseMaterialFromItemName(itemName: string | null): ParsedMaterial {
  if (!itemName) {
    return {
      material: null,
      type: null,
      thickness: null,
      finish: null,
      colour: null
    };
  }

  const name = itemName.toLowerCase();
  let result: ParsedMaterial = {
    material: null,
    type: null,
    thickness: null,
    finish: null,
    colour: null
  };

  // Extract thickness (e.g., "19mm", "6mm", "25mm")
  const thicknessMatch = itemName.match(/(\d+(?:\.\d+)?)\s*mm/i);
  if (thicknessMatch) {
    result.thickness = thicknessMatch[1] + 'mm';
  }

  // Determine main material
  if (name.includes('mdf')) {
    result.material = 'MDF';
    
    // Check MDF types
    if (name.includes('moisture resistant') || name.includes('mr mdf')) {
      result.type = 'Moisture Resistant';
    } else if (name.includes('veneered')) {
      result.type = 'Veneered';
      // Extract veneer type
      if (name.includes('oak')) result.finish = 'Oak';
      else if (name.includes('walnut')) result.finish = 'Walnut';
      else if (name.includes('maple')) result.finish = 'Maple';
      else if (name.includes('birch')) result.finish = 'Birch';
      else if (name.includes('ash')) result.finish = 'Ash';
      else if (name.includes('beech')) result.finish = 'Beech';
      else if (name.includes('cherry')) result.finish = 'Cherry';
    } else if (name.includes('melamine')) {
      result.type = 'Melamine';
      // Extract melamine colour/finish
      if (name.includes('white')) result.colour = 'White';
      else if (name.includes('black')) result.colour = 'Black';
      else if (name.includes('grey')) result.colour = 'Grey';
    } else if (name.includes('medite')) {
      result.type = 'Medite Premier';
    } else {
      result.type = 'Standard';
    }
  } 
  else if (name.includes('plywood') || name.includes('ply')) {
    result.material = 'Plywood';
    
    // Check plywood types
    if (name.includes('birch')) {
      result.type = 'Birch';
    } else if (name.includes('marine')) {
      result.type = 'Marine';
    } else if (name.includes('phenolic') || name.includes('mesh')) {
      result.type = 'Phenolic';
    } else if (name.includes('hardwood')) {
      result.type = 'Hardwood';
    } else if (name.includes('softwood')) {
      result.type = 'Softwood';
    } else if (name.includes('exterior') || name.includes('wpb')) {
      result.type = 'Exterior';
    } else {
      result.type = 'Standard';
    }
  }
  else if (name.includes('acrylic')) {
    result.material = 'Acrylic';
    
    // Check acrylic types
    if (name.includes('clear')) {
      result.type = 'Clear';
    } else if (name.includes('frosted')) {
      result.type = 'Frosted';
    } else if (name.includes('colou') || name.includes('color')) {
      result.type = 'Coloured';
      // Extract colour
      if (name.includes('red')) result.colour = 'Red';
      else if (name.includes('blue')) result.colour = 'Blue';
      else if (name.includes('green')) result.colour = 'Green';
      else if (name.includes('yellow')) result.colour = 'Yellow';
      else if (name.includes('white')) result.colour = 'White';
      else if (name.includes('black')) result.colour = 'Black';
      else if (name.includes('orange')) result.colour = 'Orange';
      else if (name.includes('purple')) result.colour = 'Purple';
    } else if (name.includes('mirror')) {
      result.type = 'Mirror';
    } else {
      result.type = 'Clear'; // Default for acrylic
    }
  }
  else if (name.includes('polycarbonate')) {
    result.material = 'Polycarbonate';
    
    if (name.includes('clear')) {
      result.type = 'Clear';
    } else if (name.includes('tinted') || name.includes('bronze')) {
      result.type = 'Tinted';
    } else {
      result.type = 'Clear';
    }
  }
  else if (name.includes('osb')) {
    result.material = 'OSB';
    result.type = 'Standard';
  }
  else if (name.includes('chipboard')) {
    result.material = 'Chipboard';
    
    if (name.includes('melamine')) {
      result.type = 'Melamine';
    } else {
      result.type = 'Standard';
    }
  }
  else if (name.includes('glass')) {
    result.material = 'Glass';
    
    if (name.includes('toughened') || name.includes('tempered')) {
      result.type = 'Toughened';
    } else if (name.includes('laminated')) {
      result.type = 'Laminated';
    } else {
      result.type = 'Standard';
    }
  }
  else if (name.includes('mirror')) {
    result.material = 'Mirror';
    
    if (name.includes('acrylic')) {
      result.type = 'Acrylic';
    } else if (name.includes('glass')) {
      result.type = 'Glass';
    } else {
      result.type = 'Standard';
    }
  }
  else if (name.includes('foam')) {
    result.material = 'Foam Board';
    result.type = 'Standard';
  }
  // Pure wood types (without MDF/Plywood)
  else if (name.includes('oak') && !name.includes('mdf') && !name.includes('plywood')) {
    result.material = 'Oak';
    result.type = 'Solid Wood';
  }
  else if (name.includes('walnut') && !name.includes('mdf') && !name.includes('plywood')) {
    result.material = 'Walnut';
    result.type = 'Solid Wood';
  }
  else if (name.includes('pine') && !name.includes('mdf') && !name.includes('plywood')) {
    result.material = 'Pine';
    result.type = 'Solid Wood';
  }
  else if (name.includes('beech') && !name.includes('mdf') && !name.includes('plywood')) {
    result.material = 'Beech';
    result.type = 'Solid Wood';
  }
  // Check for kit products or other items
  else if (name.includes('kit') || name.includes('beading') || name.includes('rail')) {
    // These might be kits without specific material
    result.material = 'Kit/Component';
    result.type = 'Various';
  }

  return result;
}

/**
 * Extract shape from dimensions or keywords
 */
export function extractShape(itemName: string | null, shape: string | null): string {
  if (shape && shape !== 'rectangle') {
    return shape;
  }
  
  if (itemName) {
    const name = itemName.toLowerCase();
    if (name.includes('circle') || name.includes('round')) return 'circle';
    if (name.includes('oval')) return 'oval';
    if (name.includes('triangle')) return 'triangle';
    if (name.includes('hexagon')) return 'hexagon';
    if (name.includes('octagon')) return 'octagon';
    if (name.includes('arch')) return 'arch';
  }
  
  return shape || 'rectangle';
}

/**
 * Parse tags/processes from cutting_tag field
 * The cutting_tag field contains comma-separated numbers
 */
export function parseTags(cuttingTag: string | null): string {
  if (!cuttingTag || cuttingTag === '0') {
    return 'Straight';
  }
  
  // Map numeric tags to readable names
  const tagMap: Record<string, string> = {
    '1': 'Straight',
    '2': 'Cutouts',
    '3': 'Drilling',
    '4': 'Rounded Corners',
    '5': 'Edge Banding',
    '6': 'Grooves',
    '7': 'Special Cut',
    '8': 'CNC Required',
    '9': 'Hand Finish',
    '10': 'Rush Order'
  };
  
  const tags = cuttingTag.split(',')
    .map(t => tagMap[t.trim()] || `Tag${t.trim()}`)
    .filter(t => t);
    
  return tags.length > 0 ? tags.join(', ') : 'Straight';
}