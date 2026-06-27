import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ══════════════════════════════════════════════════════════════════════════════
// HOISTED MOCKS — Must run before any module imports
// ══════════════════════════════════════════════════════════════════════════════

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  PUBLIC_FIREBASE_API_KEY: 'test-firebase-key',
  PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
  PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
  PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-bucket',
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456',
  PUBLIC_FIREBASE_APP_ID: '1:123456:web:abc',
  PUBLIC_FIREBASE_MEASUREMENT_ID: 'G-TEST',
  PUBLIC_FIREBASE_VAPID_KEY: 'test-vapid-key',
}))

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
}))

vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    PUBLIC_FIREBASE_VAPID_KEY: 'test-vapid-key',
  },
}))

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
}))

vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn((fn) => {
      fn({ url: { pathname: '/', searchParams: new Map() } })
      return () => {}
    }),
  },
  navigating: { subscribe: vi.fn((fn) => { fn(null); return () => {} }) },
  updated: { subscribe: vi.fn((fn) => { fn(false); return () => {} }) },
}))

vi.mock('$app/environment', () => ({
  browser: true,
  dev: true,
}))

// ── Supabase mock helper ────────────────────────────────────────────────────
// Creates a chainable mock that resolves with the given value
function createSupabaseMock(defaultResult: any = { data: null, error: null }) {
  const chain: any = {}

  // All chainable methods return the chain itself
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'in', 'or', 'not', 'contains', 'filter',
    'order', 'limit', 'range', 'offset',
    'is', 'like', 'ilike', 'match', 'textSearch',
  ]
  for (const method of chainMethods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }

  // Terminal methods that resolve
  chain.single = vi.fn().mockResolvedValue(defaultResult)
  chain.maybeSingle = vi.fn().mockResolvedValue(defaultResult)

  // Make the chain itself thenable (so `await supabase.from(...).select()...` works)
  const thenable = Promise.resolve(defaultResult)
  Object.assign(chain, thenable)

  return chain
}

// Global mock state — tests can set this before calling the service
let _mockResult: any = { data: null, error: null }
let _mockResults: any[] = []
let _mockResultIndex = 0

export function setMockResult(result: any) {
  _mockResult = result
  _mockResults = []
  _mockResultIndex = 0
}

export function setMockResults(results: any[]) {
  _mockResults = [...results]
  _mockResultIndex = 0
}

export function getMockResult() {
  if (_mockResults.length > 0) {
    return _mockResults[_mockResultIndex++] ?? _mockResults[_mockResults.length - 1]
  }
  return _mockResult
}

const mockSupabaseClient: any = {
  from: vi.fn((_table: string) => createSupabaseMock(getMockResult())),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }),
  removeChannel: vi.fn(),
  getChannels: vi.fn().mockReturnValue([]),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.url/file.jpg' } }),
    }),
  },
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    admin: {
      createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-uuid' } }, error: null }),
      deleteUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUserById: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  },
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}

vi.mock('$lib/supabase', () => ({
  supabase: mockSupabaseClient,
}))

// ── Firebase ────────────────────────────────────────────────────────────────
vi.mock('$lib/firebase', () => ({
  analytics: Promise.resolve(null),
  messaging: Promise.resolve(null),
  default: {},
}))

// ── NotificationService ────────────────────────────────────────────────────
vi.mock('$lib/services/notificationService', () => ({
  notificationService: {
    send: vi.fn().mockResolvedValue(true),
    sendBulk: vi.fn().mockResolvedValue(true),
    getNotifications: vi.fn().mockResolvedValue({ data: [], error: null }),
    markAsRead: vi.fn().mockResolvedValue({ data: null, error: null }),
    markAsUnread: vi.fn().mockResolvedValue({ data: null, error: null }),
    markAllAsRead: vi.fn().mockResolvedValue({ data: null, error: null }),
    deleteAll: vi.fn().mockResolvedValue({ data: null, error: null }),
    deleteNotification: vi.fn().mockResolvedValue({ data: null, error: null }),
    getUnreadCount: vi.fn().mockResolvedValue({ count: 0, error: null }),
    subscribeRealtime: vi.fn().mockReturnValue(() => {}),
    requestPermissionAndGetToken: vi.fn().mockResolvedValue(null),
    saveTokenToSupabase: vi.fn().mockResolvedValue(undefined),
  },
}))

// ── Window globals ─────────────────────────────────────────────────────────
Object.defineProperty(window, 'location', {
  value: {
    assign: vi.fn(),
    href: 'http://localhost:5173/',
    origin: 'http://localhost:5173',
    pathname: '/',
    searchParams: new URLSearchParams(),
  },
  writable: true,
})

Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
})

const localStorageStore: Record<string, string> = {}
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageStore[key] || null),
    setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
    removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
    clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]) }),
    get length() { return Object.keys(localStorageStore).length },
    key: vi.fn((i: number) => Object.keys(localStorageStore)[i] || null),
  },
  writable: true,
})

Object.defineProperty(window.navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
  writable: true,
})

Object.defineProperty(window.navigator, 'serviceWorker', {
  value: {
    register: vi.fn().mockResolvedValue({ scope: '/' }),
    ready: Promise.resolve({}),
  },
  writable: true,
})

Object.defineProperty(window, 'Notification', {
  value: class MockNotification {
    static permission = 'default'
    static requestPermission = vi.fn().mockResolvedValue('granted')
    constructor(public title: string, public options?: NotificationOptions) {}
    close = vi.fn()
  },
  writable: true,
})

window.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  ondataavailable: null,
  onstop: null,
  state: 'inactive',
})) as unknown as typeof MediaRecorder

Object.defineProperty(window, 'AudioContext', {
  value: vi.fn().mockImplementation(() => ({
    createAnalyser: vi.fn().mockReturnValue({
      fftSize: 256,
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn(),
      connect: vi.fn(),
    }),
    createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
    close: vi.fn(),
  })),
  writable: true,
})

Object.defineProperty(window, 'webkitAudioContext', {
  value: window.AudioContext,
  writable: true,
})

vi.mock('canvas-confetti', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('svelte-french-toast', () => ({
  default: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
    loading: vi.fn(),
  },
  Toaster: vi.fn(),
}))

// ── Reset mocks between tests ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  setMockResult({ data: null, error: null })
})
