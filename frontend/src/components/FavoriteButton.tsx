'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface FavoriteButtonProps {
  indicatorId: string
  isFavorite: boolean
  onToggle?: (isFavorite: boolean) => void
  size?: 'sm' | 'md' | 'lg'
}

export default function FavoriteButton({ 
  indicatorId, 
  isFavorite, 
  onToggle,
  size = 'md' 
}: FavoriteButtonProps) {
  const { data: session } = useSession()
  const [isToggling, setIsToggling] = useState(false)
  const [localIsFavorite, setLocalIsFavorite] = useState(isFavorite)

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const handleToggle = async () => {
    if (!session?.user || isToggling) return

    setIsToggling(true)
    
    try {
      const response = await fetch(`/api/user-preferences/favorites/${indicatorId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setLocalIsFavorite(data.data.isFavorite)
        onToggle?.(data.data.isFavorite)
      } else {
        console.error('Failed to toggle favorite:', data.message)
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setIsToggling(false)
    }
  }

  // Don't render for unauthenticated users
  if (!session?.user) {
    return null
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`
        transition-all duration-200 ease-in-out
        ${isToggling ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
        ${localIsFavorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}
      `}
      title={localIsFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg 
        className={`${sizeClasses[size]} transition-colors duration-200`}
        fill={localIsFavorite ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={localIsFavorite ? 0 : 2}
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
        />
      </svg>
    </button>
  )
}