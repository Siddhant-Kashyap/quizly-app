import { View, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Bell } from 'lucide-react-native'
import { Text, Avatar, Button, Skeleton } from '@/shared/components'
import { StatsGrid } from '@/features/profile/components/StatsGrid'
import { StreakCalendar } from '@/features/profile/components/StreakCalendar'
import { BadgeRow } from '@/features/profile/components/BadgeRow'
import { useProfile } from '@/features/profile/hooks/useProfile'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { colors, gradients } from '@/shared/theme/colors'

const XP_PER_LEVEL = 500
const TOTAL_BADGES = 24

function levelTitle(level: number) {
  if (level >= 21) return 'Quantum Scholar'
  if (level >= 11) return 'Trivia Adept'
  if (level >= 6) return 'Quiz Explorer'
  return 'Curious Mind'
}

export default function Profile() {
  const { profile, isLoading } = useProfile()
  const { user, isGuest, logout } = useAuth()

  const displayName = user?.username ?? (isGuest ? 'Guest Explorer' : 'Player')

  const handleLogout = () => {
    logout()
    router.replace('/(auth)/login')
  }

  if (isLoading || !profile) {
    return (
      <View className="flex-1 bg-void px-6 pt-16" style={{ gap: 16 }}>
        <Skeleton height={72} width={72} className="rounded-full" />
        <Skeleton height={24} width="50%" />
        <Skeleton height={100} />
        <Skeleton height={140} />
      </View>
    )
  }

  const xpIntoLevel = profile.xp % XP_PER_LEVEL
  const xpTarget = (profile.level + 1) * XP_PER_LEVEL
  const xpProgress = xpIntoLevel / XP_PER_LEVEL

  return (
    <ScrollView className="flex-1 bg-void" contentContainerStyle={{ padding: 24, paddingTop: 56, gap: 20 }}>
      <Pressable onPress={() => router.push('/notifications')} className="self-end">
        <Bell size={22} color={colors.white} />
      </Pressable>

      <View className="items-center">
        <View>
          <LinearGradient
            colors={gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ width: 80, height: 80, borderRadius: 40 }} className="bg-void items-center justify-center">
              <Avatar name={displayName} size={72} />
            </View>
          </LinearGradient>
          <View
            className="absolute bottom-0 right-0 bg-gold rounded-full items-center justify-center"
            style={{ width: 28, height: 28, borderWidth: 2, borderColor: colors.void }}
          >
            <Text variant="caption" className="text-void font-bold">{profile.level}</Text>
          </View>
        </View>

        <Text variant="title" className="text-white mt-3">{displayName}</Text>
        <Text variant="caption" className="text-cyan mt-1">{levelTitle(profile.level)}</Text>

        <View className="w-full mt-4">
          <View className="flex-row justify-between mb-1">
            <Text variant="caption" className="text-white/50">Level {profile.level}</Text>
            <Text variant="caption" className="text-white/50">{profile.xp.toLocaleString()} / {xpTarget.toLocaleString()} XP</Text>
          </View>
          <View className="h-2 bg-surface2 rounded-full overflow-hidden">
            <LinearGradient
              colors={gradients.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: '100%', width: `${xpProgress * 100}%`, borderRadius: 999 }}
            />
          </View>
        </View>
      </View>

      <StreakCalendar weeklyActivity={profile.weeklyActivity} streakDays={profile.streakDays} />

      <StatsGrid profile={profile} />

      <BadgeRow badges={profile.badges} total={TOTAL_BADGES} />

      <Button label="Log out" variant="ghost" onPress={handleLogout} />
    </ScrollView>
  )
}
