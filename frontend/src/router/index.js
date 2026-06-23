import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("../views/Home.vue"),
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/LoginView.vue"),
  },
  {
    path: "/daftar-portal",
    name: "DaftarPortal",
    component: () => import("../views/RegisterPortal.vue"),
  },
  {
    path: "/hard-password",
    name: "HardPassword",
    component: () => import("../views/HardPassword.vue"),
  },
  {
    path: "/app",
    component: () => import("../components/layout/AppLayout.vue"),
    redirect: "/app/dashboard",
    meta: { requiresAuth: true },
    children: [
      {
        path: "dashboard",
        name: "dashboard",
        component: () => import("../views/DashboardOverview.vue"),
      },
      {
        path: "superadmin-dashboard",
        name: "superadmin-dashboard",
        component: () => import("../views/SuperAdminDashboard.vue"),
      },
      {
        path: "rw",
        name: "rw",
        component: () => import("../views/DataRW.vue"),
      },
      {
        path: "rt",
        name: "rt",
        component: () => import("../views/DataRT.vue"),
      },
      {
        path: "warga",
        name: "warga",
        component: () => import("../views/DataWarga.vue"),
      },
      {
        path: "meteran",
        name: "meteran",
        component: () => import("../views/MeteranAir.vue"),
      },
      {
        path: "pencatatan",
        name: "pencatatan",
        component: () => import("../views/CatatMeter.vue"),
      },
      {
        path: "tarif",
        name: "tarif",
        component: () => import("../views/TarifAir.vue"),
      },
      {
        path: "tagihan-air",
        name: "tagihan-air",
        component: () => import("../views/TagihanAir.vue"),
      },
      {
        path: "pembayaran-air",
        name: "pembayaran-air",
        component: () => import("../views/PembayaranAir.vue"),
      },
      {
        path: "iuran",
        name: "iuran",
        component: () => import("../views/JenisIuran.vue"),
      },
      {
        path: "tagihan-iuran",
        name: "tagihan-iuran",
        component: () => import("../views/TagihanIuran.vue"),
      },
      {
        path: "pembayaran-iuran",
        name: "pembayaran-iuran",
        component: () => import("../views/PembayaranIuran.vue"),
      },
      {
        path: "pengeluaran",
        name: "pengeluaran",
        component: () => import("../views/PengeluaranKas.vue"),
      },
      {
        path: "jurnal",
        name: "jurnal",
        component: () => import("../views/PencatatanJurnal.vue"),
      },
      {
        path: "neraca",
        name: "neraca",
        component: () => import("../views/NeracaKeuangan.vue"),
      },
      {
        path: "laporan",
        name: "laporan",
        component: () => import("../views/Laporan.vue"),
      },
      {
        path: "esurat",
        name: "esurat",
        component: () => import("../views/ESurat.vue"),
      },
      {
        path: "pengaduan",
        name: "pengaduan",
        component: () => import("../views/Pengaduan.vue"),
      },
      {
        path: "pengumuman",
        name: "pengumuman",
        component: () => import("../views/Pengumuman.vue"),
      },
      {
        path: "peta",
        name: "peta",
        component: () => import("../views/PetaWarga.vue"),
      },
      {
        path: "notifikasi",
        name: "notifikasi",
        component: () => import("../views/Notifikasi.vue"),
      },
      {
        path: "users",
        name: "users",
        component: () => import("../views/Pengguna.vue"),
      },
      {
        path: "roles",
        name: "roles",
        component: () => import("../views/Roles.vue"),
      },
      {
        path: "audit",
        name: "audit",
        component: () => import("../views/AuditLog.vue"),
      },
      {
        path: "profil",
        name: "profil",
        component: () => import("../views/ProfilWarga.vue"),
      },
      {
        path: "tenant",
        name: "tenant",
        component: () => import("../views/MultiTenant.vue"),
      },
      {
        path: "fee-settings",
        name: "fee-settings",
        component: () => import("../views/FeeSettings.vue"),
      },
      {
        path: "system-billing",
        name: "system-billing",
        component: () => import("../views/SystemBilling.vue"),
      },
      {
        path: "license-activation",
        name: "license-activation",
        component: () => import("../views/LicenseActivation.vue"),
      },
      {
        path: "license-history",
        name: "license-history",
        component: () => import("../views/LicenseHistory.vue"),
      },
      {
        path: "whatsapp-gateway",
        name: "whatsapp-gateway",
        component: () => import("../views/WhatsAppGateway.vue"),
      },
      {
        path: "broadcast-center",
        name: "broadcast-center",
        component: () => import("../views/BroadcastCenter.vue"),
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

// Auth guard
router.beforeEach(async (to, from, next) => {
  if (to.matched.some((r) => r.meta?.requiresAuth)) {
    const token = localStorage.getItem("simwarga_token");
    if (!token) {
      return next({ name: "Login", query: { redirect: to.fullPath } });
    }

    const savedUser = localStorage.getItem("simwarga_user");
    let user = null;
    try {
      user = savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {}
    const role = user?.role || user?.Role;
    const wargaAllowedRoutes = [
      "pengaduan",
      "esurat",
      "pengumuman",
      "profil",
      "notifikasi",
    ];
    if (
      role === "Warga" &&
      to.name &&
      !wargaAllowedRoutes.includes(String(to.name))
    ) {
      return next({ name: "pengaduan" });
    }
  }
  next();
});

export default router;
