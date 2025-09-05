'use client'

import { useState, useEffect } from 'react'
import { ChevronUp, ChevronDown, Plus, Trash2, Save } from 'lucide-react'
import { 
  loadProcessConfiguration, 
  saveProcessConfiguration,
  defaultProcessConfig,
  ProcessConfiguration,
  ProcessType
} from '@/lib/workflow-engine'

export default function AdminPanel() {
  const [config, setConfig] = useState<ProcessConfiguration>(defaultProcessConfig)
  const [newRuleTag, setNewRuleTag] = useState('')
  const [newRuleProcesses, setNewRuleProcesses] = useState<ProcessType[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    // Load existing configuration
    const loaded = loadProcessConfiguration()
    setConfig(loaded)
  }, [])

  const moveProcessUp = (index: number) => {
    if (index === 0) return
    const newSequence = [...config.sequence]
    ;[newSequence[index], newSequence[index - 1]] = [newSequence[index - 1], newSequence[index]]
    setConfig({ ...config, sequence: newSequence })
  }

  const moveProcessDown = (index: number) => {
    if (index >= config.sequence.length - 1) return
    const newSequence = [...config.sequence]
    ;[newSequence[index], newSequence[index + 1]] = [newSequence[index + 1], newSequence[index]]
    setConfig({ ...config, sequence: newSequence })
  }

  const addRoutingRule = () => {
    if (!newRuleTag || newRuleProcesses.length === 0) return
    
    setConfig({
      ...config,
      tagRoutingRules: {
        ...config.tagRoutingRules,
        [newRuleTag]: newRuleProcesses
      }
    })
    
    setNewRuleTag('')
    setNewRuleProcesses([])
  }

  const removeRoutingRule = (tag: string) => {
    const { [tag]: removed, ...rest } = config.tagRoutingRules
    setConfig({
      ...config,
      tagRoutingRules: rest
    })
  }

  const handleSave = () => {
    setSaveStatus('saving')
    saveProcessConfiguration(config)
    setTimeout(() => {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
  }

  const handleReset = () => {
    setConfig(defaultProcessConfig)
  }

  const processNames: { [key in ProcessType]: string } = {
    cutting: 'Cutting',
    edge_banding: 'Edge Banding',
    lacquering: 'Lacquering',
    packing: 'Ready to Pack'
  }

  const allProcesses: ProcessType[] = ['cutting', 'edge_banding', 'lacquering', 'packing']

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Panel - Process Configuration</h1>
        <a href="/" className="text-blue-600 hover:text-blue-800">
          ← Back to Dashboard
        </a>
      </div>

      {/* Process Sequence Configuration */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Process Sequence Order</h2>
        <p className="text-gray-600 mb-4">
          Define the order in which processes should be executed
        </p>
        
        <div className="space-y-2">
          {config.sequence.map((process, index) => (
            <div key={process} className="flex items-center gap-2 p-3 bg-gray-50 rounded">
              <span className="font-mono text-sm text-gray-500 w-8">
                {index + 1}.
              </span>
              <span className="flex-1 font-medium">
                {processNames[process]}
              </span>
              <button
                onClick={() => moveProcessUp(index)}
                disabled={index === 0}
                className={`p-1 rounded ${
                  index === 0 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => moveProcessDown(index)}
                disabled={index >= config.sequence.length - 1}
                className={`p-1 rounded ${
                  index >= config.sequence.length - 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tag Routing Rules */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Tag Routing Rules</h2>
        <p className="text-gray-600 mb-4">
          Define which processes parts should go through based on their tags
        </p>

        {/* Existing Rules */}
        <div className="space-y-2 mb-4">
          {Object.entries(config.tagRoutingRules).map(([tag, processes]) => (
            <div key={tag} className="flex items-center gap-2 p-3 bg-gray-50 rounded">
              <span className="font-medium w-48">
                {tag === 'none' ? 'No Tags' : tag}
              </span>
              <span className="flex-1 text-gray-600">
                → {processes.map(p => processNames[p]).join(' → ')}
              </span>
              {tag !== 'none' && (
                <button
                  onClick={() => removeRoutingRule(tag)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add New Rule */}
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Add New Routing Rule</h3>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newRuleTag}
              onChange={(e) => setNewRuleTag(e.target.value)}
              placeholder="Tag combination (e.g., Banding,Lacquered)"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 mb-2">
            {allProcesses.filter(p => p !== 'cutting').map((process) => (
              <label key={process} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newRuleProcesses.includes(process)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setNewRuleProcesses([...newRuleProcesses, process])
                    } else {
                      setNewRuleProcesses(newRuleProcesses.filter(p => p !== process))
                    }
                  }}
                  className="w-4 h-4"
                />
                <span>{processNames[process]}</span>
              </label>
            ))}
          </div>

          <button
            onClick={addRoutingRule}
            disabled={!newRuleTag || newRuleProcesses.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Reset to Default
        </button>
        
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Save className="w-4 h-4" />
          {saveStatus === 'saving' ? 'Saving...' : 
           saveStatus === 'saved' ? 'Saved!' : 'Save Configuration'}
        </button>
      </div>

      {/* Current Configuration Display */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-medium mb-2">Current Configuration (JSON)</h3>
        <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    </div>
  )
}