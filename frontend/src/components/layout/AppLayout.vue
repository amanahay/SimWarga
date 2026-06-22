<template>
  <AppSidebar />
  <div class="app-body" id="app-body">
    <AppTopbar />
    <main id="content-area">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <button v-if="showBackTop" class="back-to-top" @click="scrollToTop" title="Kembali ke atas">
      <i class="bi bi-chevron-up"></i>
    </button>
  </div>
  <div class="toast-wrap">
    <div v-for="t in app.toasts" :key="t.id" class="toast-item">
      <i :class="'bi ' + t.icon + ' toast-icon'" :style="{ color: colors[t.type] }"></i>
      <div class="toast-msg">{{ t.msg }}</div>
      <button class="toast-close" @click="app.toasts = app.toasts.filter(x => x.id !== t.id)"><i class="bi bi-x"></i></button>
    </div>
  </div>
  <Toaster />
</template>

<script setup>
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { onMounted, watch, ref } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import Toaster from '@/components/ui/toast/Toaster.vue'

const app = useAppStore()
const auth = useAuthStore()
const colors = { success: 'var(--secondary)', danger: 'var(--danger)', warning: 'var(--warning)', info: 'var(--primary)' }
const showBackTop = ref(false)

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

function handleScroll() { showBackTop.value = window.scrollY > window.innerHeight / 2 }

onMounted(() => { auth.initDark(); auth.restoreSession(); app.restoreImpersonation(); window.addEventListener('scroll', handleScroll) })

// Watch theme flag from the auth store and ensure the document <html> is always synced.
// This is a defensive fix in case other code mutates the DOM or the class is lost on navigation.
watch(() => auth.isDark.value, (isDark) => {
  const dark = !!isDark
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  if (dark) document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
  localStorage.setItem('simwarga_dark', dark ? '1' : '0')
}, { immediate: true })
</script>
