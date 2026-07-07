// Onboarding's topic picker runs before login, but GET /topics requires a
// JWT — there's no authenticated way to fetch real topics at that point in
// the flow. This static list mirrors the backend seed data (see
// service/docs/API.md §1) purely so onboarding has something to show;
// everywhere else in the app fetches topics from the real API.
export const ONBOARDING_TOPICS = [
  { slug: 'science', label: 'Science', iconUrl: 'Atom', cardCount: 42 },
  { slug: 'history', label: 'History', iconUrl: 'Landmark', cardCount: 35 },
  { slug: 'space', label: 'Space', iconUrl: 'Rocket', cardCount: 28 },
  { slug: 'tech', label: 'Tech', iconUrl: 'Cpu', cardCount: 31 },
  { slug: 'nature', label: 'Nature', iconUrl: 'Leaf', cardCount: 24 },
  { slug: 'pop-culture', label: 'Pop Culture', iconUrl: 'Film', cardCount: 19 },
]
