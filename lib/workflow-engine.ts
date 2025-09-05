import { Part } from '@/app/page'

export type ProcessType = 'cutting' | 'edge_banding' | 'lacquering' | 'packing'

export interface ProcessConfiguration {
  sequence: ProcessType[]
  tagRoutingRules: {
    [key: string]: ProcessType[]
  }
}

// Default configuration - can be overridden by admin panel
export const defaultProcessConfig: ProcessConfiguration = {
  sequence: ['cutting', 'edge_banding', 'lacquering', 'packing'],
  tagRoutingRules: {
    'none': ['packing'],
    'Banding': ['edge_banding', 'packing'],
    'Lacquered': ['lacquering', 'packing'],
    'Banding,Lacquered': ['edge_banding', 'lacquering', 'packing'],
  }
}

// Load configuration - currently returns default, can be extended to load from database
export function loadProcessConfiguration(): ProcessConfiguration {
  // TODO: In future, this could load from Supabase database
  return defaultProcessConfig
}

// Save configuration - currently a no-op, can be extended to save to database
export function saveProcessConfiguration(config: ProcessConfiguration) {
  // TODO: In future, this could save to Supabase database
  console.log('Configuration save requested:', config)
}

// Parse tags from part and determine routing
export function getPartTags(part: Part): string[] {
  if (!part.tags || part.tags.trim() === '') return []
  return part.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
}

// Determine which processes a part needs based on its tags
export function getRequiredProcesses(part: Part, config?: ProcessConfiguration): ProcessType[] {
  const cfg = config || loadProcessConfiguration()
  const tags = getPartTags(part)
  
  // Check for specific tag combinations
  const relevantTags = tags.filter(tag => tag === 'Banding' || tag === 'Lacquered')
  
  if (relevantTags.length === 0) {
    return cfg.tagRoutingRules['none'] || ['packing']
  }
  
  // Create a key for tag combination
  const tagKey = relevantTags.sort().join(',')
  
  if (cfg.tagRoutingRules[tagKey]) {
    return cfg.tagRoutingRules[tagKey]
  }
  
  // Fallback: build process list based on individual tags
  const processes: ProcessType[] = []
  if (relevantTags.includes('Banding')) processes.push('edge_banding')
  if (relevantTags.includes('Lacquered')) processes.push('lacquering')
  processes.push('packing')
  
  return processes
}

// Get next process for a part after completing current process
export function getNextProcess(part: Part, currentProcess: string, config?: ProcessConfiguration): string {
  const requiredProcesses = getRequiredProcesses(part, config)
  const completedProcesses = part.completed_processes || []
  
  // Map processing status to process types
  const statusToProcess: { [key: string]: ProcessType } = {
    'cutting_saw': 'cutting',
    'cutting_router': 'cutting',
    'cutting_laser': 'cutting',
    'parts_to_edge_band': 'edge_banding',
    'parts_to_lacquer': 'lacquering',
    'ready_to_pack': 'packing'
  }
  
  // Find the next uncompleted process
  for (const process of requiredProcesses) {
    if (!completedProcesses.includes(process) && process !== 'cutting') {
      // Map process type to processing status
      switch (process) {
        case 'edge_banding':
          return 'parts_to_edge_band'
        case 'lacquering':
          return 'parts_to_lacquer'
        case 'packing':
          return 'ready_to_pack'
      }
    }
  }
  
  // Default to ready to pack if all processes complete
  return 'ready_to_pack'
}

// Update part after completing a process
export function completeProcess(part: Part, processCompleted: ProcessType): Part {
  const completedProcesses = [...(part.completed_processes || []), processCompleted]
  const nextStatus = getNextProcess(
    { ...part, completed_processes: completedProcesses },
    processCompleted
  )
  
  return {
    ...part,
    completed_processes: completedProcesses,
    processing_status: nextStatus as Part['processing_status'],
    machine_assignment: null // Clear machine assignment when moving to next process
  }
}

// Handle rejection/recut
export function rejectPart(part: Part): Part {
  return {
    ...part,
    processing_status: 'recuts',
    machine_assignment: null,
    completed_processes: []
  }
}