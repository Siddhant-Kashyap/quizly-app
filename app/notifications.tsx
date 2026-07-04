import { useEffect, useState } from 'react'
import { View, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, Trophy, Flame, Swords, Bell } from 'lucide-react-native'
import { Text, Card, Skeleton } from '@/shared/components'
import { colors } from '@/shared/theme/colors'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'
import { MockNotification } from '@/shared/lib/mockData'

const ICONS: Record<MockNotification['type'], typeof Bell> = {
  badge: Trophy,
  streak: Flame,
  challenge: Swords,
  system: Bell,
}

const ICON_COLOR: Record<MockNotification['type'], string> = {
  badge: colors.gold,
  streak: colors.ember,
  challenge: colors.fuchsia,
  system: colors.cyan,
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString()
}

export default function Notifications() {
  const { notifications, isLoading } = useNotifications()
  const [items, setItems] = useState<MockNotification[]>([])

  useEffect(() => setItems(notifications), [notifications])

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))

  return (
    <View className="flex-1 bg-void px-6 pt-16">
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Pressable onPress={() => router.back()}>
            <ChevronLeft size={22} color={colors.white} />
          </Pressable>
          <Text variant="display" className="text-white">Notifications</Text>
        </View>
        <Pressable onPress={markAllRead}>
          <Text variant="heading" className="text-cyan">Mark all</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ gap: 12 }}>
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {items.map((n) => {
            const Icon = ICONS[n.type]
            return (
              <Card key={n.id} className="flex-row p-4" style={{ gap: 12, opacity: n.isRead ? 0.6 : 1 }}>
                <View
                  className="items-center justify-center rounded-full"
                  style={{ width: 40, height: 40, backgroundColor: `${ICON_COLOR[n.type]}22` }}
                >
                  <Icon size={18} color={ICON_COLOR[n.type]} />
                </View>
                <View className="flex-1">
                  <Text variant="heading" className="text-white">{n.title}</Text>
                  <Text variant="body" className="text-white/50 mt-1">{n.body}</Text>
                  <Text variant="caption" className="text-white/30 mt-2">{timeAgo(n.createdAt)}</Text>
                </View>
                {!n.isRead && <View className="w-2 h-2 rounded-full bg-cyan mt-1" />}
              </Card>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
