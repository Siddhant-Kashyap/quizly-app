import { Tabs } from 'expo-router'
import { Home, Compass, Zap, Bell, User } from 'lucide-react-native'
import { colors } from '@/shared/theme/colors'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface1, borderTopColor: colors.surface2 },
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.muted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ color }) => <Home color={color} size={22} /> }} />
      <Tabs.Screen name="explore" options={{ tabBarIcon: ({ color }) => <Compass color={color} size={22} /> }} />
      <Tabs.Screen name="quiz" options={{ tabBarIcon: ({ color }) => <Zap color={color} size={22} /> }} />
      <Tabs.Screen name="notifications" options={{ tabBarIcon: ({ color }) => <Bell color={color} size={22} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ color }) => <User color={color} size={22} /> }} />
    </Tabs>
  )
}
