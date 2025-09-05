'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PartsTable from '@/components/parts-table'
import FilterPanel from '@/components/filter-panel'
import { ErrorBoundary } from '@/components/error-boundary'
import { PageLoadingSkeleton } from '@/components/loading-skeleton'
import ColumnVisibility, { DEFAULT_COLUMNS, ColumnConfig } from '@/components/column-visibility'
import { getAvailableOptions } from '@/lib/filter-utils'
import { exportPartsToCSV } from '@/lib/csv-utils'
import { completeProcess, rejectPart } from '@/lib/workflow-engine'
import { Package, Scissors, RotateCcw } from 'lucide-react'
import { partsApi, supabaseClient } from '@/lib/supabase-client'

export type Part = {
  sheet_id: string
  increment_id: string
  cutting_date: string
  order_status: string  // Mapped from item_status to user-friendly format
  shipping_name: string
  material: string
  type: string | null
  colour: string | null
  finish: string | null
  thickness: string | null
  finish_2: string | null
  shape: string
  depth: string | null
  diameter: string | null
  height: string | null
  length: string | null
  width: string | null
  tags: string
  notes: string | null
  action: string
  status_updated: string
  machine_assignment?: 'saw' | 'router' | 'laser' | null
  processing_status?: 'ready_to_cut' | 'assigned_to_saw' | 'assigned_to_router' | 'assigned_to_laser' | 
    'cutting_saw' | 'cutting_router' | 'cutting_laser' | 
    'parts_to_edge_band' | 'parts_to_lacquer' | 'ready_to_pack' | 'completed' | 'recuts' | null
  completed_processes?: string[]  // Track which processes are done
  next_process?: string  // Calculated next destination
  
  // Original Magento fields
  item_name?: string  // Original item name from Magento
  
  // Additional EAV fields
  product_type?: string | null
  kit_type?: string | null
  is_sample?: boolean
  order_part?: string | null
  kit_part?: string | null
  cutter_id?: string | null
  cutter_date?: string | null
  further_id?: string | null
  further_date?: string | null
  delivery_date?: string | null
  oversize?: boolean
  recut_count?: number
  
  // Order information from sales_order_grid
  billing_name?: string | null
  raw_order_status?: string | null
  order_shipping?: string | null
  order_created?: string | null
}

export default function Home() {
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
  const [filters, setFilters] = useState({
    material: [] as string[],
    orderStatus: [] as string[],
    type: [] as string[],
    thickness: [] as string[],
    tags: [] as string[],
    cuttingDateFrom: '',
    cuttingDateTo: '',
  })

  const loadParts = useCallback(async () => {
    try {
      const data = await partsApi.getAll()
      
      // Always use real data from database, never fall back to sample data
      setParts(data)
      setLoading(false)
      
      if (data.length === 0) {
        console.log('No parts in database. Please run data sync to load production data.')
      }
    } catch (error) {
      console.error('Failed to load parts:', error)
      setLoading(false)
    }
  }, [])

  // Load parts from Supabase and subscribe to real-time changes
  useEffect(() => {
    loadParts()
    
    // Subscribe to real-time changes
    const channel = supabaseClient
      .channel('parts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parts'
        },
        (payload) => {
          console.log('Real-time update:', payload)
          
          // Handle different types of changes
          if (payload.eventType === 'INSERT') {
            setParts(prev => [...prev, payload.new as Part])
          } else if (payload.eventType === 'UPDATE') {
            setParts(prev => 
              prev.map(p => p.sheet_id === payload.new.sheet_id ? payload.new as Part : p)
            )
          } else if (payload.eventType === 'DELETE') {
            setParts(prev => 
              prev.filter(p => p.sheet_id !== payload.old.sheet_id)
            )
          }
        }
      )
      .subscribe()
    
    // Cleanup subscription on unmount
    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [loadParts])

  const availableOptions = useMemo(() => getAvailableOptions(parts, filters), [parts, filters])

  const filteredParts = useMemo(() => {
    return parts.filter(part => {
      if (filters.material.length > 0 && !filters.material.includes(part.material)) return false
      if (filters.orderStatus.length > 0 && !filters.orderStatus.includes(part.order_status)) return false
      if (filters.type.length > 0 && part.type && !filters.type.includes(part.type)) return false
      if (filters.thickness.length > 0 && part.thickness && !filters.thickness.includes(part.thickness)) return false
      if (filters.tags.length > 0 && !filters.tags.some(tag => part.tags?.includes(tag))) return false
      if (filters.cuttingDateFrom && part.cutting_date < filters.cuttingDateFrom) return false
      if (filters.cuttingDateTo && part.cutting_date > filters.cuttingDateTo) return false
      return true
    })
  }, [parts, filters])

  const handleAssignToMachine = async (partIds: string[], machine: 'saw' | 'router' | 'laser') => {
    const updatedParts = parts.map(part => {
      if (partIds.includes(part.sheet_id)) {
        let newStatus: Part['processing_status']
        switch (machine) {
          case 'saw':
            newStatus = 'assigned_to_saw'
            break
          case 'router':
            newStatus = 'assigned_to_router'
            break
          case 'laser':
            newStatus = 'assigned_to_laser'
            break
        }
        return {
          ...part,
          machine_assignment: machine,
          processing_status: newStatus
        }
      }
      return part
    })
    
    // Update in database
    const partsToUpdate = updatedParts.filter(p => partIds.includes(p.sheet_id))
    await partsApi.updateMany(partsToUpdate)
    
    setParts(updatedParts)
  }

  const handleMarkAsCut = async (partIds: string[]) => {
    const updatedParts = parts.map(part => {
      if (partIds.includes(part.sheet_id)) {
        return completeProcess(part, 'cutting')
      }
      return part
    })
    
    // Update in database
    const partsToUpdate = updatedParts.filter(p => partIds.includes(p.sheet_id))
    await partsApi.updateMany(partsToUpdate)
    
    setParts(updatedParts)
  }

  const handleSendTo = async (partIds: string[], destination: 'edge_banding' | 'lacquering') => {
    const updatedParts = parts.map(part => {
      if (partIds.includes(part.sheet_id)) {
        const newStatus = destination === 'edge_banding' ? 'parts_to_edge_band' : 'parts_to_lacquer'
        return {
          ...part,
          processing_status: newStatus as Part['processing_status']
        }
      }
      return part
    })
    
    // Update in database
    const partsToUpdate = updatedParts.filter(p => partIds.includes(p.sheet_id))
    await partsApi.updateMany(partsToUpdate)
    
    setParts(updatedParts)
  }

  const handleSendToRecuts = async (partIds: string[]) => {
    const updatedParts = parts.map(part => {
      if (partIds.includes(part.sheet_id)) {
        return rejectPart(part)
      }
      return part
    })
    
    // Update in database
    const partsToUpdate = updatedParts.filter(p => partIds.includes(p.sheet_id))
    await partsApi.updateMany(partsToUpdate)
    
    setParts(updatedParts)
  }

  const handleMarkAsComplete = async (partIds: string[]) => {
    const updatedParts = parts.map(part => {
      if (partIds.includes(part.sheet_id)) {
        return {
          ...part,
          processing_status: 'completed' as Part['processing_status'],
          machine_assignment: null
        }
      }
      return part
    })
    
    // Update in database
    const partsToUpdate = updatedParts.filter(p => partIds.includes(p.sheet_id))
    await partsApi.updateMany(partsToUpdate)
    
    setParts(updatedParts)
  }

  const handleExport = () => {
    exportPartsToCSV(filteredParts, 'all')
  }

  // Categorize parts for different views
  const readyToCutParts = filteredParts.filter(p => 
    p.processing_status === 'ready_to_cut'
  )
  
  const assignedParts = filteredParts.filter(p => 
    p.processing_status?.includes('assigned_to_')
  )
  
  const cuttingParts = filteredParts.filter(p => 
    p.processing_status?.includes('cutting_')
  )

  const partsToEdgeBand = filteredParts.filter(p => 
    p.processing_status === 'parts_to_edge_band'
  )

  const partsToLacquer = filteredParts.filter(p => 
    p.processing_status === 'parts_to_lacquer'
  )

  const readyToPackParts = filteredParts.filter(p => 
    p.processing_status === 'ready_to_pack'
  )

  const completedParts = filteredParts.filter(p => 
    p.processing_status === 'completed'
  )

  const recutParts = filteredParts.filter(p => 
    p.processing_status === 'recuts'
  )

  if (loading) {
    return <PageLoadingSkeleton />
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-4 space-y-4">
        <h1 className="text-3xl font-bold mb-4">PO3 Manufacturing Control System</h1>
      
      <div className="flex justify-between items-start gap-4">
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          allParts={parts}
          availableOptions={availableOptions}
          columnConfig={columnConfig}
        />
        <ColumnVisibility
          columns={columnConfig}
          onVisibilityChange={setColumnConfig}
          storageKey="ready2cut-columns"
        />
      </div>

      <Tabs defaultValue="ready" className="space-y-4">
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="ready" className="flex items-center gap-1">
            <Scissors className="h-4 w-4" />
            Ready ({readyToCutParts.length})
          </TabsTrigger>
          <TabsTrigger value="assigned">
            Assigned ({assignedParts.length})
          </TabsTrigger>
          <TabsTrigger value="cutting">
            Cutting ({cuttingParts.length})
          </TabsTrigger>
          <TabsTrigger value="edge-banding">
            Edge Banding ({partsToEdgeBand.length})
          </TabsTrigger>
          <TabsTrigger value="lacquering">
            Lacquering ({partsToLacquer.length})
          </TabsTrigger>
          <TabsTrigger value="packing" className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            Packing ({readyToPackParts.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedParts.length})
          </TabsTrigger>
          <TabsTrigger value="recuts" className="flex items-center gap-1">
            <RotateCcw className="h-4 w-4" />
            Recuts ({recutParts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ready">
          <PartsTable
            parts={readyToCutParts}
            tableMode="ready"
            onAssignToMachine={handleAssignToMachine}
            onMarkAsCut={handleMarkAsCut}
            onSendTo={handleSendTo}
            onSendToRecuts={handleSendToRecuts}
            columnConfig={columnConfig}
          />
        </TabsContent>

        <TabsContent value="assigned">
          <PartsTable
            parts={assignedParts}
            tableMode="assigned"
            onMarkAsCut={handleMarkAsCut}
            onSendTo={handleSendTo}
            onSendToRecuts={handleSendToRecuts}
            columnConfig={columnConfig}
          />
        </TabsContent>

        <TabsContent value="cutting">
          <PartsTable
            parts={cuttingParts}
            tableMode="cutting"
            onMarkAsCut={handleMarkAsCut}
            onSendTo={handleSendTo}
            onSendToRecuts={handleSendToRecuts}
            columnConfig={columnConfig}
          />
        </TabsContent>

        <TabsContent value="edge-banding">
          <PartsTable
            parts={partsToEdgeBand}
            tableMode="edge-banding"
            onSendTo={handleSendTo}
            onSendToRecuts={handleSendToRecuts}
            columnConfig={columnConfig}
          />
        </TabsContent>

        <TabsContent value="lacquering">
          <PartsTable
            parts={partsToLacquer}
            tableMode="lacquering"
            onSendTo={handleSendTo}
            onSendToRecuts={handleSendToRecuts}
            columnConfig={columnConfig}
          />
        </TabsContent>

        <TabsContent value="packing">
          <PartsTable
            parts={readyToPackParts}
            tableMode="packing"
            onSendToRecuts={handleSendToRecuts}
            onMarkAsComplete={handleMarkAsComplete}
            columnConfig={columnConfig}
          />
        </TabsContent>

        <TabsContent value="completed">
          <PartsTable
            parts={completedParts}
            tableMode="completed"
            columnConfig={columnConfig}
          />
        </TabsContent>

        <TabsContent value="recuts">
          <PartsTable
            parts={recutParts}
            tableMode="recuts"
            onAssignToMachine={handleAssignToMachine}
            columnConfig={columnConfig}
          />
        </TabsContent>
      </Tabs>
    </div>
    </ErrorBoundary>
  )
}