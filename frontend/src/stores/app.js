import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { notifikasiAPI } from "@/services/api";

export const useAppStore = defineStore("app", () => {
  const currentPage = ref("dashboard");
  const pageTitle = ref("Dashboard");
  const sidebarOpen = ref(false);
  const toasts = ref([]);
  const notificationUnreadCount = ref(0);

  // Tenant impersonation (SuperAdmin only)
  const impersonateTenantId = ref(null);
  const impersonateTenantName = ref(null);
  const isImpersonating = computed(() => !!impersonateTenantId.value);

  function impersonateTenant(id, name) {
    impersonateTenantId.value = id;
    impersonateTenantName.value = name;
    localStorage.setItem("simwarga_imp_tenant_id", id);
    localStorage.setItem("simwarga_imp_tenant_name", name);
  }

  function stopImpersonating() {
    impersonateTenantId.value = null;
    impersonateTenantName.value = null;
    localStorage.removeItem("simwarga_imp_tenant_id");
    localStorage.removeItem("simwarga_imp_tenant_name");
  }

  function restoreImpersonation() {
    const id = localStorage.getItem("simwarga_imp_tenant_id");
    const name = localStorage.getItem("simwarga_imp_tenant_name");
    if (id) {
      impersonateTenantId.value = id;
      impersonateTenantName.value = name || "";
    }
  }

  const pageTitles = {
    dashboard: "Dashboard",
    "superadmin-dashboard": "Dashboard Super Admin",
    warga: "Data Warga",
    meteran: "Meteran Air",
    pencatatan: "Catat Meteran",
    tarif: "Tarif Air",
    "tagihan-air": "Tagihan Air",
    "pembayaran-air": "Bayar Air",
    iuran: "Jenis Iuran",
    "tagihan-iuran": "Tagihan Iuran",
    "pembayaran-iuran": "Bayar Iuran",
    pengeluaran: "Pengeluaran Kas",
    neraca: "Neraca Keuangan",
    laporan: "Laporan",
    esurat: "E-Surat",
    pengaduan: "Pengaduan",
    pengumuman: "Info & Pengumuman",
    peta: "Peta Warga",
    notifikasi: "Notifikasi",
    users: "Pengguna",
    audit: "Audit Log",
    profil: "Profil Warga",
    tenant: "Multi Tenant",
    "fee-settings": "Pengaturan Fee",
    "system-billing": "Tagihan Sistem",
    "license-activation": "Aktivasi Lisensi",
    "license-history": "Riwayat Lisensi",
    rw: "Data RW",
    rt: "Data RT",
    "whatsapp-gateway": "WhatsApp Gateway",
    "broadcast-center": "Broadcast Center",
  };

  function setPage(page) {
    currentPage.value = page;
    pageTitle.value = pageTitles[page] || page;
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
  }
  function closeSidebar() {
    sidebarOpen.value = false;
  }

  function showToast(msg, type = "info", icon = "bi-info-circle") {
    const id = Date.now();
    toasts.value.push({ id, msg, type, icon });
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 3500);
  }

  function setNotificationUnreadCount(count) {
    notificationUnreadCount.value = Number(count || 0);
  }

  async function refreshNotificationUnreadCount() {
    const token = localStorage.getItem("simwarga_token");
    if (!token) {
      notificationUnreadCount.value = 0;
      return 0;
    }
    try {
      const res = await notifikasiAPI.list();
      notificationUnreadCount.value = Number(res.data?.unreadCount || 0);
      return notificationUnreadCount.value;
    } catch (error) {
      return notificationUnreadCount.value;
    }
  }

  return {
    currentPage,
    pageTitle,
    sidebarOpen,
    toasts,
    notificationUnreadCount,
    pageTitles,
    impersonateTenantId,
    impersonateTenantName,
    isImpersonating,
    impersonateTenant,
    stopImpersonating,
    restoreImpersonation,
    setPage,
    toggleSidebar,
    closeSidebar,
    showToast,
    setNotificationUnreadCount,
    refreshNotificationUnreadCount,
  };
});
