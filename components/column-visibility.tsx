'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Settings, Check } from 'lucide-react'

export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  required?: boolean // Some columns can't be hidden
  category?: string // Group columns by category
}

interface ColumnVisibilityProps {
  columns: ColumnConfig[]
  onVisibilityChange: (columns: ColumnConfig[]) => void
  storageKey?: string // Key for localStorage persistence
}

export default function ColumnVisibility({
  columns: initialColumns,
  onVisibilityChange,
  storageKey = 'ready2cut-columns'
}: ColumnVisibilityProps) {
  const [columns, setColumns] = useState<ColumnConfig[]>(initialColumns)
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Load saved preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const savedConfig = JSON.parse(saved)
        const merged = initialColumns.map(col => ({
          ...col,
          visible: savedConfig[col.id] !== undefined ? savedConfig[col.id] : col.visible
        }))
        setColumns(merged)
        onVisibilityChange(merged)
      } catch (e) {
        console.error('Failed to load column preferences:', e)
      }
    }
  }, [])

  // Save preferences
  const savePreferences = (newColumns: ColumnConfig[]) => {
    const config = newColumns.reduce((acc, col) => ({
      ...acc,
      [col.id]: col.visible
    }), {})
    localStorage.setItem(storageKey, JSON.stringify(config))
  }

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    const newColumns = columns.map(col => 
      col.id === columnId && !col.required
        ? { ...col, visible: !col.visible }
        : col
    )
    setColumns(newColumns)
    onVisibilityChange(newColumns)
    savePreferences(newColumns)
  }

  // Toggle all columns in a category
  const toggleCategory = (category: string, visible: boolean) => {
    const newColumns = columns.map(col => 
      col.category === category && !col.required
        ? { ...col, visible }
        : col
    )
    setColumns(newColumns)
    onVisibilityChange(newColumns)
    savePreferences(newColumns)
  }

  // Reset to defaults
  const resetToDefaults = () => {
    setColumns(initialColumns)
    onVisibilityChange(initialColumns)
    localStorage.removeItem(storageKey)
  }

  // Group columns by category
  const groupedColumns = columns.reduce((acc, col) => {
    const category = col.category || 'General'
    if (!acc[category]) acc[category] = []
    acc[category].push(col)
    return acc
  }, {} as Record<string, ColumnConfig[]>)

  // Filter columns by search
  const filteredGroups = Object.entries(groupedColumns).reduce((acc, [category, cols]) => {
    const filtered = cols.filter(col => 
      col.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
    if (filtered.length > 0) {
      acc[category] = filtered
    }
    return acc
  }, {} as Record<string, ColumnConfig[]>)

  const visibleCount = columns.filter(c => c.visible).length
  const totalCount = columns.length

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Settings className="w-4 h-4" />
        Columns ({visibleCount}/{totalCount})
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 z-50 w-80 mt-2 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Column Visibility
                </h3>
                <button
                  onClick={resetToDefaults}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Reset to defaults
                </button>
              </div>
              
              {/* Search */}
              <input
                type="text"
                placeholder="Search columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {Object.entries(filteredGroups).map(([category, categoryColumns]) => (
                <div key={category} className="border-b last:border-b-0">
                  <div className="px-4 py-2 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600 uppercase">
                        {category}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleCategory(category, true)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Show all
                        </button>
                        <button
                          onClick={() => toggleCategory(category, false)}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          Hide all
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2">
                    {categoryColumns.map(column => (
                      <label
                        key={column.id}
                        className={`flex items-center gap-3 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer ${
                          column.required ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={column.visible}
                          onChange={() => toggleColumn(column.id)}
                          disabled={column.required}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center justify-between flex-1">
                          <span className="text-sm text-gray-700">
                            {column.label}
                          </span>
                          {column.visible ? (
                            <Eye className="w-3.5 h-3.5 text-gray-400" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-gray-50 border-t">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{visibleCount} columns visible</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Default column configuration for Ready2Cut
export const DEFAULT_COLUMNS: ColumnConfig[] = [
  // Required columns
  { id: 'select', label: 'Select', visible: true, required: true, category: 'Actions' },
  { id: 'sheet_id', label: 'Part ID', visible: true, required: true, category: 'Identification' },
  { id: 'increment_id', label: 'Order ID', visible: true, required: true, category: 'Identification' },
  
  // Status columns
  { id: 'cutting_date', label: 'Cutting Date', visible: true, category: 'Status' },
  { id: 'order_status', label: 'Order Status', visible: true, category: 'Status' },
  { id: 'processing_status', label: 'Processing Status', visible: true, category: 'Status' },
  { id: 'status_updated', label: 'Status Updated', visible: false, category: 'Status' },
  
  // Customer info
  { id: 'shipping_name', label: 'Shipping Name', visible: true, category: 'Customer' },
  { id: 'billing_name', label: 'Billing Name', visible: false, category: 'Customer' },
  
  // Material properties (from EAV)
  { id: 'material', label: 'Material', visible: true, category: 'Material' },
  { id: 'type', label: 'Type', visible: true, category: 'Material' },
  { id: 'colour', label: 'Colour', visible: false, category: 'Material' },
  { id: 'finish', label: 'Finish', visible: false, category: 'Material' },
  { id: 'finish_2', label: 'Finish 2', visible: false, category: 'Material' },
  { id: 'thickness', label: 'Thickness', visible: true, category: 'Material' },
  
  // Dimensions
  { id: 'shape', label: 'Shape', visible: false, category: 'Dimensions' },
  { id: 'length', label: 'Length', visible: true, category: 'Dimensions' },
  { id: 'width', label: 'Width', visible: true, category: 'Dimensions' },
  { id: 'height', label: 'Height', visible: false, category: 'Dimensions' },
  { id: 'depth', label: 'Depth', visible: false, category: 'Dimensions' },
  { id: 'diameter', label: 'Diameter', visible: false, category: 'Dimensions' },
  
  // Product Information
  { id: 'product_type', label: 'Product Type', visible: false, category: 'Product' },
  { id: 'kit_type', label: 'Kit Type', visible: false, category: 'Product' },
  { id: 'order_part', label: 'Order Part', visible: false, category: 'Product' },
  { id: 'kit_part', label: 'Kit Part', visible: false, category: 'Product' },
  
  // Process & Production
  { id: 'tags', label: 'Tags', visible: true, category: 'Process' },
  { id: 'notes', label: 'Notes', visible: false, category: 'Process' },
  { id: 'action', label: 'Action', visible: false, category: 'Process' },
  { id: 'cutter_id', label: 'Cutter ID', visible: false, category: 'Production' },
  { id: 'cutter_date', label: 'Cut Date', visible: false, category: 'Production' },
  { id: 'recut_count', label: 'Recuts', visible: false, category: 'Production' },
  { id: 'oversize', label: 'Oversize', visible: false, category: 'Production' },
  
  // Dates & Scheduling
  { id: 'delivery_date', label: 'Delivery Date', visible: false, category: 'Scheduling' },
  { id: 'order_created', label: 'Order Created', visible: false, category: 'Scheduling' },
  
  // Advanced
  { id: 'raw_order_status', label: 'Raw Status', visible: false, category: 'Advanced' },
  { id: 'order_shipping', label: 'Shipping Info', visible: false, category: 'Advanced' },
  { id: 'item_name', label: 'Original Item Name', visible: false, category: 'Advanced' },
  { id: 'further_id', label: 'Further ID', visible: false, category: 'Advanced' },
  { id: 'further_date', label: 'Further Date', visible: false, category: 'Advanced' },
]