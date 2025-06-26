'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface FilterOptions {
  categories: string[]
  sources: string[]
  frequencies: string[]
}

interface FilterState {
  categories: string[]
  sources: string[]
  frequencies: string[]
  showFavoritesOnly: boolean
}

interface FilterPanelProps {
  onFiltersChange: (filters: FilterState) => void
  isOpen: boolean
  onClose: () => void
}

export default function FilterPanel({ onFiltersChange, isOpen, onClose }: FilterPanelProps) {
  const { data: session } = useSession()
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [],
    sources: [],
    frequencies: []
  })
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    sources: [],
    frequencies: [],
    showFavoritesOnly: false
  })
  const [loading, setLoading] = useState(true)

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions()
    if (session?.user) {
      fetchUserFilters()
    }
  }, [session])

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/user-preferences/filter-options')
      const data = await response.json()
      if (data.success) {
        setFilterOptions(data.data)
      }
    } catch (error) {
      console.error('Error fetching filter options:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserFilters = async () => {
    try {
      const response = await fetch('/api/user-preferences/filters')
      const data = await response.json()
      if (data.success) {
        setFilters(data.data)
        onFiltersChange(data.data)
      }
    } catch (error) {
      console.error('Error fetching user filters:', error)
    }
  }

  const updateFilters = async (newFilters: FilterState) => {
    setFilters(newFilters)
    onFiltersChange(newFilters)

    if (session?.user) {
      try {
        await fetch('/api/user-preferences/filters', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newFilters)
        })
      } catch (error) {
        console.error('Error saving filters:', error)
      }
    }
  }

  const handleCheckboxChange = (
    filterType: keyof Omit<FilterState, 'showFavoritesOnly'>,
    value: string,
    checked: boolean
  ) => {
    const newFilters = { ...filters }
    if (checked) {
      newFilters[filterType] = [...newFilters[filterType], value]
    } else {
      newFilters[filterType] = newFilters[filterType].filter(item => item !== value)
    }
    updateFilters(newFilters)
  }

  const handleFavoritesToggle = (checked: boolean) => {
    updateFilters({ ...filters, showFavoritesOnly: checked })
  }

  const clearAllFilters = () => {
    const clearedFilters = {
      categories: [],
      sources: [],
      frequencies: [],
      showFavoritesOnly: false
    }
    updateFilters(clearedFilters)
  }

  const hasActiveFilters = filters.categories.length > 0 || 
                          filters.sources.length > 0 || 
                          filters.frequencies.length > 0 || 
                          filters.showFavoritesOnly

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
        onClick={onClose}
      />
      
      {/* Filter Panel */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-80 bg-white shadow-xl lg:shadow-none
        transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        transition-transform duration-300 ease-in-out
        overflow-y-auto
      `}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onClose}
                className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading filters...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Favorites Only */}
              {session?.user && (
                <div className="border-b border-gray-200 pb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.showFavoritesOnly}
                      onChange={(e) => handleFavoritesToggle(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900 flex items-center">
                      <svg className="w-4 h-4 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Favorites Only
                    </span>
                  </label>
                </div>
              )}

              {/* Categories */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {filterOptions.categories.map(category => (
                    <label key={category} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category)}
                        onChange={(e) => handleCheckboxChange('categories', category, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sources */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Data Sources</h3>
                <div className="space-y-2">
                  {filterOptions.sources.map(source => (
                    <label key={source} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.sources.includes(source)}
                        onChange={(e) => handleCheckboxChange('sources', source, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{source}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Frequencies */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Update Frequency</h3>
                <div className="space-y-2">
                  {filterOptions.frequencies.map(frequency => (
                    <label key={frequency} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.frequencies.includes(frequency)}
                        onChange={(e) => handleCheckboxChange('frequencies', frequency, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{frequency}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}