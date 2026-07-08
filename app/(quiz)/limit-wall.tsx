import { useLocalSearchParams } from 'expo-router'
import { GuestLimitWall } from '@/features/auth/components/GuestLimitWall'

export default function LimitWallScreen() {
  const { feature } = useLocalSearchParams<{ feature: 'solo' | 'pvp' }>()
  return <GuestLimitWall feature={feature ?? 'solo'} />
}
