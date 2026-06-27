# 🧪 Testing Guide — Workspace Khwarizmi

## Struktur Testing

```
tests/
├── unit/                         # Unit tests (Vitest)
│   ├── setup.ts                  # Global test setup & mocks
│   ├── services/
│   │   ├── locationService.test.ts    # GPS & haversine tests
│   │   ├── attendanceService.test.ts  # Clock-in/out, izin, auto-checkout
│   │   ├── taskService.test.ts        # CRUD tugas, assignment, comments
│   │   ├── notificationService.test.ts # Notifikasi + FCM
│   │   ├── authService.test.ts        # Auth & profil
│   │   ├── chatService.test.ts        # Chat realtime, media, polling
│   │   └── adminService.test.ts       # Admin-only operasi
│   └── stores/
│       ├── notificationStore.test.ts  # Unread count store
│       └── chatReadStore.test.ts      # Read room IDs store
├── e2e/                          # E2E tests (Playwright)
│   ├── auth.spec.ts              # Login, register, forgot password, reset
│   ├── dashboard.spec.ts         # Dashboard, navigasi, ringkasan
│   ├── tasks.spec.ts             # CRUD tugas, filter, view
│   ├── chat.spec.ts              # Chat rooms, messages, realtime
│   ├── profile.spec.ts           # Profil, edit, logout
│   └── notifications.spec.ts     # Notifikasi, read, delete
└── fixtures/
    └── test-data.ts              # Mock data untuk semua test
```

## Unit Tests

### Menjalankan Unit Tests

```bash
# Run semua unit tests
npm run test:unit

# Run dengan watch mode
npm run test:unit:watch

# Run dengan coverage report
npm run test:unit:coverage
```

### Unit Test Coverage

| Service | Tests | Coverage Area |
|---|---|---|
| `locationService` | 15+ | haversine, radius check, GPS position |
| `attendanceService` | 12+ | upload, check-in/out, leave, auto-checkout |
| `taskService` | 18+ | CRUD, assignments, comments, bulk ops |
| `notificationService` | 14+ | send, bulk, mark read, FCM, realtime |
| `authService` | 15+ | session, profile, upload avatar, password |
| `chatService` | 20+ | rooms, messages, media, polling, typing |
| `adminService` | 18+ | users, holidays, settings, deletion |
| `notificationStore` | 5+ | count, increment, decrement |
| `chatReadStore` | 4+ | mark read, clear |

### Mock Strategy

- **Supabase client**: Fully mocked dengan chainable methods
- **Firebase**: Mocked as null (browser APIs)
- **window.location**: Mocked with writable properties
- **localStorage**: In-memory implementation
- **navigator.geolocation**: Mocked with success/error callbacks
- **Notification API**: Mocked with permission states
- **MediaRecorder**: Mocked for voice note tests

## E2E Tests (Playwright)

### Menjalankan E2E Tests

```bash
# Run semua E2E tests
npm run test:e2e

# Run dengan UI mode (interactive)
npm run test:e2e:ui

# Run dengan browser visible (headed)
npm run test:e2e:headed

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run di specific browser
npx playwright test --project=chromium
```

### Browser Support

| Project | Browser | Viewport |
|---|---|---|
| chromium | Desktop Chrome | 1280x720 |
| firefox | Desktop Firefox | 1280x720 |
| webkit | Desktop Safari | 1280x720 |
| mobile-chrome | Pixel 5 | 393x851 |
| mobile-safari | iPhone 13 | 390x844 |

### E2E Test Coverage

| Spec | Tests | Coverage Area |
|---|---|---|
| `auth.spec.ts` | 15+ | Login, register, forgot password, reset, auth guard |
| `dashboard.spec.ts` | 12+ | Header, greeting, stats, nav, date |
| `tasks.spec.ts` | 14+ | List, filter, search, create, detail |
| `chat.spec.ts` | 12+ | Room list, room view, messages, navigation |
| `profile.spec.ts` | 14+ | View, edit, password, email, logout, nav |
| `notifications.spec.ts` | 12+ | List, search, read, delete, clear all |

### Environment Variables untuk E2E

```bash
# .env.test
TEST_USER_EMAIL=user@khwarizmi.test
TEST_USER_PASSWORD=testpassword123
TEST_ADMIN_EMAIL=admin@khwarizmi.test
TEST_ADMIN_PASSWORD=adminpassword123
```

### Test Data

Semua mock data tersedia di `tests/fixtures/test-data.ts`:

- `mockUsers` — Admin, user biasa, user kedua
- `mockTasks` — Berbagai status (not_started, in_progress, review, done, overdue)
- `mockAssignments` — Berbagai status (accepted, pending, completed, rejected)
- `mockAttendance` — Check-in, late, complete
- `mockLeaves` — Pending, approved, rejected
- `mockNotifications` — Berbagai tipe notifikasi
- `mockChatRooms` — Direct & group
- `mockChatMessages` — Text, reply, image, poll
- `mockHolidays` — Hari libur
- `mockSpecialRules` — Custom time, WFA
- `mockAppSettings` — Pengaturan kantor
- `mockTaskComments` — General, problem, reply
- `mockTaskAttachments` — File, image

## Menjalankan Semua Tests

```bash
# Unit + E2E
npm test

# Hanya unit
npm run test:unit

# Hanya E2E
npm run test:e2e
```

## Coverage Report

```bash
# Generate coverage report
npm run test:unit:coverage

# Lihat HTML report
open coverage/index.html
```

## Best Practices

1. **Unit Tests**: Test service logic secara isolasi, mock semua external dependencies
2. **E2E Tests**: Test user flows end-to-end, gunakan data-testid untuk selectors
3. **Fixtures**: Gunakan data dari `test-data.ts` untuk konsistensi
4. **Mocking**: Jangan mock yang tidak perlu — test real behavior
5. **Selectors**: Gunakan role-based selectors (`getByRole`, `getByText`) untuk E2E
6. **Assertions**: Gunakan `expect().toBeVisible()` untuk UI assertions
7. **Timeouts**: Gunakan `waitForTimeout` dengan bijak untuk async operations
