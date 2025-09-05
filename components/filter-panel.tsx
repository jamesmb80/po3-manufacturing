'use client'

import { useState, useMemo } from 'react'
import { Filter, X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { Part } from '@/app/page'
import { AvailableOptions } from '@/lib/filter-utils'
import { ColumnConfig } from '@/components/column-visibility'

interface FilterPanelProps {
  filters: {
    material: string[]
    orderStatus: string[]
    type: string[]
    thickness: string[]
    tags: string[]
    cuttingDateFrom: string
    cuttingDateTo: string
  }
  setFilters: (filters: any) => void
  allParts: Part[]
  availableOptions?: AvailableOptions
  columnConfig?: ColumnConfig[]
}

export default function FilterPanel({ filters, setFilters, allParts, availableOptions, columnConfig }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false) // Start collapsed for cleaner initial view
  const [expandedSections, setExpandedSections] = useState({
    dates: false, // Start individual sections collapsed too
    material: false,
    type: false,
    thickness: false,
    tags: false,
    status: false,
  })

  // Extract unique values from all parts
  const uniqueValues = useMemo(() => {
    const materials = [...new Set(allParts.map(p => p.material))].sort()
    const statuses = [...new Set(allParts.map(p => p.order_status))].sort()
    const types = [...new Set(allParts.map(p => p.type || 'None'))].sort()
    const thicknesses = [...new Set(allParts.map(p => p.thickness).filter((t): t is string => Boolean(t)))].sort((a, b) => {
      // Sort thickness numerically
      const aNum = parseInt(a)
      const bNum = parseInt(b)
      return aNum - bNum
    })
    
    // Extract individual tags from comma-separated values
    const allTags = new Set<string>()
    allParts.forEach(part => {
      if (part.tags) {
        part.tags.split(',').forEach(tag => {
          allTags.add(tag.trim())
        })
      }
    })
    const tags = [...allTags].sort()

    return { materials, statuses, types, thicknesses, tags }
  }, [allParts])

  // Helper function to check if an option is available
  const isOptionAvailable = (option: string, optionType: 'materials' | 'types' | 'thicknesses' | 'tags' | 'statuses') => {
    if (!availableOptions) return true // If no available options provided, all are available
    const availableSet = availableOptions[optionType]
    return availableSet.size === 0 || availableSet.has(option)
  }

  // Helper function to get count of available items for an option
  const getOptionCount = (option: string, optionType: string) => {
    // This could be enhanced to show actual counts
    if (!availableOptions) return null
    const isAvailable = isOptionAvailable(option, optionType as any)
    return isAvailable ? null : 0
  }

  // Helper function to check if a column is visible
  const isColumnVisible = (columnId: string) => {
    if (!columnConfig) return true // If no column config, show all filters
    const column = columnConfig.find(col => col.id === columnId)
    return column ? column.visible : true
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleMaterialChange = (material: string) => {
    const newMaterials = filters.material.includes(material)
      ? filters.material.filter(m => m !== material)
      : [...filters.material, material]
    setFilters({ ...filters, material: newMaterials })
  }

  const handleStatusChange = (status: string) => {
    const newStatuses = filters.orderStatus.includes(status)
      ? filters.orderStatus.filter(s => s !== status)
      : [...filters.orderStatus, status]
    setFilters({ ...filters, orderStatus: newStatuses })
  }

  const handleTypeChange = (type: string) => {
    const newTypes = filters.type.includes(type)
      ? filters.type.filter(t => t !== type)
      : [...filters.type, type]
    setFilters({ ...filters, type: newTypes })
  }

  const handleThicknessChange = (thickness: string) => {
    const newThicknesses = filters.thickness.includes(thickness)
      ? filters.thickness.filter(t => t !== thickness)
      : [...filters.thickness, thickness]
    setFilters({ ...filters, thickness: newThicknesses })
  }

  const handleTagChange = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]
    setFilters({ ...filters, tags: newTags })
  }

  const clearFilters = () => {
    setFilters({
      material: [],
      orderStatus: [],
      type: [],
      thickness: [],
      tags: [],
      cuttingDateFrom: '',
      cuttingDateTo: '',
    })
  }

  const activeFilterCount = 
    filters.material.length + 
    filters.orderStatus.length + 
    filters.type.length +
    filters.thickness.length +
    filters.tags.length +
    (filters.cuttingDateFrom ? 1 : 0) + 
    (filters.cuttingDateTo ? 1 : 0)

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <div className={`flex items-center justify-between ${isOpen ? 'p-4 border-b' : 'p-4'}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 font-medium hover:text-blue-600 transition-colors"
        >
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Date Filters */}
          {isColumnVisible('cutting_date') && (
            <div className="border-b pb-3">
              <button
                onClick={() => toggleSection('dates')}
                className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <span>Cutting Dates</span>
                {expandedSections.dates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.dates && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">From</label>
                    <input
                      type="date"
                      value={filters.cuttingDateFrom}
                      onChange={(e) => setFilters({ ...filters, cuttingDateFrom: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">To</label>
                    <input
                      type="date"
                      value={filters.cuttingDateTo}
                      onChange={(e) => setFilters({ ...filters, cuttingDateTo: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Material Filter */}
            {isColumnVisible('material') && (
              <div>
                <button
                  onClick={() => toggleSection('material')}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
                >
                  <span>Material {filters.material.length > 0 && `(${filters.material.length})`}</span>
                  {expandedSections.material ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.material && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {uniqueValues.materials.map(material => {
                      const isAvailable = isOptionAvailable(material, 'materials')
                      const count = getOptionCount(material, 'materials')
                      return (
                        <label 
                          key={material} 
                          className={`flex items-center px-1 ${
                            isAvailable ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={filters.material.includes(material)}
                            onChange={() => isAvailable && handleMaterialChange(material)}
                            disabled={!isAvailable}
                            className="mr-2"
                          />
                          <span className={`text-sm ${!isAvailable ? 'text-gray-400' : ''}`}>
                            {material}
                          </span>
                          {count === 0 && (
                            <span className="ml-auto text-xs text-gray-400">(0)</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Type Filter */}
            {isColumnVisible('type') && (
              <div>
                <button
                  onClick={() => toggleSection('type')}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
                >
                  <span>Type {filters.type.length > 0 && `(${filters.type.length})`}</span>
                  {expandedSections.type ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.type && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {uniqueValues.types.map(type => {
                      const isAvailable = isOptionAvailable(type, 'types')
                      const count = getOptionCount(type, 'types')
                      return (
                        <label 
                          key={type} 
                          className={`flex items-center px-1 ${
                            isAvailable ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={filters.type.includes(type)}
                            onChange={() => isAvailable && handleTypeChange(type)}
                            disabled={!isAvailable}
                            className="mr-2"
                          />
                          <span className={`text-sm ${!isAvailable ? 'text-gray-400' : ''}`}>
                            {type === 'None' ? 'No Type' : type}
                          </span>
                          {count === 0 && (
                            <span className="ml-auto text-xs text-gray-400">(0)</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Thickness Filter */}
            {isColumnVisible('thickness') && (
              <div>
                <button
                  onClick={() => toggleSection('thickness')}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
                >
                  <span>Thickness {filters.thickness.length > 0 && `(${filters.thickness.length})`}</span>
                  {expandedSections.thickness ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.thickness && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {uniqueValues.thicknesses.map(thickness => {
                      const isAvailable = isOptionAvailable(thickness, 'thicknesses')
                      const count = getOptionCount(thickness, 'thicknesses')
                      return (
                        <label 
                          key={thickness} 
                          className={`flex items-center px-1 ${
                            isAvailable ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={filters.thickness.includes(thickness)}
                            onChange={() => isAvailable && handleThicknessChange(thickness)}
                            disabled={!isAvailable}
                            className="mr-2"
                          />
                          <span className={`text-sm ${!isAvailable ? 'text-gray-400' : ''}`}>
                            {thickness}
                          </span>
                          {count === 0 && (
                            <span className="ml-auto text-xs text-gray-400">(0)</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tags Filter */}
            {isColumnVisible('tags') && (
              <div>
                <button
                  onClick={() => toggleSection('tags')}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
                >
                  <span>Tags {filters.tags.length > 0 && `(${filters.tags.length})`}</span>
                  {expandedSections.tags ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.tags && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {uniqueValues.tags.map(tag => {
                      const isAvailable = isOptionAvailable(tag, 'tags')
                      const count = getOptionCount(tag, 'tags')
                      return (
                        <label 
                          key={tag} 
                          className={`flex items-center px-1 ${
                            isAvailable ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={filters.tags.includes(tag)}
                            onChange={() => isAvailable && handleTagChange(tag)}
                            disabled={!isAvailable}
                            className="mr-2"
                          />
                          <span className={`text-sm ${!isAvailable ? 'text-gray-400' : ''}`}>
                            {tag}
                          </span>
                          {count === 0 && (
                            <span className="ml-auto text-xs text-gray-400">(0)</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Order Status Filter */}
            {isColumnVisible('order_status') && (
              <div>
                <button
                  onClick={() => toggleSection('status')}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
                >
                  <span>Order Status {filters.orderStatus.length > 0 && `(${filters.orderStatus.length})`}</span>
                  {expandedSections.status ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.status && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {uniqueValues.statuses.map(status => {
                      const isAvailable = isOptionAvailable(status, 'statuses')
                      const count = getOptionCount(status, 'statuses')
                      return (
                        <label 
                          key={status} 
                          className={`flex items-center px-1 ${
                            isAvailable ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={filters.orderStatus.includes(status)}
                            onChange={() => isAvailable && handleStatusChange(status)}
                            disabled={!isAvailable}
                            className="mr-2"
                          />
                          <span className={`text-sm ${!isAvailable ? 'text-gray-400' : ''}`}>
                            {status}
                          </span>
                          {count === 0 && (
                            <span className="ml-auto text-xs text-gray-400">(0)</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Filters Display - Show even when collapsed if there are active filters */}
      {activeFilterCount > 0 && (
        <div className={`flex flex-wrap gap-2 ${isOpen ? 'px-4 pb-4' : 'p-4 border-t'}`}>
          {filters.material.map(material => (
            <span
              key={material}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
            >
              Material: {material}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-blue-600" 
                onClick={() => handleMaterialChange(material)}
              />
            </span>
          ))}
          {filters.type.map(type => (
            <span
              key={type}
              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs"
            >
              Type: {type === 'None' ? 'No Type' : type}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-purple-600" 
                onClick={() => handleTypeChange(type)}
              />
            </span>
          ))}
          {filters.thickness.map(thickness => (
            <span
              key={thickness}
              className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs"
            >
              Thickness: {thickness}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-yellow-600" 
                onClick={() => handleThicknessChange(thickness)}
              />
            </span>
          ))}
          {filters.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-800 rounded-full text-xs"
            >
              Tag: {tag}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-pink-600" 
                onClick={() => handleTagChange(tag)}
              />
            </span>
          ))}
          {filters.orderStatus.map(status => (
            <span
              key={status}
              className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs"
            >
              Status: {status}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-green-600" 
                onClick={() => handleStatusChange(status)}
              />
            </span>
          ))}
          {filters.cuttingDateFrom && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs"
            >
              From: {filters.cuttingDateFrom}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-indigo-600" 
                onClick={() => setFilters({ ...filters, cuttingDateFrom: '' })}
              />
            </span>
          )}
          {filters.cuttingDateTo && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs"
            >
              To: {filters.cuttingDateTo}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-indigo-600" 
                onClick={() => setFilters({ ...filters, cuttingDateTo: '' })}
              />
            </span>
          )}
        </div>
      )}
    </div>
  )
}