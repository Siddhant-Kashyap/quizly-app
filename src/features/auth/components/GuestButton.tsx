import React, { useState } from 'react'
import { router } from 'expo-router'
import { Button } from '@/shared/components'
import { useAuth } from '../hooks/useAuth'

export function GuestButton() {
  const { loginAsGuest } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handlePress = async () => {
    setIsLoading(true)
    try {
      await loginAsGuest()
      router.replace('/(tabs)')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="secondary"
      label={isLoading ? 'Signing in…' : 'Continue as Guest'}
      onPress={handlePress}
      disabled={isLoading}
    />
  )
}
