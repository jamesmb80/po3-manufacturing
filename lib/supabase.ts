import { createClient } from '@supabase/supabase-js'

// Database types
export interface Part {
  id: string
  created_at: string
  updated_at: string
  order_number: string
  part_number: string
  quantity: number
  material?: string
  thickness?: number
  finish?: string
  notes?: string
  cutting_completed: boolean
  cutting_completed_at?: string
  cutting_completed_by?: string
  edging_completed: boolean
  edging_completed_at?: string
  edging_completed_by?: string
  grooving_completed: boolean
  grooving_completed_at?: string
  grooving_completed_by?: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for parts management
export const partsApi = {
  // Get all parts
  async getAll() {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Part[]
  },

  // Get a single part
  async get(id: string) {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Part
  },

  // Create a new part
  async create(part: Omit<Part, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('parts')
      .insert(part)
      .select()
      .single()
    
    if (error) throw error
    return data as Part
  },

  // Update a part
  async update(id: string, updates: Partial<Part>) {
    const { data, error } = await supabase
      .from('parts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Part
  },

  // Delete a part
  async delete(id: string) {
    const { error } = await supabase
      .from('parts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Update workflow status
  async updateWorkflowStatus(
    id: string, 
    station: 'cutting' | 'edging' | 'grooving', 
    completed: boolean
  ) {
    const user = await supabase.auth.getUser()
    const updates: any = {
      [`${station}_completed`]: completed,
    }
    
    if (completed) {
      updates[`${station}_completed_at`] = new Date().toISOString()
      updates[`${station}_completed_by`] = user.data.user?.id
    } else {
      updates[`${station}_completed_at`] = null
      updates[`${station}_completed_by`] = null
    }
    
    return this.update(id, updates)
  }
}

// Authentication helpers
export const auth = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null)
    })
  }
}