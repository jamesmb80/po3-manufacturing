import { createBrowserClient } from '@supabase/ssr'
import { Part } from '@/app/page'

// Create a singleton instance of the Supabase client for the browser
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper functions for parts management
export const partsApi = {
  // Get all parts from ready2cut_parts table
  async getAll(): Promise<Part[]> {
    const { data, error } = await supabase
      .from('ready2cut_parts')
      .select('*')
      .order('cutting_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching parts:', error)
      return []
    }
    
    return data || []
  },

  // Create a new part
  async create(part: Omit<Part, 'id'>): Promise<Part | null> {
    const { data, error } = await supabase
      .from('ready2cut_parts')
      .insert(part)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating part:', error)
      return null
    }
    
    return data
  },

  // Update a part
  async update(sheet_id: string, updates: Partial<Part>): Promise<Part | null> {
    const { data, error } = await supabase
      .from('ready2cut_parts')
      .update(updates)
      .eq('sheet_id', sheet_id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating part:', error)
      return null
    }
    
    return data
  },

  // Update multiple parts
  async updateMany(parts: Part[]): Promise<boolean> {
    // Update each part individually (Supabase doesn't support bulk updates well)
    const promises = parts.map(part => 
      supabase
        .from('ready2cut_parts')
        .upsert(part, { onConflict: 'sheet_id' })
    )
    
    const results = await Promise.all(promises)
    const hasErrors = results.some(r => r.error)
    
    if (hasErrors) {
      console.error('Error updating parts')
      return false
    }
    
    return true
  },

  // Delete a part
  async delete(sheet_id: string): Promise<boolean> {
    const { error } = await supabase
      .from('ready2cut_parts')
      .delete()
      .eq('sheet_id', sheet_id)
    
    if (error) {
      console.error('Error deleting part:', error)
      return false
    }
    
    return true
  },

  // Bulk insert for initial data
  async bulkInsert(parts: Omit<Part, 'id'>[]): Promise<boolean> {
    const { error } = await supabase
      .from('ready2cut_parts')
      .insert(parts)
    
    if (error) {
      console.error('Error bulk inserting parts:', error)
      return false
    }
    
    return true
  }
}

export default supabase