<template>
  <nav class="sidebar" :class="{ open: app.sidebarOpen }" id="sidebar">
    <div class="sidebar-brand">
      <div class="brand-logo">S</div>
      <div class="brand-text">
        <div class="brand-name">SimWarga</div>
        <div class="brand-sub">v3.0 · {{ auth.userRole || 'RT 03 / RW 07' }}</div>
      </div>
    </div>
    <div class="sidebar-scroll">
      <div class="sidebar-section">Utama</div>
      <button v-if="!isWarga" class="nav-item-sidebar" :class="{ active: app.currentPage === 'dashboard' }" @click="navigate('dashboard')">
        <i class="bi bi-grid-1x2-fill"></i> Dashboard
      </button>
      <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'notifikasi' }" @click="navigate('notifikasi')">
        <i class="bi bi-bell-fill"></i> Notifikasi <span v-if="app.notificationUnreadCount > 0" class="badge-count">{{ app.notificationUnreadCount }}</span>
      </button>

      <template v-if="!isWarga">
        <div class="sidebar-section">Data Master</div>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'rw' }" @click="navigate('rw')">
          <i class="bi bi-signpost-2-fill"></i> Data RW
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'rt' }" @click="navigate('rt')">
          <i class="bi bi-signpost-fill"></i> Data RT
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'warga' }" @click="navigate('warga')">
          <i class="bi bi-people-fill"></i> Data Warga
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'meteran' }" @click="navigate('meteran')">
          <i class="bi bi-speedometer2"></i> Meteran Air
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'tarif' }" @click="navigate('tarif')">
          <i class="bi bi-tag-fill"></i> Tarif Air
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'iuran' }" @click="navigate('iuran')">
          <i class="bi bi-wallet2"></i> Jenis Iuran
        </button>
      </template>

      <template v-if="!isWarga">
        <div class="sidebar-section">Operasional</div>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'pencatatan' }" @click="navigate('pencatatan')">
          <i class="bi bi-pencil-square"></i> Catat Meteran
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'tagihan-air' }" @click="navigate('tagihan-air')">
          <i class="bi bi-receipt"></i> Tagihan Air
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'pembayaran-air' }" @click="navigate('pembayaran-air')">
          <i class="bi bi-cash-stack"></i> Bayar Air
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'tagihan-iuran' }" @click="navigate('tagihan-iuran')">
          <i class="bi bi-file-earmark-text"></i> Tagihan Iuran
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'pembayaran-iuran' }" @click="navigate('pembayaran-iuran')">
          <i class="bi bi-coin"></i> Bayar Iuran
        </button>
      </template>

      <template v-if="!isWarga">
        <div class="sidebar-section">Keuangan</div>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'pengeluaran' }" @click="navigate('pengeluaran')">
          <i class="bi bi-arrow-up-circle-fill"></i> Pengeluaran Kas
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'neraca' }" @click="navigate('neraca')">
          <i class="bi bi-bar-chart-fill"></i> Neraca Keuangan
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'laporan' }" @click="navigate('laporan')">
          <i class="bi bi-file-earmark-bar-graph-fill"></i> Laporan
        </button>
      </template>

      <div class="sidebar-section">Layanan Warga</div>
      <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'esurat' }" @click="navigate('esurat')">
        <i class="bi bi-envelope-paper-fill"></i> E-Surat
      </button>
      <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'pengaduan' }" @click="navigate('pengaduan')">
        <i class="bi bi-megaphone-fill"></i> Pengaduan
      </button>
      <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'pengumuman' }" @click="navigate('pengumuman')">
        <i class="bi bi-newspaper"></i> Info & Pengumuman
      </button>
      <button v-if="!isWarga" class="nav-item-sidebar" :class="{ active: app.currentPage === 'peta' }" @click="navigate('peta')">
        <i class="bi bi-geo-alt-fill"></i> Peta Warga
      </button>

      <div v-if="!isWarga" class="sidebar-section">Sistem</div>
      <button v-if="!isWarga" class="nav-item-sidebar" :class="{ active: app.currentPage === 'users' }" @click="navigate('users')">
        <i class="bi bi-shield-fill"></i> Pengguna
      </button>
      <button v-if="!isWarga" class="nav-item-sidebar" :class="{ active: app.currentPage === 'roles' }" @click="navigate('roles')">
        <i class="bi bi-person-badge"></i> Roles
      </button>
      <button v-if="!isWarga" class="nav-item-sidebar" :class="{ active: app.currentPage === 'audit' }" @click="navigate('audit')">
        <i class="bi bi-list-check"></i> Audit Log
      </button>
      <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'profil' }" @click="navigate('profil')">
        <i class="bi bi-person-circle"></i> Profil Warga
      </button>
      <button v-if="!isWarga" class="nav-item-sidebar" :class="{ active: app.currentPage === 'tenant' }" @click="navigate('tenant')">
        <i class="bi bi-building"></i> Multi Tenant
      </button>

      <template v-if="auth.isSuperAdmin">
        <div class="sidebar-section">Monetisasi SaaS</div>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'superadmin-dashboard' }" @click="navigate('superadmin-dashboard')">
          <i class="bi bi-bar-chart-steps"></i> Dashboard Super Admin
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'fee-settings' }" @click="navigate('fee-settings')">
          <i class="bi bi-sliders2-vertical"></i> Pengaturan Fee
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'system-billing' }" @click="navigate('system-billing')">
          <i class="bi bi-receipt-cutoff"></i> Tagihan Sistem
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'license-activation' }" @click="navigate('license-activation')">
          <i class="bi bi-key-fill"></i> Aktivasi Lisensi <span class="badge-count">!</span>
        </button>
        <button class="nav-item-sidebar" :class="{ active: app.currentPage === 'license-history' }" @click="navigate('license-history')">
          <i class="bi bi-clock-history"></i> Riwayat Lisensi
        </button>
      </template>

      <div v-if="!isWarga" class="sidebar-section">Komunikasi</div>
      <button v-if="!isWarga" class="nav-item-sidebar" :class="{ active: app.currentPage === 'whatsapp-gateway' }" @click="navigate('whatsapp-gateway')">
        <i class="bi bi-whatsapp"></i> WhatsApp Gateway
      </button>
      <button v-if="!isWarga" class="nav-item-sidebar" :class="{ active: app.currentPage === 'broadcast-center' }" @click="navigate('broadcast-center')">
        <i class="bi bi-megaphone-fill"></i> Broadcast Center
      </button>

      <div style="height:8px"></div>
      <button class="dark-toggle" @click="auth.toggleDark()">
        <i :class="auth.isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill'"></i> {{ auth.isDark ? 'Mode Terang' : 'Mode Gelap' }}
        <div class="toggle-switch" :class="{ on: auth.isDark }"><div class="toggle-thumb"></div></div>
      </button>
    </div>
    <div class="sidebar-user">
      <div class="user-avatar">{{ auth.userInitials }}</div>
      <div class="user-info">
        <div class="user-name">{{ auth.userName }}</div>
        <div class="user-role">{{ auth.userRole }}</div>
      </div>
      <button class="btn-icon" style="border:none;background:none;color:var(--text-muted)" @click="handleLogout">
        <i class="bi bi-box-arrow-right"></i>
      </button>
    </div>
  </nav>
  <div class="sidebar-overlay" :class="{ show: app.sidebarOpen }" @click="app.closeSidebar()"></div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { computed, onMounted } from 'vue'

const router = useRouter()
const auth = useAuthStore()
const app = useAppStore()
const isWarga = computed(() => auth.userRole === 'Warga')

function navigate(page) {
  app.setPage(page)
  app.closeSidebar()
  router.push('/app/' + page)
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}

onMounted(() => {
  app.refreshNotificationUnreadCount()
})
</script>
