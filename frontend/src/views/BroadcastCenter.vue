<script setup>
import { onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { communicationAPI } from '@/services/api'

const app = useAppStore()

const loading = ref(false)
const sending = ref(false)
const broadcastTitle = ref('')
const broadcastMessage = ref('')
const broadcastTarget = ref('semua')
const broadcastSchedule = ref('')
const stats = ref({
  penerima: 0,
  terkirim: 0,
  sedangDikirim: 0,
  broadcastBulanIni: 0,
})
const riwayat = ref([])
const targets = ref([])

function badgeBroadcast(s) {
  if (s === 'Selesai') return 'lunas'
  return 'pending'
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(String(value).replace(' ', 'T')))
}

async function fetchBroadcast() {
  loading.value = true
  try {
    const res = await communicationAPI.broadcastCenter()
    stats.value = res.data.stats || stats.value
    riwayat.value = res.data.history || []
    targets.value = res.data.targets || []
    if (!targets.value.find((item) => item.value === broadcastTarget.value) && targets.value.length) {
      broadcastTarget.value = targets.value[0].value
    }
  } catch (e) {
    app.showToast(e.response?.data?.error || 'Gagal memuat data broadcast', 'danger', 'bi-exclamation-triangle')
  } finally {
    loading.value = false
  }
}

async function sendBroadcast() {
  if (!broadcastTitle.value.trim() || !broadcastMessage.value.trim()) {
    app.showToast('Judul dan pesan broadcast wajib diisi', 'warning', 'bi-exclamation-triangle')
    return
  }
  sending.value = true
  try {
    const res = await communicationAPI.sendBroadcast({
      judul: broadcastTitle.value,
      pesan: broadcastMessage.value,
      target: broadcastTarget.value,
      scheduleAt: broadcastSchedule.value || null,
    })
    app.showToast(`Broadcast berhasil dikirim ke ${res.data.totalPenerima} penerima`, 'success', 'bi-check-circle')
    broadcastTitle.value = ''
    broadcastMessage.value = ''
    broadcastSchedule.value = ''
    await fetchBroadcast()
  } catch (e) {
    app.showToast(e.response?.data?.error || 'Gagal mengirim broadcast', 'danger', 'bi-exclamation-triangle')
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  app.setPage('broadcast-center')
  fetchBroadcast()
})
</script>

<template>
  <div>
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 class="page-title">Broadcast Center</h1>
        <p class="page-subtitle">Kirim broadcast massal berdasarkan data warga yang benar-benar ada</p>
      </div>
      <button class="btn-primary-custom" style="background:#25D366;" :disabled="sending" @click="sendBroadcast">
        <i class="bi bi-send-fill"></i> {{ sending ? 'Mengirim...' : 'Kirim Broadcast' }}
      </button>
    </div>

    <div v-if="loading" class="card"><div class="card-body" style="padding:48px;text-align:center;color:var(--text-muted);">Memuat data broadcast...</div></div>

    <template v-else>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px;">
        <div class="stat-card blue"><div class="stat-icon blue"><i class="bi bi-people-fill"></i></div><div class="stat-label">Penerima</div><div class="stat-value">{{ stats.penerima }}</div></div>
        <div class="stat-card green"><div class="stat-icon green"><i class="bi bi-send-check"></i></div><div class="stat-label">Terkirim</div><div class="stat-value">{{ stats.terkirim }}</div></div>
        <div class="stat-card orange"><div class="stat-icon orange"><i class="bi bi-hourglass-split"></i></div><div class="stat-label">Sedang Dikirim</div><div class="stat-value">{{ stats.sedangDikirim }}</div></div>
        <div class="stat-card cyan"><div class="stat-icon cyan"><i class="bi bi-megaphone"></i></div><div class="stat-label">Broadcast Bulan Ini</div><div class="stat-value">{{ stats.broadcastBulanIni }}</div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="card">
          <div class="card-header"><i class="bi bi-pencil-square" style="color:var(--primary);"></i> Buat Pesan Broadcast</div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:14px;">
            <div><label class="form-label-custom">Judul Broadcast</label><input v-model="broadcastTitle" type="text" class="form-control-custom" placeholder="Contoh: Pengingat Tagihan Bulanan" /></div>
            <div>
              <label class="form-label-custom">Preview</label>
              <div class="broadcast-template-box">
                <i class="bi bi-chat-left-quote" style="color:#25D366;margin-right:4px;"></i>
                {{ broadcastMessage ? broadcastMessage.substring(0, 120) + (broadcastMessage.length > 120 ? '...' : '') : 'Pesan Anda akan muncul di sini...' }}
              </div>
            </div>
            <div><label class="form-label-custom">Pesan</label><textarea v-model="broadcastMessage" class="form-control-custom" rows="5" placeholder="Gunakan {nama} untuk personalisasi nama warga."></textarea></div>
            <div>
              <label class="form-label-custom">Target Penerima</label>
              <select v-model="broadcastTarget" class="form-control-custom">
                <option v-for="item in targets" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </div>
            <div><label class="form-label-custom">Jadwal Kirim</label><input v-model="broadcastSchedule" type="datetime-local" class="form-control-custom" /></div>
            <button class="btn-primary-custom" style="justify-content:center;background:#25D366;" :disabled="sending" @click="sendBroadcast">
              <i class="bi bi-send-fill"></i> {{ sending ? 'Mengirim...' : 'Kirim Sekarang' }}
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><i class="bi bi-clock-history" style="color:var(--primary);"></i> Riwayat Broadcast</div>
          <div v-if="riwayat.length === 0" class="card-body" style="padding:32px;text-align:center;color:var(--text-muted);">Belum ada riwayat broadcast.</div>
          <div v-else class="table-responsive" style="padding:0;">
            <table class="table-custom">
              <thead>
                <tr><th>Judul</th><th style="text-align:center;">Penerima</th><th style="text-align:center;">Terkirim</th><th style="text-align:center;">Status</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in riwayat" :key="item.Id">
                  <td>
                    <div style="font-weight:700;font-size:12px;">{{ item.Judul }}</div>
                    <div style="font-size:11px;color:var(--text-muted);">{{ formatDate(item.CreatedAt) }}</div>
                  </td>
                  <td style="text-align:center;">{{ item.TotalPenerima }}</td>
                  <td style="text-align:center;font-weight:600;color:var(--secondary);">{{ item.TotalTerkirim }}</td>
                  <td style="text-align:center;"><span :class="['badge-status', badgeBroadcast(item.Status)]">{{ item.Status }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
