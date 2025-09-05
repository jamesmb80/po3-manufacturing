'use client'

import { useState, useMemo } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Part } from '@/app/page'
import { ColumnConfig } from '@/components/column-visibility'

const columnHelper = createColumnHelper<Part>()

interface PartsTableProps {
  parts: Part[]
  // Legacy props (kept for compatibility)
  onMachineAssignment?: (parts: Part[], machine: 'saw' | 'router' | 'laser') => void
  onMoveToCutting?: (parts: Part[], machine: 'saw' | 'router' | 'laser') => void
  onMoveBackToReady?: (parts: Part[]) => void
  onMoveBackToAssigned?: (parts: Part[]) => void
  onCuttingComplete?: (parts: Part[]) => void
  onRejectPart?: (parts: Part[]) => void
  onProcessComplete?: (parts: Part[]) => void
  showMachineActions?: boolean
  // New props from page.tsx
  onAssignToMachine?: (partIds: string[], machine: 'saw' | 'router' | 'laser') => Promise<void>
  onMarkAsCut?: (partIds: string[]) => Promise<void>
  onSendTo?: (partIds: string[], destination: 'edge_banding' | 'lacquering') => Promise<void>
  onSendToRecuts?: (partIds: string[]) => Promise<void>
  tableMode?: 'ready' | 'assigned' | 'cutting' | 'processing' | 'ready_to_pack' | 'recuts' | 'edge-banding' | 'lacquering' | 'packing'
  currentMachine?: 'saw' | 'router' | 'laser'
  processingType?: 'edge_band' | 'lacquer'
  columnConfig?: ColumnConfig[]
}

// Helper function to parse date strings for sorting
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
  return new Date()
}

export default function PartsTable({ 
  parts, 
  onMachineAssignment, 
  onMoveToCutting,
  onMoveBackToReady,
  onMoveBackToAssigned,
  onCuttingComplete,
  onRejectPart,
  onProcessComplete,
  showMachineActions = false, 
  onAssignToMachine,
  onMarkAsCut,
  onSendTo,
  onSendToRecuts,
  tableMode = 'ready',
  currentMachine,
  processingType,
  columnConfig
}: PartsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  const columns = [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => {
            table.toggleAllPageRowsSelected(!!e.target.checked)
            if (e.target.checked) {
              setSelectedRows(new Set(table.getRowModel().rows.map(row => row.original.sheet_id)))
            } else {
              setSelectedRows(new Set())
            }
          }}
          className="w-4 h-4"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedRows.has(row.original.sheet_id)}
          onChange={(e) => {
            const newSelected = new Set(selectedRows)
            if (e.target.checked) {
              newSelected.add(row.original.sheet_id)
            } else {
              newSelected.delete(row.original.sheet_id)
            }
            setSelectedRows(newSelected)
          }}
          className="w-4 h-4"
        />
      ),
      enableSorting: false,
    }),
    columnHelper.accessor('sheet_id', {
      header: 'Part ID',
      cell: info => info.getValue(),
      sortingFn: (rowA, rowB) => {
        // Sort numerically
        const a = parseInt(rowA.original.sheet_id)
        const b = parseInt(rowB.original.sheet_id)
        return a - b
      },
    }),
    columnHelper.accessor('increment_id', {
      header: 'Order ID',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('cutting_date', {
      header: 'Cutting Date',
      cell: info => info.getValue(),
      sortingFn: (rowA, rowB) => {
        // Sort by actual date, not string
        const dateA = parseDate(rowA.original.cutting_date)
        const dateB = parseDate(rowB.original.cutting_date)
        return dateA.getTime() - dateB.getTime()
      },
    }),
    columnHelper.accessor('order_status', {
      header: 'Order Status',
      cell: info => (
        <span className={`px-2 py-1 rounded text-xs ${
          info.getValue() === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
        }`}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('processing_status', {
      header: 'Processing Status',
      cell: info => {
        const status = info.getValue()
        let bgColor = 'bg-gray-100 text-gray-800'
        let displayText = status || 'N/A'
        
        switch(status) {
          case 'ready_to_cut':
            bgColor = 'bg-blue-100 text-blue-800'
            displayText = 'Ready to Cut'
            break
          case 'assigned_to_saw':
          case 'assigned_to_router':
          case 'assigned_to_laser':
            bgColor = 'bg-yellow-100 text-yellow-800'
            displayText = status.replace('assigned_to_', 'Assigned to ').replace(/_/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase())
            break
          case 'cutting_saw':
          case 'cutting_router':
          case 'cutting_laser':
            bgColor = 'bg-green-100 text-green-800'
            displayText = 'Cutting ' + status.replace('cutting_', '').charAt(0).toUpperCase() + 
              status.replace('cutting_', '').slice(1)
            break
          case 'parts_to_edge_band':
            bgColor = 'bg-purple-100 text-purple-800'
            displayText = 'Edge Banding'
            break
          case 'parts_to_lacquer':
            bgColor = 'bg-purple-100 text-purple-800'
            displayText = 'Lacquering'
            break
          case 'ready_to_pack':
            bgColor = 'bg-orange-100 text-orange-800'
            displayText = 'Ready to Pack'
            break
          case 'recuts':
            bgColor = 'bg-red-100 text-red-800'
            displayText = 'Recuts'
            break
        }
        
        return (
          <span className={`px-2 py-1 rounded text-xs ${bgColor}`}>
            {displayText}
          </span>
        )
      },
    }),
    columnHelper.accessor('shipping_name', {
      header: 'Customer',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('material', {
      header: 'Material',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('type', {
      header: 'Type',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('colour', {
      header: 'Colour',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('finish', {
      header: 'Finish',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('thickness', {
      header: 'Thickness',
      cell: info => info.getValue() || '-',
      sortingFn: (rowA, rowB) => {
        // Sort thickness numerically (handle mm suffix)
        const parseThickness = (val: string | null) => {
          if (!val) return 0
          return parseFloat(val.replace('mm', ''))
        }
        const a = parseThickness(rowA.original.thickness)
        const b = parseThickness(rowB.original.thickness)
        return a - b
      },
    }),
    columnHelper.accessor('shape', {
      header: 'Shape',
      cell: info => info.getValue() || 'rectangle',
    }),
    columnHelper.accessor('length', {
      header: 'Length',
      cell: info => info.getValue() || '-',
      sortingFn: (rowA, rowB) => {
        // Sort numerically, handle null values and string format
        const parseValue = (val: string | null) => val ? parseFloat(val) : 0
        const a = parseValue(rowA.original.length)
        const b = parseValue(rowB.original.length)
        return a - b
      },
    }),
    columnHelper.accessor('width', {
      header: 'Width',
      cell: info => info.getValue() || '-',
      sortingFn: (rowA, rowB) => {
        // Sort numerically, handle null values and string format
        const parseValue = (val: string | null) => val ? parseFloat(val) : 0
        const a = parseValue(rowA.original.width)
        const b = parseValue(rowB.original.width)
        return a - b
      },
    }),
    columnHelper.accessor('tags', {
      header: 'Tags',
      cell: info => info.getValue(),
    }),
  ]

  // Add cutting status column for assigned/cutting views
  if (tableMode !== 'ready' && currentMachine) {
    columns.splice(4, 0, columnHelper.display({
      id: 'cutting_status',
      header: 'Cutting Status',
      cell: ({ row }) => {
        const status = row.original.processing_status
        const isCutting = status?.includes('cutting')
        const isAssigned = status?.includes('assigned')
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            isCutting
              ? 'bg-green-100 text-green-800' 
              : isAssigned
              ? 'bg-blue-100 text-blue-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isCutting ? 'Cutting' : isAssigned ? 'Assigned' : 'Pending'}
          </span>
        )
      },
      enableSorting: false,
    }))
  }

  // Filter columns based on visibility configuration
  const visibleColumns = useMemo(() => {
    if (!columnConfig) return columns
    
    const visibleIds = new Set(
      columnConfig.filter(col => col.visible).map(col => col.id)
    )
    
    return columns.filter(col => {
      const columnId = col.id || (col as any).accessorKey
      return visibleIds.has(columnId)
    })
  }, [columns, columnConfig])

  const table = useReactTable({
    data: parts,
    columns: visibleColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  const handleMachineAssignment = (machine: 'saw' | 'router' | 'laser') => {
    if (!onMachineAssignment) return
    const selectedParts = parts.filter(p => selectedRows.has(p.sheet_id))
    if (selectedParts.length > 0) {
      onMachineAssignment(selectedParts, machine)
      setSelectedRows(new Set())
    }
  }

  const handleMoveToCutting = () => {
    if (!currentMachine || !onMoveToCutting) return
    const selectedParts = parts.filter(p => selectedRows.has(p.sheet_id))
    if (selectedParts.length > 0) {
      onMoveToCutting(selectedParts, currentMachine)
      setSelectedRows(new Set())
    }
  }

  const handleMoveBackToReady = () => {
    if (!onMoveBackToReady) return
    const selectedParts = parts.filter(p => selectedRows.has(p.sheet_id))
    if (selectedParts.length > 0) {
      onMoveBackToReady(selectedParts)
      setSelectedRows(new Set())
    }
  }

  const handleMoveBackToAssigned = () => {
    if (!onMoveBackToAssigned) return
    const selectedParts = parts.filter(p => selectedRows.has(p.sheet_id))
    if (selectedParts.length > 0) {
      onMoveBackToAssigned(selectedParts)
      setSelectedRows(new Set())
    }
  }

  const handleCuttingComplete = () => {
    if (!onCuttingComplete) return
    const selectedParts = parts.filter(p => selectedRows.has(p.sheet_id))
    if (selectedParts.length > 0) {
      onCuttingComplete(selectedParts)
      setSelectedRows(new Set())
    }
  }

  const handleReject = () => {
    if (!onRejectPart) return
    const selectedParts = parts.filter(p => selectedRows.has(p.sheet_id))
    if (selectedParts.length > 0) {
      onRejectPart(selectedParts)
      setSelectedRows(new Set())
    }
  }

  const handleProcessComplete = () => {
    if (!onProcessComplete) return
    const selectedParts = parts.filter(p => selectedRows.has(p.sheet_id))
    if (selectedParts.length > 0) {
      onProcessComplete(selectedParts)
      setSelectedRows(new Set())
    }
  }

  // Helper function to render sort indicator
  const renderSortIndicator = (column: any) => {
    if (!column.getCanSort()) return null
    
    const isSorted = column.getIsSorted()
    
    if (!isSorted) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />
    }
    
    return isSorted === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-600" />
    )
  }

  return (
    <div className="space-y-4">
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded">
          <span className="text-sm font-medium">{selectedRows.size} parts selected</span>
          
          {/* Ready to Cut Actions */}
          {tableMode === 'ready' && showMachineActions && (
            <>
              <button
                onClick={() => handleMachineAssignment('saw')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Assign to Saw
              </button>
              <button
                onClick={() => handleMachineAssignment('router')}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Assign to Router
              </button>
              <button
                onClick={() => handleMachineAssignment('laser')}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Assign to Laser
              </button>
            </>
          )}
          
          {/* Assigned Actions */}
          {tableMode === 'assigned' && (
            <>
              <button
                onClick={handleMoveToCutting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Move to Cutting (Export CSV)
              </button>
              <button
                onClick={handleMoveBackToReady}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Back to Ready to Cut
              </button>
            </>
          )}
          
          {/* Cutting Actions */}
          {tableMode === 'cutting' && (
            <>
              <button
                onClick={handleCuttingComplete}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Cut Complete
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reject/Recut
              </button>
              <button
                onClick={handleMoveBackToAssigned}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Back to Assigned
              </button>
            </>
          )}

          {/* Processing Actions (Edge Band/Lacquer) */}
          {tableMode === 'processing' && (
            <>
              <button
                onClick={handleProcessComplete}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Process Complete
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reject/Recut
              </button>
            </>
          )}

          {/* Recuts Actions */}
          {tableMode === 'recuts' && (
            <button
              onClick={handleMoveBackToReady}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Send Back to Ready to Cut
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      header.column.getCanSort() ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {renderSortIndicator(header.column)}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4 text-center text-sm text-gray-500">
                  No parts found matching the current filters
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">
            Showing {table.getState().pagination.pageIndex * 10 + 1} to{' '}
            {Math.min((table.getState().pagination.pageIndex + 1) * 10, parts.length)} of {parts.length} parts
          </span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>
    </div>
  )
}