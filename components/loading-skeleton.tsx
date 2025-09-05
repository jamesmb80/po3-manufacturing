export function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-12 bg-gray-200 rounded mb-4"></div>
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="h-10 bg-gray-200 rounded w-1/12"></div>
            <div className="h-10 bg-gray-200 rounded w-2/12"></div>
            <div className="h-10 bg-gray-200 rounded w-2/12"></div>
            <div className="h-10 bg-gray-200 rounded w-3/12"></div>
            <div className="h-10 bg-gray-200 rounded w-2/12"></div>
            <div className="h-10 bg-gray-200 rounded w-2/12"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TabLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
        <LoadingSkeleton />
      </div>
    </div>
  )
}

export function PageLoadingSkeleton() {
  return (
    <div className="p-8">
      <div className="animate-pulse space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="flex space-x-2">
            <div className="h-10 bg-gray-200 rounded w-32"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        
        {/* Tabs skeleton */}
        <div className="h-12 bg-gray-200 rounded"></div>
        
        {/* Table skeleton */}
        <LoadingSkeleton />
      </div>
    </div>
  )
}