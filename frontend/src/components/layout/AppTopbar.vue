<template>
  <header id="topbar">
    <button class="topbar-toggle" @click="app.toggleSidebar()"><i class="bi bi-list"></i></button>
    <span class="topbar-title">{{ app.pageTitle }}</span>
    <span v-if="auth.user?.NamaTenant && !app.isImpersonating" style="background: var(--primary-soft, #e3f2fd); color: var(--primary, #1565c0); padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap; cursor: pointer;" @click="navigate('tenant')" title="Klik untuk ganti tenant">{{ auth.user.NamaTenant }}</span>
    <span v-if="app.isImpersonating" style="background: #fef3c7; color: #92400e; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap; cursor: pointer;" @click="app.stopImpersonating(); router.push('/app/tenant')" title="Klik untuk kembali">🔑 {{ app.impersonateTenantName }} ✕</span>
    <div class="topbar-actions">
      <button class="topbar-btn" @click="navigate('notifikasi')"><i class="bi bi-bell"></i><span v-if="app.notificationUnreadCount > 0" class="notif-dot"></span></button>
      <button class="topbar-btn" @click="app.showToast('WhatsApp reminder terkirim','success','bi-whatsapp')"><i class="bi bi-whatsapp"></i></button>
      <button class="topbar-btn" @click="goHome"><i class="bi bi-house"></i></button>
    </div>
  </header>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
const router = useRouter()
const app = useAppStore()
const auth = useAuthStore()
function navigate(page) { app.setPage(page); router.push('/app/' + page) }
function goHome() { router.push('/') }
onMounted(() => { app.refreshNotificationUnreadCount() })
</script>
