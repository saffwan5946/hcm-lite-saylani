// Frontend API client with JWT handling and base URL
const BASE_URL = '/api';

export const getAuthToken = () => localStorage.getItem('hcm_token');
export const setAuthToken = (token) => localStorage.setItem('hcm_token', token);
export const removeAuthToken = () => {
  localStorage.removeItem('hcm_token');
  localStorage.removeItem('hcm_user');
};

export const getStoredUser = () => {
  try {
    const u = localStorage.getItem('hcm_user');
    return u ? JSON.parse(u) : null;
  } catch (e) {
    return null;
  }
};

export const setStoredUser = (user) => {
  localStorage.setItem('hcm_user', JSON.stringify(user));
};

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // If not on login or status check, clear token
    if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/status')) {
      removeAuthToken();
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || data?.errors?.join(', ') || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Service methods
export const api = {
  // Auth & System
  getStatus: () => apiRequest('/auth/status'),
  setupFirstRun: (body) => apiRequest('/auth/setup', { method: 'POST', body: JSON.stringify(body) }),
  login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  changePassword: (body) => apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => apiRequest('/auth/me'),
  createHR: (body) => apiRequest('/auth/hr', { method: 'POST', body: JSON.stringify(body) }),
  manageUser: (userId, body) => apiRequest(`/auth/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // Org Setup
  getSettings: () => apiRequest('/org/settings'),
  updateSettings: (body) => apiRequest('/org/settings', { method: 'PUT', body: JSON.stringify(body) }),
  getDepartments: () => apiRequest('/org/departments'),
  createDepartment: (body) => apiRequest('/org/departments', { method: 'POST', body: JSON.stringify(body) }),
  getDesignations: (departmentId) => apiRequest(`/org/designations${departmentId ? `?departmentId=${departmentId}` : ''}`),
  createDesignation: (body) => apiRequest('/org/designations', { method: 'POST', body: JSON.stringify(body) }),
  getLeaveTypes: () => apiRequest('/org/leave-types'),
  updateLeaveType: (id, body) => apiRequest(`/org/leave-types/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getHolidays: (year) => apiRequest(`/org/holidays${year ? `?year=${year}` : ''}`),
  addHoliday: (body) => apiRequest('/org/holidays', { method: 'POST', body: JSON.stringify(body) }),
  deleteHoliday: (id) => apiRequest(`/org/holidays/${id}`, { method: 'DELETE' }),

  // Employees
  listEmployees: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/employees${query ? `?${query}` : ''}`);
  },
  registerEmployee: (body) => apiRequest('/employees/register', { method: 'POST', body: JSON.stringify(body) }),
  getEmployee360: (id) => apiRequest(`/employees/${id}/360`),
  updateEmployee: (id, body) => apiRequest(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  csvDryRun: (rows) => apiRequest('/employees/csv/dry-run', { method: 'POST', body: JSON.stringify({ rows }) }),
  csvImport: (validRows) => apiRequest('/employees/csv/import', { method: 'POST', body: JSON.stringify({ validRows }) }),

  // Attendance
  checkIn: (body) => apiRequest('/attendance/check-in', { method: 'POST', body: JSON.stringify(body) }),
  checkOut: () => apiRequest('/attendance/check-out', { method: 'POST', body: JSON.stringify({}) }),
  getAttendanceBoard: (date) => apiRequest(`/attendance/board${date ? `?date=${date}` : ''}`),
  requestCorrection: (body) => apiRequest('/attendance/correction', { method: 'POST', body: JSON.stringify(body) }),
  reviewCorrection: (id, body) => apiRequest(`/attendance/correction/${id}/review`, { method: 'PATCH', body: JSON.stringify(body) }),

  // Leave
  getLeaveBalance: (employeeId) => apiRequest(`/leave/balance${employeeId ? `?employeeId=${employeeId}` : ''}`),
  applyLeave: (body) => apiRequest('/leave/apply', { method: 'POST', body: JSON.stringify(body) }),
  listLeaves: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/leave${query ? `?${query}` : ''}`);
  },
  reviewLeave: (id, body) => apiRequest(`/leave/${id}/review`, { method: 'PATCH', body: JSON.stringify(body) }),
  cancelLeave: (id) => apiRequest(`/leave/${id}/cancel`, { method: 'PATCH' }),

  // Payroll
  createPayrollDraft: (body) => apiRequest('/payroll/draft', { method: 'POST', body: JSON.stringify(body) }),
  finalizePayroll: (body) => apiRequest('/payroll/finalize', { method: 'POST', body: JSON.stringify(body) }),
  listPayrollRuns: () => apiRequest('/payroll/runs'),
  getPayrollRun: (period) => apiRequest(`/payroll/runs/${period}`),
  getPayslip: (id) => apiRequest(`/payroll/payslip/${id}`),
  downloadPayslipPdfUrl: (id) => `${BASE_URL}/payroll/payslip/${id}/pdf`,

  // Dashboards
  getAdminDashboard: (departmentId) => apiRequest(`/dashboard/admin${departmentId ? `?departmentId=${departmentId}` : ''}`),
  getHRDashboard: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/dashboard/hr${query ? `?${query}` : ''}`);
  },
  getEmployeeDashboard: () => apiRequest('/dashboard/employee'),

  // AI Assistant
  aiChat: (prompt) => apiRequest('/ai/chat', { method: 'POST', body: JSON.stringify({ prompt }) }),
  aiSummarize: (kpis) => apiRequest('/ai/summarize', { method: 'POST', body: JSON.stringify({ kpis }) }),
  aiSmartLeave: (prompt) => apiRequest('/ai/smart-leave', { method: 'POST', body: JSON.stringify({ prompt }) }),

  // Comms & Audit
  listAnnouncements: () => apiRequest('/comms/announcements'),
  postAnnouncement: (body) => apiRequest('/comms/announcements', { method: 'POST', body: JSON.stringify(body) }),
  listNotifications: () => apiRequest('/comms/notifications'),
  markNotificationRead: (id) => apiRequest(`/comms/notifications/${id}/read`, { method: 'PATCH' }),
  listAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/comms/audit-logs${query ? `?${query}` : ''}`);
  }
};

