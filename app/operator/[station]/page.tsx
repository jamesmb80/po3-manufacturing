'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Part } from '@/app/page'
import { completeProcess, rejectPart } from '@/lib/workflow-engine'
import { partsApi, supabaseClient } from '@/lib/supabase-client'

type StationType = 'saw' | 'router' | 'laser' | 'edge-bander' | 'lacquering'

const stationConfig: Record<StationType, {
  title: string
  status: Part['processing_status']
  processType?: 'cutting' | 'edge_banding' | 'lacquering'
  nextAction: string
  color: string
}> = {
  'saw': {
    title: 'SAW',
    status: 'cutting_saw',
    processType: 'cutting',
    nextAction: 'Cut Complete',
    color: 'blue'
  },
  'router': {
    title: 'ROUTER',
    status: 'cutting_router',
    processType: 'cutting',
    nextAction: 'Cut Complete',
    color: 'green'
  },
  'laser': {
    title: 'LASER',
    status: 'cutting_laser',
    processType: 'cutting',
    nextAction: 'Cut Complete',
    color: 'purple'
  },
  'edge-bander': {
    title: 'EDGE BANDER',
    status: 'parts_to_edge_band',
    processType: 'edge_banding',
    nextAction: 'Edge Band Complete',
    color: 'indigo'
  },
  'lacquering': {
    title: 'LACQUERING',
    status: 'parts_to_lacquer',
    processType: 'lacquering',
    nextAction: 'Lacquer Complete',
    color: 'pink'
  }
}

export default function OperatorStation({ params }: { params: Promise<{ station: StationType }> }) {
  const [station, setStation] = useState<StationType | null>(null)
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    params.then(p => {
      setStation(p.station)
      setConfig(stationConfig[p.station])
    })
  }, [params])

  if (!station || !config) {
    return <div>Loading...</div>
  }
  
  return <OperatorStationContent station={station} config={config} />
}

function OperatorStationContent({ station, config }: { station: StationType, config: typeof stationConfig[StationType] }) {
  const [parts, setParts] = useState<Part[]>([])
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Load parts from Supabase
    const loadParts = async () => {
      try {
        const allParts = await partsApi.getAll()
        const stationParts = allParts.filter(p => p.processing_status === config.status)
        setParts(stationParts)
      } catch (error) {
        console.error('Failed to load parts:', error)
      }
    }

    loadParts()
    
    // Subscribe to real-time changes for parts with this status
    const channel = supabaseClient
      .channel(`operator-${config.status}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parts',
          filter: `processing_status=eq.${config.status}`
        },
        (payload) => {
          console.log('Real-time update for operator station:', payload)
          // Reload parts when changes occur
          loadParts()
        }
      )
      .subscribe()
    
    // Cleanup subscription on unmount
    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [config.status])

  const handleProcessComplete = async (part: Part) => {
    if (!config.processType) return
    
    const updatedPart = completeProcess(part, config.processType)
    
    // Update in database
    await partsApi.update(part.sheet_id, updatedPart)

    // Remove from local view
    setParts(parts.filter(p => p.sheet_id !== part.sheet_id))
    setSelectedPart(null)
    showMessage(`Part ${part.sheet_id} processed successfully`)
  }

  const handleReject = async (part: Part) => {
    const updatedPart = rejectPart(part)
    
    // Update in database
    await partsApi.update(part.sheet_id, updatedPart)

    // Remove from local view
    setParts(parts.filter(p => p.sheet_id !== part.sheet_id))
    setSelectedPart(null)
    showMessage(`Part ${part.sheet_id} sent to recuts`, 'error')
  }

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
    pink: 'bg-pink-600 hover:bg-pink-700'
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow mb-4 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-800">
            OPERATOR STATION: {config.title}
          </h1>
          <div className="text-2xl font-semibold text-gray-600">
            {parts.length} parts waiting
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 mb-4 text-white ${
          message.includes('error') || message.includes('recuts') ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {message}
        </div>
      )}

      {/* Parts List */}
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Part ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dimensions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Material
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {parts.map((part) => (
              <tr
                key={part.sheet_id}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedPart?.sheet_id === part.sheet_id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedPart(part)}
              >
                <td className="px-6 py-4 text-lg font-semibold">
                  {part.sheet_id}
                </td>
                <td className="px-6 py-4">
                  {part.length && part.width ? `${part.length} × ${part.width}` : '-'}
                </td>
                <td className="px-6 py-4">
                  {part.material}
                </td>
                <td className="px-6 py-4">
                  {part.tags || '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleProcessComplete(part)
                      }}
                      className={`px-3 py-1 text-white rounded ${colorClasses[config.color]}`}
                    >
                      {config.nextAction}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReject(part)
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {parts.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-xl">
            No parts currently at this station
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500">
        <p>In production, parts would be scanned with barcode reader</p>
        <p className="mt-2">
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Main Dashboard
          </Link>
        </p>
      </div>
    </div>
  )
}