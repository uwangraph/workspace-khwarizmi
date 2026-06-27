/**
 * Test fixtures for Workspace Khwarizmi
 * Contains mock data used across unit and E2E tests
 */

export const mockUsers = {
  admin: {
    id: 'admin-uuid-001',
    email: 'admin@khwarizmi.test',
    full_name: 'Admin Khwarizmi',
    role: 'admin' as const,
    avatar_url: null,
    phone: '081234567890',
    position: 'System Administrator',
    address: 'Jakarta, Indonesia',
    birth_date: '1990-01-01',
    joined_at: '2025-01-01',
    created_at: '2025-01-01T00:00:00Z',
  },
  user: {
    id: 'user-uuid-001',
    email: 'user@khwarizmi.test',
    full_name: 'Test User',
    role: 'user' as const,
    avatar_url: null,
    phone: '089876543210',
    position: 'Developer',
    address: 'Bandung, Indonesia',
    birth_date: '1995-06-15',
    joined_at: '2025-06-01',
    created_at: '2025-06-01T00:00:00Z',
  },
  user2: {
    id: 'user-uuid-002',
    email: 'user2@khwarizmi.test',
    full_name: 'Second User',
    role: 'user' as const,
    avatar_url: null,
    phone: '081112223334',
    position: 'Designer',
    address: 'Surabaya, Indonesia',
    birth_date: '1997-03-20',
    joined_at: '2025-07-01',
    created_at: '2025-07-01T00:00:00Z',
  },
}

export const mockTasks = {
  basic: {
    id: 'task-uuid-001',
    title: 'Implement Login Feature',
    description: 'Create a secure login system with Supabase Auth',
    status: 'not_started' as const,
    priority: 'high' as const,
    progress: 0,
    start_date: '2026-01-01',
    due_date: '2026-01-31',
    created_by: mockUsers.admin.id,
    created_at: '2026-01-01T00:00:00Z',
    subtasks: [],
    attachments: [],
    completed_at: null,
  },
  inProgress: {
    id: 'task-uuid-002',
    title: 'Design Dashboard',
    description: 'Create dashboard UI mockups',
    status: 'in_progress' as const,
    priority: 'medium' as const,
    progress: 45,
    start_date: '2026-01-10',
    due_date: '2026-02-10',
    created_by: mockUsers.admin.id,
    created_at: '2026-01-10T00:00:00Z',
    subtasks: [
      { id: 'st-1', text: 'Wireframe', done: true },
      { id: 'st-2', text: 'Color scheme', done: false },
    ],
    attachments: [],
    completed_at: null,
  },
  done: {
    id: 'task-uuid-003',
    title: 'Setup Project',
    description: 'Initialize SvelteKit project',
    status: 'done' as const,
    priority: 'low' as const,
    progress: 100,
    start_date: '2025-12-01',
    due_date: '2025-12-15',
    created_by: mockUsers.admin.id,
    created_at: '2025-12-01T00:00:00Z',
    subtasks: [],
    attachments: [],
    completed_at: '2025-12-14T00:00:00Z',
  },
  review: {
    id: 'task-uuid-004',
    title: 'Code Review',
    description: 'Review pull requests',
    status: 'review' as const,
    priority: 'high' as const,
    progress: 85,
    start_date: '2026-01-15',
    due_date: '2026-01-20',
    created_by: mockUsers.user.id,
    created_at: '2026-01-15T00:00:00Z',
    subtasks: [],
    attachments: [],
    completed_at: null,
  },
  overdue: {
    id: 'task-uuid-005',
    title: 'Overdue Task',
    description: 'This task is past due',
    status: 'in_progress' as const,
    priority: 'high' as const,
    progress: 30,
    start_date: '2025-11-01',
    due_date: '2025-11-30',
    created_by: mockUsers.admin.id,
    created_at: '2025-11-01T00:00:00Z',
    subtasks: [],
    attachments: [],
    completed_at: null,
  },
}

export const mockAssignments = {
  accepted: {
    id: 'assign-uuid-001',
    task_id: mockTasks.basic.id,
    user_id: mockUsers.user.id,
    status: 'accepted' as const,
    accepted_at: '2026-01-02T00:00:00Z',
    completed_at: null,
  },
  pending: {
    id: 'assign-uuid-002',
    task_id: mockTasks.inProgress.id,
    user_id: mockUsers.user2.id,
    status: 'pending' as const,
    accepted_at: null,
    completed_at: null,
  },
  completed: {
    id: 'assign-uuid-003',
    task_id: mockTasks.done.id,
    user_id: mockUsers.user.id,
    status: 'completed' as const,
    accepted_at: '2025-12-01T00:00:00Z',
    completed_at: '2025-12-14T00:00:00Z',
  },
  rejected: {
    id: 'assign-uuid-004',
    task_id: mockTasks.review.id,
    user_id: mockUsers.user2.id,
    status: 'rejected' as const,
    accepted_at: null,
    completed_at: null,
  },
}

export const mockAttendance = {
  checkedIn: {
    id: 'att-uuid-001',
    user_id: mockUsers.user.id,
    session_id: 1,
    date: '2026-01-15',
    clock_in: '2026-01-15T08:05:00Z',
    clock_out: null,
    photo_in_url: 'https://cdn.test/selfies/user-uuid-001/1705305900000_in.jpg',
    photo_out_url: null,
    late: false,
    late_reason: null,
    forgot_checkout: false,
  },
  late: {
    id: 'att-uuid-002',
    user_id: mockUsers.user.id,
    session_id: 1,
    date: '2026-01-16',
    clock_in: '2026-01-16T08:20:00Z',
    clock_out: null,
    photo_in_url: 'https://cdn.test/selfies/user-uuid-001/1705393200000_in.jpg',
    photo_out_url: null,
    late: true,
    late_reason: 'Macet di tol',
    forgot_checkout: false,
  },
  complete: {
    id: 'att-uuid-003',
    user_id: mockUsers.user.id,
    session_id: 1,
    date: '2026-01-14',
    clock_in: '2026-01-14T07:55:00Z',
    clock_out: '2026-01-14T11:30:00Z',
    photo_in_url: 'https://cdn.test/selfies/user-uuid-001/1705218900000_in.jpg',
    photo_out_url: 'https://cdn.test/selfies/user-uuid-001/1705231800000_out.jpg',
    late: false,
    late_reason: null,
    forgot_checkout: false,
  },
}

export const mockLeaves = {
  pending: {
    id: 'leave-uuid-001',
    user_id: mockUsers.user.id,
    date: '2026-01-20',
    type: 'izin' as const,
    reason: 'Keperluan keluarga',
    session_id: null,
    status: 'pending' as const,
    approved_by: null,
    rejection_note: null,
  },
  approved: {
    id: 'leave-uuid-002',
    user_id: mockUsers.user.id,
    date: '2026-01-10',
    type: 'sakit' as const,
    reason: 'Demam',
    session_id: null,
    status: 'approved' as const,
    approved_by: mockUsers.admin.id,
    rejection_note: null,
  },
  rejected: {
    id: 'leave-uuid-003',
    user_id: mockUsers.user2.id,
    date: '2026-01-12',
    type: 'izin' as const,
    reason: 'Liburan',
    session_id: 1,
    status: 'rejected' as const,
    approved_by: mockUsers.admin.id,
    rejection_note: 'Deadline proyek sedang mendesak',
  },
}

export const mockNotifications = {
  taskAssigned: {
    id: 'notif-uuid-001',
    user_id: mockUsers.user.id,
    type: 'task_assigned',
    title: 'Tugas Baru',
    description: 'Anda ditugaskan ke "Implement Login Feature"',
    data: { task_id: mockTasks.basic.id },
    is_read: false,
    created_at: '2026-01-15T10:00:00Z',
  },
  taskCompleted: {
    id: 'notif-uuid-002',
    user_id: mockUsers.admin.id,
    type: 'task_completed',
    title: 'Tugas Selesai',
    description: 'Test User menyelesaikan "Setup Project"',
    data: { task_id: mockTasks.done.id },
    is_read: true,
    created_at: '2026-01-14T15:00:00Z',
  },
  leaveRequest: {
    id: 'notif-uuid-003',
    user_id: mockUsers.admin.id,
    type: 'leave_request',
    title: 'Pengajuan Izin Baru',
    description: 'Test User · 20 Jan 2026',
    data: { leave_type: 'izin', user_id: mockUsers.user.id },
    is_read: false,
    created_at: '2026-01-15T08:00:00Z',
  },
  collaborationInvite: {
    id: 'notif-uuid-004',
    user_id: mockUsers.user2.id,
    type: 'task_collaboration_invite',
    title: 'Undangan Kolaborasi',
    description: 'Admin Khwarizmi mengundang Anda ke "Design Dashboard"',
    data: { task_id: mockTasks.inProgress.id },
    is_read: false,
    created_at: '2026-01-15T12:00:00Z',
  },
}

export const mockChatRooms = {
  direct: {
    id: 'room-uuid-001',
    name: null,
    type: 'direct' as const,
    description: null,
    avatar_url: null,
    created_by: mockUsers.admin.id,
    created_at: '2026-01-01T00:00:00Z',
  },
  group: {
    id: 'room-uuid-002',
    name: 'Project Alpha',
    type: 'group' as const,
    description: 'Diskusi proyek Alpha',
    avatar_url: null,
    created_by: mockUsers.admin.id,
    created_at: '2026-01-05T00:00:00Z',
  },
}

export const mockChatMessages = {
  text: {
    id: 'msg-uuid-001',
    room_id: mockChatRooms.direct.id,
    sender_id: mockUsers.admin.id,
    type: 'text' as const,
    content: 'Halo, apa kabar?',
    metadata: null,
    created_at: '2026-01-15T10:00:00Z',
  },
  reply: {
    id: 'msg-uuid-002',
    room_id: mockChatRooms.direct.id,
    sender_id: mockUsers.user.id,
    type: 'text' as const,
    content: 'Baik, terima kasih!',
    metadata: { reply_to: 'msg-uuid-001', reply_name: 'Admin Khwarizmi', reply_content: 'Halo, apa kabar?' },
    created_at: '2026-01-15T10:05:00Z',
  },
  image: {
    id: 'msg-uuid-003',
    room_id: mockChatRooms.group.id,
    sender_id: mockUsers.user.id,
    type: 'image' as const,
    content: 'screenshot.png',
    metadata: {
      url: 'https://cdn.test/chat_media/room-uuid-002/screenshot.png',
      size: 102400,
      originalName: 'screenshot.png',
    },
    created_at: '2026-01-15T11:00:00Z',
  },
  poll: {
    id: 'msg-uuid-004',
    room_id: mockChatRooms.group.id,
    sender_id: mockUsers.admin.id,
    type: 'poll' as const,
    content: 'Kapan kita meeting?',
    metadata: {
      options: [
        { id: 'opt_0', text: 'Senin' },
        { id: 'opt_1', text: 'Selasa' },
        { id: 'opt_2', text: 'Rabu' },
      ],
    },
    created_at: '2026-01-15T12:00:00Z',
  },
}

export const mockHolidays = {
  newYear: {
    id: 'holiday-uuid-001',
    date: '2026-01-01',
    name: 'Tahun Baru 2026',
  },
  independence: {
    id: 'holiday-uuid-002',
    date: '2026-08-17',
    name: 'Hari Kemerdekaan RI',
  },
}

export const mockSpecialRules = {
  customTime: {
    id: 'rule-uuid-001',
    date: '2026-01-20',
    type: 'custom_time' as const,
    start_time: '09:00',
    active_sessions: null,
    note: 'Mulai terlambat karena acara',
    created_by: mockUsers.admin.id,
  },
  wfa: {
    id: 'rule-uuid-002',
    date: '2026-01-25',
    type: 'wfa' as const,
    start_time: null,
    active_sessions: null,
    note: 'Work from Anywhere',
    created_by: mockUsers.admin.id,
  },
}

export const mockAppSettings = {
  id: 1,
  office_lat: -6.2088,
  office_lng: 106.8456,
  office_radius: 100,
  office_locations: [
    { id: 'loc-1', name: 'Kantor Pusat', lat: -6.2088, lng: 106.8456, radius: 100 },
    { id: 'loc-2', name: 'Kantor Cabang', lat: -6.9175, lng: 107.6191, radius: 150 },
  ],
  admin_contact: '081234567890',
  deletion_scheduled_at: null,
  updated_at: '2026-01-15T00:00:00Z',
}

export const mockTaskComments = {
  general: {
    id: 'comment-uuid-001',
    task_id: mockTasks.basic.id,
    user_id: mockUsers.user.id,
    content: 'Saya akan mulai mengerjakan ini besok',
    tag: 'general' as const,
    reply_to: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  problem: {
    id: 'comment-uuid-002',
    task_id: mockTasks.basic.id,
    user_id: mockUsers.admin.id,
    content: 'Ada blocker di API authentication',
    tag: 'problem' as const,
    reply_to: null,
    created_at: '2026-01-15T11:00:00Z',
    updated_at: '2026-01-15T11:00:00Z',
  },
  reply: {
    id: 'comment-uuid-003',
    task_id: mockTasks.basic.id,
    user_id: mockUsers.user.id,
    content: 'Oke, saya cek dulu',
    tag: 'general' as const,
    reply_to: 'comment-uuid-002',
    created_at: '2026-01-15T11:30:00Z',
    updated_at: '2026-01-15T11:30:00Z',
  },
}

export const mockTaskAttachments = {
  file: {
    id: 'attach-uuid-001',
    task_id: mockTasks.basic.id,
    user_id: mockUsers.user.id,
    filename: 'requirements.pdf',
    file_url: 'https://cdn.test/tasks/task-uuid-001/requirements.pdf',
    file_type: 'application/pdf',
    created_at: '2026-01-15T10:00:00Z',
  },
  image: {
    id: 'attach-uuid-002',
    task_id: mockTasks.inProgress.id,
    user_id: mockUsers.user2.id,
    filename: 'mockup.png',
    file_url: 'https://cdn.test/tasks/task-uuid-002/mockup.png',
    file_type: 'image/png',
    created_at: '2026-01-15T11:00:00Z',
  },
}

// ── Helper functions ─────────────────────────────────────────────────────────

export function createMockTask(overrides: Partial<typeof mockTasks.basic> = {}) {
  return { ...mockTasks.basic, ...overrides, id: `task-uuid-${Date.now()}` }
}

export function createMockUser(overrides: Partial<typeof mockUsers.user> = {}) {
  return { ...mockUsers.user, ...overrides, id: `user-uuid-${Date.now()}` }
}

export function createMockNotification(overrides: Partial<typeof mockNotifications.taskAssigned> = {}) {
  return { ...mockNotifications.taskAssigned, ...overrides, id: `notif-uuid-${Date.now()}` }
}

export function createMockChatMessage(overrides: Partial<typeof mockChatMessages.text> = {}) {
  return { ...mockChatMessages.text, ...overrides, id: `msg-uuid-${Date.now()}` }
}

export function createMockAttendance(overrides: Partial<typeof mockAttendance.checkedIn> = {}) {
  return { ...mockAttendance.checkedIn, ...overrides, id: `att-uuid-${Date.now()}` }
}

// ── Session fixtures ─────────────────────────────────────────────────────────

export const mockSession = {
  user: mockUsers.user,
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
}

export const mockAdminSession = {
  user: mockUsers.admin,
  access_token: 'mock-admin-access-token',
  refresh_token: 'mock-admin-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
}
