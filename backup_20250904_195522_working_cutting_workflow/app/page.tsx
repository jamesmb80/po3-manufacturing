'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PartsTable from '@/components/parts-table'
import FilterPanel from '@/components/filter-panel'
import { getAvailableOptions } from '@/lib/filter-utils'
import { exportPartsToCSV } from '@/lib/csv-utils'
import sampleData from '@/order_data_table.json'

export type Part = {
  sheet_id: string
  increment_id: string
  cutting_date: string
  order_status: string
  shipping_name: string
  material: string
  type: string | null
  colour: string | null
  finish: string | null
  thickness: string
  finish_2: string | null
  shape: string
  depth: number | null
  diameter: number | null
  height: number | null
  length: number | null
  width: number | null
  tags: string
  notes: string | null
  action: string
  status_updated: string
  machine_assignment?: 'saw' | 'router' | 'laser' | null
  cutting_status?: 'assigned' | 'cutting' | null
}

export default function Home() {
  const [parts, setParts] = useState<Part[]>([])
  const [filters, setFilters] = useState({
    material: [] as string[],
    orderStatus: [] as string[],
    type: [] as string[],
    thickness: [] as string[],
    tags: [] as string[],
    cuttingDateFrom: '',
    cuttingDateTo: '',
  })

  useEffect(() => {
    // Load sample data with machine assignment and cutting status
    const partsWithAssignment = sampleData.map(part => ({
      ...part,
      machine_assignment: null,
      cutting_status: null
    }))
    setParts(partsWithAssignment as Part[])
  }, [])

  const handleMachineAssignment = (selectedParts: Part[], machine: 'saw' | 'router' | 'laser') => {
    setParts(prevParts => 
      prevParts.map(part => 
        selectedParts.find(sp => sp.sheet_id === part.sheet_id)
          ? { ...part, machine_assignment: machine, cutting_status: 'assigned' }
          : part
      )
    )
  }

  const handleMoveToCutting = (selectedParts: Part[], machine: 'saw' | 'router' | 'laser') => {
    // Export to CSV before moving to cutting
    exportPartsToCSV(selectedParts, machine)
    
    // Update the cutting status
    setParts(prevParts => 
      prevParts.map(part => 
        selectedParts.find(sp => sp.sheet_id === part.sheet_id)
          ? { ...part, cutting_status: 'cutting' }
          : part
      )
    )
  }

  const handleMoveBackToReady = (selectedParts: Part[]) => {
    setParts(prevParts => 
      prevParts.map(part => 
        selectedParts.find(sp => sp.sheet_id === part.sheet_id)
          ? { ...part, machine_assignment: null, cutting_status: null }
          : part
      )
    )
  }

  const handleMoveBackToAssigned = (selectedParts: Part[]) => {
    setParts(prevParts => 
      prevParts.map(part => 
        selectedParts.find(sp => sp.sheet_id === part.sheet_id)
          ? { ...part, cutting_status: 'assigned' }
          : part
      )
    )
  }

  // Helper function to parse date strings
  const parseDate = (dateStr: string) => {
    // Parse "01 Sep 2025" format
    const months: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    }
    const parts = dateStr.split(' ')
    if (parts.length === 3) {
      const day = parseInt(parts[0])
      const month = months[parts[1]]
      const year = parseInt(parts[2])
      return new Date(year, month, day)
    }
    return null
  }

  // Filter parts based on all active filters
  const filterParts = (partsToFilter: Part[]) => {
    return partsToFilter.filter(part => {
      // Material filter
      if (filters.material.length > 0 && !filters.material.includes(part.material)) {
        return false
      }

      // Order status filter
      if (filters.orderStatus.length > 0 && !filters.orderStatus.includes(part.order_status)) {
        return false
      }

      // Type filter
      if (filters.type.length > 0) {
        if (part.type === null && !filters.type.includes('None')) {
          return false
        }
        if (part.type !== null && !filters.type.includes(part.type)) {
          return false
        }
      }

      // Thickness filter
      if (filters.thickness.length > 0 && !filters.thickness.includes(part.thickness)) {
        return false
      }

      // Tags filter - handle comma-separated tags
      if (filters.tags.length > 0) {
        const partTags = part.tags ? part.tags.split(',').map(t => t.trim()) : []
        const hasMatchingTag = filters.tags.some(filterTag => 
          partTags.some(partTag => partTag.includes(filterTag))
        )
        if (!hasMatchingTag) {
          return false
        }
      }

      // Date range filter
      if (filters.cuttingDateFrom || filters.cuttingDateTo) {
        const partDate = parseDate(part.cutting_date)
        if (partDate) {
          if (filters.cuttingDateFrom) {
            const fromDate = new Date(filters.cuttingDateFrom)
            if (partDate < fromDate) return false
          }
          if (filters.cuttingDateTo) {
            const toDate = new Date(filters.cuttingDateTo)
            if (partDate > toDate) return false
          }
        }
      }

      return true
    })
  }

  // Filter parts based on machine assignment and cutting status
  const readyToCutParts = filterParts(parts.filter(p => !p.machine_assignment))
  const assignedSawParts = filterParts(parts.filter(p => p.machine_assignment === 'saw' && p.cutting_status === 'assigned'))
  const cuttingSawParts = filterParts(parts.filter(p => p.machine_assignment === 'saw' && p.cutting_status === 'cutting'))
  const assignedRouterParts = filterParts(parts.filter(p => p.machine_assignment === 'router' && p.cutting_status === 'assigned'))
  const cuttingRouterParts = filterParts(parts.filter(p => p.machine_assignment === 'router' && p.cutting_status === 'cutting'))
  const assignedLaserParts = filterParts(parts.filter(p => p.machine_assignment === 'laser' && p.cutting_status === 'assigned'))
  const cuttingLaserParts = filterParts(parts.filter(p => p.machine_assignment === 'laser' && p.cutting_status === 'cutting'))

  // Calculate available options based on current filters
  const availableOptions = useMemo(() => {
    return getAvailableOptions(parts.filter(p => !p.machine_assignment), filters)
  }, [parts, filters])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">PO3 - Process Order System</h1>
      
      <Tabs defaultValue="ready" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="ready" className="data-[state=active]:bg-blue-100">
            Ready to Cut ({readyToCutParts.length})
          </TabsTrigger>
          <TabsTrigger value="assigned-saw" className="data-[state=active]:bg-yellow-100">
            Assigned Saw ({assignedSawParts.length})
          </TabsTrigger>
          <TabsTrigger value="cutting-saw" className="data-[state=active]:bg-green-100">
            Cutting Saw ({cuttingSawParts.length})
          </TabsTrigger>
          <TabsTrigger value="assigned-router" className="data-[state=active]:bg-yellow-100">
            Assigned Router ({assignedRouterParts.length})
          </TabsTrigger>
          <TabsTrigger value="cutting-router" className="data-[state=active]:bg-green-100">
            Cutting Router ({cuttingRouterParts.length})
          </TabsTrigger>
          <TabsTrigger value="assigned-laser" className="data-[state=active]:bg-yellow-100">
            Assigned Laser ({assignedLaserParts.length})
          </TabsTrigger>
          <TabsTrigger value="cutting-laser" className="data-[state=active]:bg-green-100">
            Cutting Laser ({cuttingLaserParts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ready" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => !p.machine_assignment)}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={readyToCutParts} 
            onMachineAssignment={handleMachineAssignment}
            showMachineActions={true}
            tableMode="ready"
          />
        </TabsContent>

        <TabsContent value="assigned-saw" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => p.machine_assignment === 'saw' && p.cutting_status === 'assigned')}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={assignedSawParts} 
            onMachineAssignment={handleMachineAssignment}
            onMoveToCutting={handleMoveToCutting}
            onMoveBackToReady={handleMoveBackToReady}
            showMachineActions={false}
            tableMode="assigned"
            currentMachine="saw"
          />
        </TabsContent>

        <TabsContent value="cutting-saw" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => p.machine_assignment === 'saw' && p.cutting_status === 'cutting')}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={cuttingSawParts} 
            onMachineAssignment={handleMachineAssignment}
            onMoveBackToAssigned={handleMoveBackToAssigned}
            showMachineActions={false}
            tableMode="cutting"
            currentMachine="saw"
          />
        </TabsContent>

        <TabsContent value="assigned-router" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => p.machine_assignment === 'router' && p.cutting_status === 'assigned')}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={assignedRouterParts} 
            onMachineAssignment={handleMachineAssignment}
            onMoveToCutting={handleMoveToCutting}
            onMoveBackToReady={handleMoveBackToReady}
            showMachineActions={false}
            tableMode="assigned"
            currentMachine="router"
          />
        </TabsContent>

        <TabsContent value="cutting-router" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => p.machine_assignment === 'router' && p.cutting_status === 'cutting')}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={cuttingRouterParts} 
            onMachineAssignment={handleMachineAssignment}
            onMoveBackToAssigned={handleMoveBackToAssigned}
            showMachineActions={false}
            tableMode="cutting"
            currentMachine="router"
          />
        </TabsContent>

        <TabsContent value="assigned-laser" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => p.machine_assignment === 'laser' && p.cutting_status === 'assigned')}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={assignedLaserParts} 
            onMachineAssignment={handleMachineAssignment}
            onMoveToCutting={handleMoveToCutting}
            onMoveBackToReady={handleMoveBackToReady}
            showMachineActions={false}
            tableMode="assigned"
            currentMachine="laser"
          />
        </TabsContent>

        <TabsContent value="cutting-laser" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => p.machine_assignment === 'laser' && p.cutting_status === 'cutting')}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={cuttingLaserParts} 
            onMachineAssignment={handleMachineAssignment}
            onMoveBackToAssigned={handleMoveBackToAssigned}
            showMachineActions={false}
            tableMode="cutting"
            currentMachine="laser"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}