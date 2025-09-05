import { Part } from '@/app/page'

export interface AvailableOptions {
  materials: Set<string>
  types: Set<string>
  thicknesses: Set<string>
  tags: Set<string>
  statuses: Set<string>
}

export interface FilterState {
  material: string[]
  orderStatus: string[]
  type: string[]
  thickness: string[]
  tags: string[]
  cuttingDateFrom: string
  cuttingDateTo: string
}

/**
 * Get available filter options based on current filter selections
 * This creates a cascading filter effect where selecting one filter
 * limits the available options in other filters
 */
export function getAvailableOptions(
  allParts: Part[],
  currentFilters: FilterState
): AvailableOptions {
  // Start with all parts that aren't assigned to machines
  let relevantParts = allParts

  // Apply filters progressively to determine what options are available
  // We check each filter EXCEPT the one we're getting options for

  // First, filter by material if selected
  const materialsInUse = currentFilters.material.length > 0
  if (materialsInUse) {
    relevantParts = relevantParts.filter(p => 
      currentFilters.material.includes(p.material)
    )
  }

  // Get all possible values from the filtered set
  const availableMaterials = new Set<string>()
  const availableTypes = new Set<string>()
  const availableThicknesses = new Set<string>()
  const availableTags = new Set<string>()
  const availableStatuses = new Set<string>()

  // For each filter type, we need to consider what parts would be available
  // if we selected that option (in combination with other active filters)

  // Calculate available materials
  const partsForMaterials = allParts.filter(part => {
    // Check if part matches all OTHER filters (not material)
    if (currentFilters.type.length > 0) {
      const typeMatch = part.type === null 
        ? currentFilters.type.includes('None')
        : currentFilters.type.includes(part.type)
      if (!typeMatch) return false
    }
    if (currentFilters.thickness.length > 0 && !currentFilters.thickness.includes(part.thickness)) {
      return false
    }
    if (currentFilters.tags.length > 0) {
      const partTags = part.tags ? part.tags.split(',').map(t => t.trim()) : []
      const hasMatchingTag = currentFilters.tags.some(filterTag => 
        partTags.some(partTag => partTag.includes(filterTag))
      )
      if (!hasMatchingTag) return false
    }
    if (currentFilters.orderStatus.length > 0 && !currentFilters.orderStatus.includes(part.order_status)) {
      return false
    }
    return true
  })
  partsForMaterials.forEach(p => availableMaterials.add(p.material))

  // Calculate available types
  const partsForTypes = allParts.filter(part => {
    // Check if part matches all OTHER filters (not type)
    if (currentFilters.material.length > 0 && !currentFilters.material.includes(part.material)) {
      return false
    }
    if (currentFilters.thickness.length > 0 && !currentFilters.thickness.includes(part.thickness)) {
      return false
    }
    if (currentFilters.tags.length > 0) {
      const partTags = part.tags ? part.tags.split(',').map(t => t.trim()) : []
      const hasMatchingTag = currentFilters.tags.some(filterTag => 
        partTags.some(partTag => partTag.includes(filterTag))
      )
      if (!hasMatchingTag) return false
    }
    if (currentFilters.orderStatus.length > 0 && !currentFilters.orderStatus.includes(part.order_status)) {
      return false
    }
    return true
  })
  partsForTypes.forEach(p => availableTypes.add(p.type || 'None'))

  // Calculate available thicknesses
  const partsForThicknesses = allParts.filter(part => {
    // Check if part matches all OTHER filters (not thickness)
    if (currentFilters.material.length > 0 && !currentFilters.material.includes(part.material)) {
      return false
    }
    if (currentFilters.type.length > 0) {
      const typeMatch = part.type === null 
        ? currentFilters.type.includes('None')
        : currentFilters.type.includes(part.type)
      if (!typeMatch) return false
    }
    if (currentFilters.tags.length > 0) {
      const partTags = part.tags ? part.tags.split(',').map(t => t.trim()) : []
      const hasMatchingTag = currentFilters.tags.some(filterTag => 
        partTags.some(partTag => partTag.includes(filterTag))
      )
      if (!hasMatchingTag) return false
    }
    if (currentFilters.orderStatus.length > 0 && !currentFilters.orderStatus.includes(part.order_status)) {
      return false
    }
    return true
  })
  partsForThicknesses.forEach(p => availableThicknesses.add(p.thickness))

  // Calculate available tags
  const partsForTags = allParts.filter(part => {
    // Check if part matches all OTHER filters (not tags)
    if (currentFilters.material.length > 0 && !currentFilters.material.includes(part.material)) {
      return false
    }
    if (currentFilters.type.length > 0) {
      const typeMatch = part.type === null 
        ? currentFilters.type.includes('None')
        : currentFilters.type.includes(part.type)
      if (!typeMatch) return false
    }
    if (currentFilters.thickness.length > 0 && !currentFilters.thickness.includes(part.thickness)) {
      return false
    }
    if (currentFilters.orderStatus.length > 0 && !currentFilters.orderStatus.includes(part.order_status)) {
      return false
    }
    return true
  })
  
  partsForTags.forEach(part => {
    if (part.tags) {
      part.tags.split(',').forEach(tag => {
        availableTags.add(tag.trim())
      })
    }
  })

  // Calculate available statuses
  const partsForStatuses = allParts.filter(part => {
    // Check if part matches all OTHER filters (not status)
    if (currentFilters.material.length > 0 && !currentFilters.material.includes(part.material)) {
      return false
    }
    if (currentFilters.type.length > 0) {
      const typeMatch = part.type === null 
        ? currentFilters.type.includes('None')
        : currentFilters.type.includes(part.type)
      if (!typeMatch) return false
    }
    if (currentFilters.thickness.length > 0 && !currentFilters.thickness.includes(part.thickness)) {
      return false
    }
    if (currentFilters.tags.length > 0) {
      const partTags = part.tags ? part.tags.split(',').map(t => t.trim()) : []
      const hasMatchingTag = currentFilters.tags.some(filterTag => 
        partTags.some(partTag => partTag.includes(filterTag))
      )
      if (!hasMatchingTag) return false
    }
    return true
  })
  partsForStatuses.forEach(p => availableStatuses.add(p.order_status))

  return {
    materials: availableMaterials,
    types: availableTypes,
    thicknesses: availableThicknesses,
    tags: availableTags,
    statuses: availableStatuses
  }
}

/**
 * Check if an option should be disabled based on available options
 */
export function isOptionDisabled(
  option: string,
  availableOptions: Set<string>
): boolean {
  return availableOptions.size > 0 && !availableOptions.has(option)
}