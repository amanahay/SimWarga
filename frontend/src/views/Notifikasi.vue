<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { notifikasiAPI } from '@/services/api'
import { useToast } from '@/components/ui/toast/use-toast'
import { Bell, CheckCheck, Loader2 } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()

const loading = ref(false)
const markingAll = ref(false)
const markingId = ref(null)
const unreadCount = ref(0)
const notifikasiList = ref([])

const pageSubtitle = computed(() => `${unreadCount.value} notifikasi belum dibaca`)

function mapNotif(item) {
  return {
    id: item.Id,
    judul: item.Judul,
    pesan: item.Pesan,
    waktu: item.CreatedAt,
    icon: item.Icon || iconByType(item.Tipe),
    color: colorByType(item.Tipe),
    unread: !item.IsRead,
    tipe: item.Tipe || 'Info',
  }
}

function colorByType(type) {
  if (type === 'Pengaduan') return 'orange'
  if (type === 'Surat') return 'blue'
  if (type === 'Pengumuman') return 'cyan'
  return 'green'
}

function iconByType(type) {
  if (type === 'Pengaduan') return 'bi-megaphone'
  if (type === 'Surat') return 'bi-file-earmark-text'
  if (type === 'Pengumuman') return 'bi-newspaper'
  return 'bi-bell'
}

async function fetchNotifikasi() {
  loading.value = true
  try {
    const res = await notifikasiAPI.list()
    notifikasiList.value = (res.data.data || []).map(mapNotif)
    unreadCount.value = Number(res.data.unreadCount || 0)
    app.setNotificationUnreadCount(unreadCount.value)
  } catch (e) {
    toast({ title: 'Gagal memuat notifikasi', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

async function markRead(item, silent = false) {
  if (!item?.unread) return
  markingId.value = item.id
  try {
    await notifikasiAPI.markRead(item.id)
    item.unread = false
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    app.setNotificationUnreadCount(unreadCount.value)
    if (!silent) {
      toast({ title: 'Notifikasi dibaca', description: item.judul, variant: 'success' })
    }
  } catch (e) {
    toast({ title: 'Gagal memperbarui notifikasi', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    markingId.value = null
  }
}

async function tandaiSemua() {
  const unreadItems = notifikasiList.value.filter((item) => item.unread)
  if (unreadItems.length === 0) {
    toast({ title: 'Tidak ada notifikasi baru', variant: 'info' })
    return
  }

  markingAll.value = true
  try {
    for (const item of unreadItems) {
      await markRead(item, true)
    }
    toast({ title: 'Semua notifikasi ditandai telah dibaca', variant: 'success' })
  } finally {
    markingAll.value = false
    app.setNotificationUnreadCount(unreadCount.value)
  }
}

function formatTime(value) {
  if (!value) return '-'
  const date = new Date(String(value).replace(' ', 'T'))
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))

  if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} jam yang lalu`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return `Kemarin, ${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date)}`
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

onMounted(() => {
  app.setPage('notifikasi')
  fetchNotifikasi()
})
</script>

<template>
  <div>
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 class="page-title">Notifikasi</h1>
        <p class="page-subtitle">{{ pageSubtitle }}</p>
      </div>
      <button class="btn-outline-custom" :disabled="markingAll || unreadCount === 0" @click="tandaiSemua">
        <Loader2 v-if="markingAll" class="h-4 w-4 animate-spin" />
        <template v-else>
          <i class="bi bi-check2-all"></i> Tandai Semua Dibaca
        </template>
      </button>
    </div>

    <div v-if="loading" class="bg-white rounded-xl border border-slate-200 shadow-sm" style="display:flex;align-items:center;justify-content:center;padding:48px;">
      <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
    </div>

    <div v-else-if="notifikasiList.length === 0" class="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
      <Bell class="mx-auto h-10 w-10 text-slate-300 mb-3" />
      <p class="font-semibold text-slate-700">Belum ada notifikasi</p>
      <p class="text-sm text-slate-500 mt-1">Aktivitas pengumuman, pengaduan, dan e-surat akan muncul di sini.</p>
    </div>

    <div v-else style="display:flex;flex-direction:column;gap:10px;">
      <div
        v-for="item in notifikasiList"
        :key="item.id"
        :class="['notif-card', { unread: item.unread }]"
        @click="markRead(item)"
      >
        <div :class="['notif-icon', item.color]">
          <i :class="['bi', item.icon]"></i>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div style="font-weight:700;font-size:14px;">{{ item.judul }}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
              <span class="chip">{{ item.tipe }}</span>
              <div v-if="item.unread" style="width:8px;height:8px;border-radius:50%;background:var(--primary);margin-top:2px;" title="Belum dibaca"></div>
              <Loader2 v-if="markingId === item.id" class="h-3.5 w-3.5 animate-spin text-slate-400" />
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.5;margin-top:2px;">{{ item.pesan }}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px;display:flex;align-items:center;gap:6px;">
            <i class="bi bi-clock" style="font-size:11px;"></i>
            {{ formatTime(item.waktu) }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="notifikasiList.length > 0" class="mt-4 text-xs text-slate-500" style="display:flex;align-items:center;gap:8px;">
      <CheckCheck class="h-3.5 w-3.5" />
      Klik notifikasi untuk menandai sebagai dibaca.
    </div>
  </div>
</template>
