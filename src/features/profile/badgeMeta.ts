// The backend sends a raw `badgeType` string with no display name or icon
// (BadgeDto only has id/badgeType/earnedAt — see service/docs/API.md §5).
// Badge-awarding itself isn't implemented server-side yet (TODO in
// QuizService.saveP2PResult), so there's no canonical badgeType list to
// match against. This lookup covers the types the mock data anticipated;
// anything unrecognized falls back to a humanized version of the raw string.
export const BADGE_META: Record<string, { label: string; icon: string }> = {
  first_win: { label: 'First Steps', icon: 'Footprints' },
  streak_7: { label: '7-Day Streak', icon: 'Flame' },
  quiz_master: { label: 'Quiz Master', icon: 'Trophy' },
  night_owl: { label: 'Night Owl', icon: 'Moon' },
}

export function badgeMeta(badgeType: string): { label: string; icon: string } {
  if (!badgeType) return { label: 'Badge', icon: 'Award' }
  return BADGE_META[badgeType] ?? {
    label: badgeType
      .split(/[_-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    icon: 'Award',
  }
}
