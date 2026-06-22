import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("simwarga_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Impersonation header (SuperAdmin only)
    const impId = localStorage.getItem("simwarga_imp_tenant_id");
    if (impId) {
      config.headers["X-Impersonate-Tenant"] = impId;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

  // Response interceptor: handle 401 (don't forcibly redirect from here)
 api.interceptors.response.use(
   (response) => response,
   (error) => {
     if (error.response?.status === 401) {
       // Clear stored session but do not navigate here.
       // Let route guard or store logic handle redirect so public pages (like register) don't get forced.
       localStorage.removeItem("simwarga_token");
       localStorage.removeItem("simwarga_user");
     }
     return Promise.reject(error);
   },
 );

export default api;

// ===== API Service Functions =====

// Auth
export const authAPI = {
  login: (username, password) =>
    api.post("/auth/login", { username, password }),
  me: () => api.get("/auth/me"),
};

// Dashboard
export const dashboardAPI = {
  stats: () => api.get("/dashboard/stats"),
};

// Profil
export const profilAPI = {
  get: () => api.get("/profil"),
  update: (data) => api.put("/profil", data),
};

// Warga
export const wargaAPI = {
  list: (params) => api.get("/warga", { params }),
  create: (data) => api.post("/warga", data),
  update: (id, data) => api.put(`/warga/${id}`, data),
  delete: (id) => api.delete(`/warga/${id}`),
};

// Meteran
export const meteranAPI = {
  list: (params) => api.get("/meteran", { params }),
  create: (data) => api.post("/meteran", data),
  update: (id, data) => api.put(`/meteran/${id}`, data),
  delete: (id) => api.delete(`/meteran/${id}`),
};

// Pencatatan
export const pencatatanAPI = {
  list: (params) => api.get("/pencatatan", { params }),
  create: (data) => api.post("/pencatatan", data),
};

// Tarif
export const tarifAPI = {
  list: () => api.get("/tarif"),
  create: (data) => api.post("/tarif", data),
  update: (id, data) => api.put(`/tarif/${id}`, data),
  delete: (id) => api.delete(`/tarif/${id}`),
};

// Tagihan Air
export const tagihanAirAPI = {
  list: (params) => api.get("/tagihan-air", { params }),
  generate: (data) => api.post("/tagihan-air/generate", data),
};

// Pembayaran Air
export const pembayaranAirAPI = {
  list: () => api.get("/pembayaran-air"),
  create: (data) => api.post("/pembayaran-air", data),
};

// Jenis Iuran
export const iuranAPI = {
  list: () => api.get("/iuran"),
  create: (data) => api.post("/iuran", data),
  update: (id, data) => api.put(`/iuran/${id}`, data),
  delete: (id) => api.delete(`/iuran/${id}`),
};

// Tagihan Iuran
export const tagihanIuranAPI = {
  list: (params) => api.get("/tagihan-iuran", { params }),
  generate: (data) => api.post("/tagihan-iuran/generate", data),
};

// Pembayaran Iuran
export const pembayaranIuranAPI = {
  list: () => api.get("/pembayaran-iuran"),
  create: (data) => api.post("/pembayaran-iuran", data),
};

// Pengeluaran
export const pengeluaranAPI = {
  list: () => api.get("/pengeluaran"),
  create: (data) => api.post("/pengeluaran", data),
  update: (id, data) => api.put(`/pengeluaran/${id}`, data),
  delete: (id) => api.delete(`/pengeluaran/${id}`),
};

// Neraca
export const neracaAPI = {
  get: (config) => api.get("/neraca", config),
};

// Pengaduan
export const pengaduanAPI = {
  list: (params) => api.get("/pengaduan", { params }),
  create: (data) => api.post("/pengaduan", data),
  updateStatus: (id, data) => api.put(`/pengaduan/${id}/status`, data),
};

// E-Surat
export const jenisSuratAPI = {
  list: () => api.get("/jenis-surat"),
};

export const suratAPI = {
  list: (params) => api.get("/surat", { params }),
  create: (data) => api.post("/surat", data),
  updateStatus: (id, data) => api.put(`/surat/${id}/status`, data),
  delete: (id) => api.delete(`/surat/${id}`),
};

// Notifikasi
export const notifikasiAPI = {
  list: () => api.get("/notifikasi"),
  markRead: (id) => api.put(`/notifikasi/${id}/read`),
};

// Users
export const usersAPI = {
  list: () => api.get("/users"),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Audit
export const auditAPI = {
  list: () => api.get("/audit"),
};

// Roles
export const rolesAPI = {
  list: () => api.get("/roles"),
  create: (data) => api.post("/roles", data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
};

// Tenants
export const tenantsAPI = {
  list: () => api.get("/tenants"),
  create: (data) => api.post("/tenants", data),
  update: (id, data) => api.put(`/tenants/${id}`, data),
  delete: (id) => api.delete(`/tenants/${id}`),
};

// SaaS
export const saasAPI = {
  dashboard: () => api.get("/saas/dashboard"),
  feeSettings: () => api.get("/saas/fee-settings"),
  updateFeeSetting: (tenantId, data) => api.put(`/saas/fee-settings/${tenantId}`, data),
  systemBillings: () => api.get("/saas/system-billings"),
  generateBillings: (data) => api.post("/saas/generate-billings", data),
  licenses: () => api.get("/saas/licenses"),
  activateLicense: (data) => api.post("/saas/licenses/activate", data),
  licenseHistory: () => api.get("/saas/license-history"),
};

export const communicationAPI = {
  whatsappGateway: () => api.get("/communication/whatsapp-gateway"),
  saveWhatsappGateway: (data) => api.put("/communication/whatsapp-gateway", data),
  testWhatsappGateway: () => api.post("/communication/whatsapp-gateway/test"),
  sendWhatsappMessage: (data) => api.post("/communication/whatsapp-gateway/send", data),
  broadcastCenter: () => api.get("/communication/broadcast-center"),
  sendBroadcast: (data) => api.post("/communication/broadcast-center/send", data),
};

// RW
export const rwAPI = {
  list: () => api.get("/rw"),
  create: (data) => api.post("/rw", data),
  update: (id, data) => api.put(`/rw/${id}`, data),
  delete: (id) => api.delete(`/rw/${id}`),
};

// RT
export const rtAPI = {
  list: (params) => api.get("/rt", { params }),
  create: (data) => api.post("/rt", data),
  update: (id, data) => api.put(`/rt/${id}`, data),
  delete: (id) => api.delete(`/rt/${id}`),
};

// RT bulk
export const rtBulkAPI = {
  import: (data) => api.post("/rt/bulk", { data }),
};

// Warga bulk
export const wargaBulkAPI = {
  import: (data) => api.post("/warga/bulk", { data }),
};

// RW bulk
export const rwBulkAPI = {
  import: (data) => api.post("/rw/bulk", { data }),
};

// Public
export const publicAPI = {
  stats: () => api.get("/public/stats"),
  announcements: () => api.get("/public/announcements"),
  pengumuman: (params) => api.get("/public/pengumuman", { params }),
  register: (data) => api.post("/public/register", data),
};

// Pengumuman
export const pengumumanAPI = {
  list: (params) => api.get("/pengumuman", { params }),
  create: (data) => api.post("/pengumuman", data),
  update: (id, data) => api.put(`/pengumuman/${id}`, data),
  delete: (id) => api.delete(`/pengumuman/${id}`),
};
