import { useRef, useState } from 'react'
import { View, Pressable, ScrollView, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Zap, Atom, Landmark, Rocket, Cpu, Leaf, Film, Check } from 'lucide-react-native'
import { Text, Button } from '@/shared/components'
import { useOnboardingStore } from '@/features/onboarding/store'
import { ONBOARDING_TOPICS } from '@/shared/lib/mockData'
import { colors, gradients } from '@/shared/theme/colors'

const ICONS: Record<string, typeof Atom> = { Atom, Landmark, Rocket, Cpu, Leaf, Film }
const PAGE_COUNT = 3

function Dots({ active }: { active: number }) {
  return (
    <View className="flex-row justify-center" style={{ gap: 6 }}>
      {Array.from({ length: PAGE_COUNT }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 20 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === active ? colors.cyan : 'rgba(255,255,255,0.2)',
          }}
        />
      ))}
    </View>
  )
}

function GlowBackdrop() {
  return (
    <>
      <View
        className="absolute rounded-full"
        style={{ width: 320, height: 320, top: -80, left: -60, backgroundColor: colors.iris, opacity: 0.18 }}
      />
      <View
        className="absolute rounded-full"
        style={{ width: 320, height: 320, bottom: -100, right: -80, backgroundColor: colors.cyan, opacity: 0.14 }}
      />
    </>
  )
}

export default function Onboarding() {
  const { selectedTopics, toggleTopic, completeOnboarding } = useOnboardingStore()
  const { width } = useWindowDimensions()
  const scrollRef = useRef<ScrollView>(null)
  const [page, setPage] = useState(0)

  const goToPage = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true })
    setPage(index)
  }

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width))
  }

  const handleComplete = () => {
    completeOnboarding()
    router.replace('/(auth)/login')
  }

  return (
    <View className="flex-1 bg-void">
      {page > 0 && (
        <Pressable className="absolute top-16 right-6 z-10" onPress={() => goToPage(PAGE_COUNT - 1)}>
          <Text variant="heading" className="text-white/50">Skip</Text>
        </Pressable>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {/* Page 1 — Splash / brand */}
        <View style={{ width }} className="flex-1 items-center justify-center px-8">
          <GlowBackdrop />
          <LinearGradient
            colors={gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
          >
            <Zap size={40} color={colors.white} fill={colors.white} />
          </LinearGradient>
          <Text variant="display" className="text-cyan mb-2">Factora</Text>
          <Text variant="caption" className="text-white/50" style={{ letterSpacing: 3 }}>
            SCROLL · LEARN · COMPETE
          </Text>
        </View>

        {/* Page 2 — feature intro */}
        <View style={{ width }} className="flex-1 items-center justify-center px-8">
          <GlowBackdrop />
          <View className="items-center mb-10" style={{ width: 200, height: 140 }}>
            <View
              className="absolute rounded-3xl border border-white/10"
              style={{ width: 160, height: 120, top: 16, backgroundColor: colors.surface2, transform: [{ rotate: '-6deg' }] }}
            />
            <View
              className="absolute rounded-3xl items-center justify-center p-4"
              style={{ width: 170, height: 130, top: 4, backgroundColor: colors.surface2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <Atom size={28} color={colors.cyan} />
              <Text variant="heading" className="text-white mt-2">Quantum facts</Text>
              <Text variant="caption" className="text-white/40">32s · Physics</Text>
            </View>
          </View>
          <Text variant="display" className="text-white text-center mb-3">Infinite knowledge,{'\n'}at your thumb</Text>
          <Text variant="body" className="text-white/50 text-center">
            Swipe through bite-sized lessons across science, history, tech and more.
          </Text>
        </View>

        {/* Page 3 — topic picker */}
        <View style={{ width }} className="flex-1 px-6 pt-20">
          <Text variant="display" className="text-white mb-2">Pick your topics</Text>
          <Text variant="body" className="text-white/50 mb-6">Personalize your feed. Pick a few to start.</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {ONBOARDING_TOPICS.map((topic) => {
                const Icon = ICONS[topic.iconUrl]
                const isSelected = selectedTopics.includes(topic.slug)
                return (
                  <Pressable
                    key={topic.slug}
                    onPress={() => toggleTopic(topic.slug)}
                    className="bg-surface2 rounded-2xl p-4 items-center justify-center"
                    style={{
                      width: '47%',
                      aspectRatio: 1,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.cyan : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {isSelected && (
                      <View className="absolute top-2 right-2 bg-cyan rounded-full p-1">
                        <Check size={12} color={colors.void} />
                      </View>
                    )}
                    {Icon && <Icon size={28} color={isSelected ? colors.cyan : colors.white} />}
                    <Text variant="heading" className="text-white mt-3">{topic.label}</Text>
                    <Text variant="caption" className="text-white/40 mt-1">{topic.cardCount} cards</Text>
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <View className="px-8 pb-10 pt-4" style={{ gap: 20 }}>
        <Dots active={page} />
        {page < PAGE_COUNT - 1 ? (
          <Button label="Continue" onPress={() => goToPage(page + 1)} />
        ) : (
          <Button
            label={selectedTopics.length > 0 ? `Continue (${selectedTopics.length} selected)` : 'Select at least one topic'}
            onPress={handleComplete}
            disabled={selectedTopics.length === 0}
          />
        )}
      </View>
    </View>
  )
}
