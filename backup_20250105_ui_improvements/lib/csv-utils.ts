import { Part } from '@/app/page'

/**
 * Convert an array of parts to CSV format
 * @param parts - Array of parts to export
 * @param machineName - Name of the machine for the filename
 * @returns void - triggers a download
 */
export function exportPartsToCSV(parts: Part[], machineName: string) {
  // Define the columns we want to export
  const headers = [
    'Part ID',
    'Order ID',
    'Cutting Date',
    'Customer',
    'Material',
    'Type',
    'Thickness',
    'Length',
    'Width',
    'Height',
    'Depth',
    'Diameter',
    'Shape',
    'Tags',
    'Notes',
    'Status'
  ]

  // Create CSV content
  const csvContent = [
    // Headers row
    headers.join(','),
    // Data rows
    ...parts.map(part => [
      part.sheet_id,
      part.increment_id,
      `"${part.cutting_date}"`,
      `"${part.shipping_name}"`,
      `"${part.material}"`,
      part.type ? `"${part.type}"` : '""',
      part.thickness,
      part.length || '',
      part.width || '',
      part.height || '',
      part.depth || '',
      part.diameter || '',
      `"${part.shape}"`,
      `"${part.tags}"`,
      part.notes ? `"${part.notes}"` : '""',
      `"${part.order_status}"`
    ].join(','))
  ].join('\n')

  // Create a blob from the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  
  // Create a download link
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const filename = `cutting_${machineName}_${timestamp}.csv`
  
  // Set link attributes and trigger download
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  // Add to DOM, click, and remove
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up the URL object
  URL.revokeObjectURL(url)
}

/**
 * Helper function to format date for CSV
 * @param dateStr - Date string in "DD Mon YYYY" format
 * @returns ISO date string or original string if parsing fails
 */
export function formatDateForCSV(dateStr: string): string {
  const months: { [key: string]: number } = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  }
  
  const parts = dateStr.split(' ')
  if (parts.length === 3) {
    const day = parseInt(parts[0])
    const month = months[parts[1]]
    const year = parseInt(parts[2])
    
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      const date = new Date(year, month, day)
      return date.toISOString().split('T')[0] // Returns YYYY-MM-DD format
    }
  }
  
  return dateStr // Return original if parsing fails
}