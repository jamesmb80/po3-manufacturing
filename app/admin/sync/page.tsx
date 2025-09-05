'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Loader2, Database, RefreshCw, Trash2, Search } from 'lucide-react'

interface SyncResult {
  success: boolean
  message: string
  details?: {
    recordsImported: number
    recordsUpdated: number
    recordsFailed: number
    duration: string
    discoveries?: {
      materials?: string[]
      types?: string[]
      thicknesses?: string[]
    }
    errors?: string[]
  }
}

interface AnalysisResult {
  success: boolean
  data?: {
    totalParts: number
    materials: string[]
    types: string[]
    thicknesses: string[]
    dateRange?: {
      min: string
      max: string
    }
  }
}

export default function DataSyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown')
  const [syncLimit, setSyncLimit] = useState(500)
  const [clearBeforeSync, setClearBeforeSync] = useState(false)
  const router = useRouter()

  // Test MySQL connection
  const testConnection = async () => {
    setTesting(true)
    try {
      const response = await fetch('/api/sync?action=test')
      const data = await response.json()
      setConnectionStatus(data.success ? 'connected' : 'failed')
    } catch (error) {
      console.error('Connection test failed:', error)
      setConnectionStatus('failed')
    } finally {
      setTesting(false)
    }
  }

  // Analyze current data
  const analyzeData = async () => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/sync?action=analyze')
      const data: AnalysisResult = await response.json()
      setAnalysisResult(data)
    } catch (error) {
      console.error('Analysis failed:', error)
      setAnalysisResult({ success: false })
    } finally {
      setAnalyzing(false)
    }
  }

  // Clear all data
  const clearData = async () => {
    if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
      return
    }
    
    setClearing(true)
    setSyncResult(null)
    try {
      const response = await fetch('/api/sync', {
        method: 'DELETE',
      })
      const data = await response.json()
      setSyncResult({
        success: data.success,
        message: data.message || 'Data cleared'
      })
      // Refresh analysis after clearing
      if (data.success) {
        await analyzeData()
      }
    } catch (error) {
      console.error('Clear failed:', error)
      setSyncResult({
        success: false,
        message: 'Failed to clear data'
      })
    } finally {
      setClearing(false)
    }
  }

  // Sync data from MySQL
  const syncData = async () => {
    setSyncing(true)
    setSyncResult(null)
    
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clearExisting: clearBeforeSync,
          limit: syncLimit,
          batchSize: 100
        }),
      })
      
      const data: SyncResult = await response.json()
      setSyncResult(data)
      
      // Refresh analysis after successful sync
      if (data.success) {
        await analyzeData()
      }
    } catch (error) {
      console.error('Sync failed:', error)
      setSyncResult({
        success: false,
        message: 'Sync failed - check console for details'
      })
    } finally {
      setSyncing(false)
    }
  }

  // Initialize - test connection and analyze on mount
  useState(() => {
    testConnection()
    analyzeData()
  })

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Data Sync Admin</h1>
        <p className="text-gray-600">
          Sync production data from MySQL (Magento) to Supabase
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">MySQL Connection</h2>
          <button
            onClick={testConnection}
            disabled={testing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Test Connection
              </>
            )}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'failed' ? 'bg-red-500' : 
            'bg-gray-400'
          }`} />
          <span className="text-sm">
            {connectionStatus === 'connected' ? 'Connected to MySQL database' :
             connectionStatus === 'failed' ? 'Failed to connect to MySQL' :
             'Connection status unknown'}
          </span>
        </div>
      </div>

      {/* Current Data Analysis */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Current Data</h2>
          <button
            onClick={analyzeData}
            disabled={analyzing}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Analyze
              </>
            )}
          </button>
        </div>

        {analysisResult?.data && (
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Total Parts:</span> {analysisResult.data.totalParts || 0}
            </div>
            
            {analysisResult.data.materials && analysisResult.data.materials.length > 0 && (
              <div>
                <span className="font-medium">Materials Found:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {analysisResult.data.materials.map(material => (
                    <span key={material} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {material}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {analysisResult.data.types && analysisResult.data.types.length > 0 && (
              <div>
                <span className="font-medium">Types:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {analysisResult.data.types.map(type => (
                    <span key={type} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {analysisResult.data.thicknesses && analysisResult.data.thicknesses.length > 0 && (
              <div>
                <span className="font-medium">Thicknesses:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {analysisResult.data.thicknesses.map(thickness => (
                    <span key={thickness} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                      {thickness}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {(!analysisResult.data.materials || analysisResult.data.materials.length === 0) && (
              <div className="text-orange-600 bg-orange-50 p-3 rounded">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                No data found in database. Run sync to import production data.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sync Controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Sync Production Data</h2>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Number of Records to Sync
            </label>
            <select
              value={syncLimit}
              onChange={(e) => setSyncLimit(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              disabled={syncing}
            >
              <option value={50}>50 records (test)</option>
              <option value={100}>100 records</option>
              <option value={500}>500 records</option>
              <option value={1000}>1,000 records</option>
              <option value={2000}>2,000 records</option>
              <option value={5000}>5,000 records (full sync)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Start with a smaller number to test, then sync more records
            </p>
          </div>
          
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={clearBeforeSync}
                onChange={(e) => setClearBeforeSync(e.target.checked)}
                disabled={syncing}
              />
              <span className="text-sm">Clear existing data before sync</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Check this to replace all existing data with fresh data from MySQL
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={syncData}
            disabled={syncing || connectionStatus !== 'connected'}
            className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {syncing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Syncing Data...
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                Start Sync
              </>
            )}
          </button>
          
          <button
            onClick={clearData}
            disabled={clearing || syncing}
            className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {clearing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5" />
                Clear All Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sync Results */}
      {syncResult && (
        <div className={`rounded-lg shadow p-6 ${
          syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {syncResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            
            <div className="flex-1">
              <h3 className={`font-semibold mb-2 ${
                syncResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {syncResult.message}
              </h3>
              
              {syncResult.details && (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Records Imported:</span> {syncResult.details.recordsImported}
                  </div>
                  <div>
                    <span className="font-medium">Records Updated:</span> {syncResult.details.recordsUpdated}
                  </div>
                  {syncResult.details.recordsFailed > 0 && (
                    <div>
                      <span className="font-medium">Records Failed:</span> {syncResult.details.recordsFailed}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Duration:</span> {syncResult.details.duration}
                  </div>
                  
                  {syncResult.details.discoveries && (
                    <div className="mt-3 pt-3 border-t">
                      <h4 className="font-medium mb-2">Materials Discovered:</h4>
                      {syncResult.details.discoveries.materials && syncResult.details.discoveries.materials.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs text-gray-600">Materials:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {syncResult.details.discoveries.materials.map(m => (
                              <span key={m} className="px-2 py-1 bg-white rounded text-xs">
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {syncResult.details.errors && syncResult.details.errors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                      <ul className="space-y-1">
                        {syncResult.details.errors.map((error, idx) => (
                          <li key={idx} className="text-xs text-red-700">
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {syncResult.success && (
                <button
                  onClick={() => router.push('/')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  View Parts →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
        <h3 className="font-semibold text-blue-900 mb-2">How to Use</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li>1. Test the MySQL connection first</li>
          <li>2. Choose the number of records to sync (start small for testing)</li>
          <li>3. Optionally enable &quot;Clear existing data&quot; for a fresh start</li>
          <li>4. Click &quot;Start Sync&quot; to import data from MySQL</li>
          <li>5. After sync completes, click &quot;View Parts&quot; to see the imported data</li>
        </ol>
        <p className="mt-3 text-xs text-blue-700">
          <strong>Note:</strong> The sync pulls data from the Magento production database. 
          Materials like acrylic, MFC, and others will appear after syncing.
        </p>
      </div>
    </div>
  )
}