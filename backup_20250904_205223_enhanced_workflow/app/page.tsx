'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PartsTable from '@/components/parts-table'
import FilterPanel from '@/components/filter-panel'
import { getAvailableOptions } from '@/lib/filter-utils'
import { exportPartsToCSV } from '@/lib/csv-utils'
import { completeProcess, rejectPart } from '@/lib/workflow-engine'
import sampleData from '@/order_data_table.json'

export type Part = {
  sheet_id: string
  increment_id: string
  cutting_date: string
  order_status: string  // Original Magento status
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
  processing_status?: 'ready_to_cut' | 'assigned_to_saw' | 'assigned_to_router' | 'assigned_to_laser' | 
    'cutting_saw' | 'cutting_router' | 'cutting_laser' | 
    'parts_to_edge_band' | 'parts_to_lacquer' | 'ready_to_pack' | 'recuts' | null
  completed_processes?: string[]  // Track which processes are done
  next_process?: string  // Calculated next destination
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
    // Try to load from localStorage first
    const stored = localStorage.getItem('po3_parts')
    if (stored) {
      try {
        const storedParts = JSON.parse(stored) as Part[]
        setParts(storedParts)
      } catch {
        // If parse fails, load sample data
        initializeSampleData()
      }
    } else {
      // No stored data, initialize with sample data
      initializeSampleData()
    }
  }, [])

  const initializeSampleData = () => {
    const partsWithAssignment: Part[] = sampleData.map(part => ({
      ...part,
      machine_assignment: null,
      processing_status: 'ready_to_cut' as const,
      completed_processes: [],
      next_process: undefined
    }))
    setParts(partsWithAssignment)
  }

  // Sync parts to localStorage for operator stations
  useEffect(() => {
    if (parts.length > 0) {
      localStorage.setItem('po3_parts', JSON.stringify(parts))
    }
  }, [parts])

  // Listen for storage changes from other windows (operator stations)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'po3_parts' && e.newValue) {
        try {
          const updatedParts = JSON.parse(e.newValue) as Part[]
          setParts(updatedParts)
        } catch (error) {
          console.error('Failed to parse storage update:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleMachineAssignment = (selectedParts: Part[], machine: 'saw' | 'router' | 'laser') => {
    setParts(prevParts => 
      prevParts.map(part => 
        selectedParts.find(sp => sp.sheet_id === part.sheet_id)
          ? { ...part, machine_assignment: machine, processing_status: `assigned_to_${machine}` as Part['processing_status'] }
          : part
      )
    )
  }

  const handleMoveToCutting = (selectedParts: Part[], machine: 'saw' | 'router' | 'laser') => {
    // Export to CSV before moving to cutting
    exportPartsToCSV(selectedParts, machine)
    
    // Update to cutting status
    setParts(prevParts => 
      prevParts.map(part => 
        selectedParts.find(sp => sp.sheet_id === part.sheet_id)
          ? { ...part, processing_status: `cutting_${machine}` as Part['processing_status'] }
          : part
      )
    )
  }

  const handleMoveBackToReady = (selectedParts: Part[]) => {
    setParts(prevParts => 
      prevParts.map(part => 
        selectedParts.find(sp => sp.sheet_id === part.sheet_id)
          ? { ...part, machine_assignment: null, processing_status: 'ready_to_cut', completed_processes: [] }
          : part
      )
    )
  }

  const handleMoveBackToAssigned = (selectedParts: Part[]) => {
    setParts(prevParts => 
      prevParts.map(part => {
        const selected = selectedParts.find(sp => sp.sheet_id === part.sheet_id)
        if (!selected) return part
        const machine = part.machine_assignment
        return { ...part, processing_status: `assigned_to_${machine}` as Part['processing_status'] }
      })
    )
  }

  // Handle completion of cutting (routes based on tags)
  const handleCuttingComplete = (selectedParts: Part[]) => {
    setParts(prevParts => 
      prevParts.map(part => {
        const selected = selectedParts.find(sp => sp.sheet_id === part.sheet_id)
        if (!selected) return part
        return completeProcess(part, 'cutting')
      })
    )
  }

  // Handle rejection of parts
  const handleRejectPart = (selectedParts: Part[]) => {
    setParts(prevParts => 
      prevParts.map(part => {
        const selected = selectedParts.find(sp => sp.sheet_id === part.sheet_id)
        if (!selected) return part
        return rejectPart(part)
      })
    )
  }

  // Handle edge band completion
  const handleEdgeBandComplete = (selectedParts: Part[]) => {
    setParts(prevParts => 
      prevParts.map(part => {
        const selected = selectedParts.find(sp => sp.sheet_id === part.sheet_id)
        if (!selected) return part
        return completeProcess(part, 'edge_banding')
      })
    )
  }

  // Handle lacquer completion  
  const handleLacquerComplete = (selectedParts: Part[]) => {
    setParts(prevParts => 
      prevParts.map(part => {
        const selected = selectedParts.find(sp => sp.sheet_id === part.sheet_id)
        if (!selected) return part
        return completeProcess(part, 'lacquering')
      })
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

  // Filter parts based on processing status
  const readyToCutParts = filterParts(parts.filter(p => p.processing_status === 'ready_to_cut'))
  const assignedSawParts = filterParts(parts.filter(p => p.processing_status === 'assigned_to_saw'))
  const cuttingSawParts = filterParts(parts.filter(p => p.processing_status === 'cutting_saw'))
  const assignedRouterParts = filterParts(parts.filter(p => p.processing_status === 'assigned_to_router'))
  const cuttingRouterParts = filterParts(parts.filter(p => p.processing_status === 'cutting_router'))
  const assignedLaserParts = filterParts(parts.filter(p => p.processing_status === 'assigned_to_laser'))
  const cuttingLaserParts = filterParts(parts.filter(p => p.processing_status === 'cutting_laser'))
  const partsToEdgeBand = filterParts(parts.filter(p => p.processing_status === 'parts_to_edge_band'))
  const partsToLacquer = filterParts(parts.filter(p => p.processing_status === 'parts_to_lacquer'))
  const readyToPackParts = filterParts(parts.filter(p => p.processing_status === 'ready_to_pack'))
  const recutsParts = filterParts(parts.filter(p => p.processing_status === 'recuts'))

  // Calculate available options based on current filters
  const availableOptions = useMemo(() => {
    return getAvailableOptions(parts.filter(p => p.processing_status === 'ready_to_cut'), filters)
  }, [parts, filters])

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">PO3 - Process Order System</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              initializeSampleData()
              localStorage.removeItem('po3_parts')
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reset Data
          </button>
          <a
            href="/admin"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Admin Panel
          </a>
          <div className="relative group">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Operator Stations ▼
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-white shadow-lg rounded-lg hidden group-hover:block z-10">
              <button
                onClick={() => window.open('/operator/saw', '_blank')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Saw Station
              </button>
              <button
                onClick={() => window.open('/operator/router', '_blank')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Router Station
              </button>
              <button
                onClick={() => window.open('/operator/laser', '_blank')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Laser Station
              </button>
              <button
                onClick={() => window.open('/operator/edge-bander', '_blank')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Edge Bander Station
              </button>
              <button
                onClick={() => window.open('/operator/lacquering', '_blank')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Lacquering Station
              </button>
            </div>
          </div>
        </div>
      </div>
      
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
          <TabsTrigger value="edge-band" className="data-[state=active]:bg-purple-100">
            Parts to Edge Band ({partsToEdgeBand.length})
          </TabsTrigger>
          <TabsTrigger value="lacquer" className="data-[state=active]:bg-purple-100">
            Parts to Lacquer ({partsToLacquer.length})
          </TabsTrigger>
          <TabsTrigger value="ready-pack" className="data-[state=active]:bg-orange-100">
            Ready to Pack ({readyToPackParts.length})
          </TabsTrigger>
          <TabsTrigger value="recuts" className="data-[state=active]:bg-red-100">
            Recuts ({recutsParts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ready" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => p.processing_status === 'ready_to_cut')}
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
            allParts={parts.filter(p => p.processing_status === 'assigned_to_saw')}
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
            allParts={parts.filter(p => p.processing_status === 'cutting_saw')}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={cuttingSawParts} 
            onMachineAssignment={handleMachineAssignment}
            onMoveBackToAssigned={handleMoveBackToAssigned}
            onCuttingComplete={handleCuttingComplete}
            onRejectPart={handleRejectPart}
            showMachineActions={false}
            tableMode="cutting"
            currentMachine="saw"
          />
        </TabsContent>

        <TabsContent value="assigned-router" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => p.processing_status === 'assigned_to_router')}
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
            allParts={parts.filter(p => p.processing_status === 'cutting_router')}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={cuttingRouterParts} 
            onMachineAssignment={handleMachineAssignment}
            onMoveBackToAssigned={handleMoveBackToAssigned}
            onCuttingComplete={handleCuttingComplete}
            onRejectPart={handleRejectPart}
            showMachineActions={false}
            tableMode="cutting"
            currentMachine="router"
          />
        </TabsContent>

        <TabsContent value="assigned-laser" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => p.processing_status === 'assigned_to_laser')}
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
            allParts={parts.filter(p => p.processing_status === 'cutting_laser')}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={cuttingLaserParts} 
            onMachineAssignment={handleMachineAssignment}
            onMoveBackToAssigned={handleMoveBackToAssigned}
            onCuttingComplete={handleCuttingComplete}
            onRejectPart={handleRejectPart}
            showMachineActions={false}
            tableMode="cutting"
            currentMachine="laser"
          />
        </TabsContent>

        <TabsContent value="edge-band" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => p.processing_status === 'parts_to_edge_band')}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={partsToEdgeBand} 
            onProcessComplete={handleEdgeBandComplete}
            onRejectPart={handleRejectPart}
            showMachineActions={false}
            tableMode="processing"
            processingType="edge_band"
          />
        </TabsContent>

        <TabsContent value="lacquer" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => p.processing_status === 'parts_to_lacquer')}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={partsToLacquer} 
            onProcessComplete={handleLacquerComplete}
            onRejectPart={handleRejectPart}
            showMachineActions={false}
            tableMode="processing"
            processingType="lacquer"
          />
        </TabsContent>

        <TabsContent value="ready-pack" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => p.processing_status === 'ready_to_pack')}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={readyToPackParts} 
            showMachineActions={false}
            tableMode="ready_to_pack"
          />
        </TabsContent>

        <TabsContent value="recuts" className="space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            allParts={parts.filter(p => p.processing_status === 'recuts')}
            availableOptions={availableOptions}
          />
          <PartsTable 
            parts={recutsParts} 
            onMoveBackToReady={handleMoveBackToReady}
            showMachineActions={false}
            tableMode="recuts"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}