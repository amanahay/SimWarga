<script setup>
import { onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { communicationAPI } from '@/services/api'

const app = useAppStore()

const loading = ref(false)
const testing = ref(false)
const sending = ref(false)
const saving = ref(false)
const nomorTujuan = ref('')
const namaTujuan = ref('')
const pesanManual = ref('')
const gatewayConfig = ref({
  nomor: '',
  apiKey: '',
  provider: 'WABLAS',
  autoReply: '',
  isAktif: true,
})
const stats = ref({
  pesanTerkirim: 0,
  successRate: 0,
  gagal: 0,
  pesanHariIni: 0,
})
const riwayat = ref([])

function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(String(value).replace(' ', 'T')))
}

function badgeWa(s) {
  if (s === 'Terkirim') return 'lunas'
  return 'belum'
}

async function fetchGateway() {
  loading.value = true
  try {
    const res = await communicationAPI.whatsappGateway()
    gatewayConfig.value = res.data.config
    stats.value = res.data.stats
    riwayat.value = res.data.history || []
  } catch (e) {
    app.showToast(e.response?.data?.error || 'Gagal memuat WhatsApp Gateway', 'danger', 'bi-exclamation-triangle')
  } finally {
    loading.value = false
  }
}

async function sendMessage() {
  if (!nomorTujuan.value.trim() || !pesanManual.value.trim()) {
    app.showToast('Nomor tujuan dan pesan wajib diisi', 'warning', 'bi-exclamation-triangle')
    return
  }
  sending.value = true
  try {
    await communicationAPI.sendWhatsappMessage({
      nomorTujuan: nomorTujuan.value,
      namaTujuan: namaTujuan.value,
      pesan: pesanManual.value,
    })
    nomorTujuan.value = ''
    namaTujuan.value = ''
    pesanManual.value = ''
    app.showToast('Pesan WhatsApp berhasil dicatat sebagai terkirim', 'success', 'bi-check-circle')
    await fetchGateway()
  } catch (e) {
    app.showToast(e.response?.data?.error || 'Gagal mengirim pesan WhatsApp', 'danger', 'bi-exclamation-triangle')
  } finally {
    sending.value = false
  }
}

async function testConnection() {
  testing.value = true
  try {
    const res = await communicationAPI.testWhatsappGateway()
    app.showToast(res.data.message || 'Konfigurasi gateway valid', 'success', 'bi-check-circle')
  } catch (e) {
    app.showToast(e.response?.data?.error || 'Tes koneksi gagal', 'danger', 'bi-exclamation-triangle')
  } finally {
    testing.value = false
  }
}

async function saveConfig() {
  saving.value = true
  try {
    await communicationAPI.saveWhatsappGateway(gatewayConfig.value)
    app.showToast('Konfigurasi gateway berhasil disimpan', 'success', 'bi-check-circle')
    await fetchGateway()
  } catch (e) {
    app.showToast(e.response?.data?.error || 'Gagal menyimpan konfigurasi gateway', 'danger', 'bi-exclamation-triangle')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  app.setPage('whatsapp-gateway')
  fetchGateway()
})
</script>

<template>
  <div>
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 class="page-title">WhatsApp Gateway</h1>
        <p class="page-subtitle">Nomor utama: <span style="font-weight:600;color:var(--primary);">{{ gatewayConfig.nomor || '-' }}</span></p>
      </div>
      <button class="btn-primary-custom" style="background:var(--secondary);" :disabled="testing" @click="testConnection">
        <i class="bi bi-plug"></i> {{ testing ? 'Memeriksa...' : 'Tes Koneksi' }}
      </button>
    </div>

    <div v-if="loading" class="card"><div class="card-body" style="padding:48px;text-align:center;color:var(--text-muted);">Memuat data gateway...</div></div>

    <template v-else>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px;">
        <div class="stat-card blue"><div class="stat-icon blue"><i class="bi bi-send-check"></i></div><div class="stat-label">Pesan Terkirim</div><div class="stat-value">{{ stats.pesanTerkirim }}</div></div>
        <div class="stat-card green"><div class="stat-icon green"><i class="bi bi-graph-up-arrow"></i></div><div class="stat-label">Success Rate</div><div class="stat-value">{{ stats.successRate }}%</div></div>
        <div class="stat-card orange"><div class="stat-icon orange"><i class="bi bi-x-circle"></i></div><div class="stat-label">Gagal</div><div class="stat-value">{{ stats.gagal }}</div></div>
        <div class="stat-card cyan"><div class="stat-icon cyan"><i class="bi bi-chat-dots"></i></div><div class="stat-label">Pesan Hari Ini</div><div class="stat-value">{{ stats.pesanHariIni }}</div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="card">
          <div class="card-header"><i class="bi bi-send" style="color:var(--primary);"></i> Kirim Pesan Manual</div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:14px;">
            <div><label class="form-label-custom">Nama Tujuan</label><input v-model="namaTujuan" type="text" class="form-control-custom" placeholder="Opsional" /></div>
            <div><label class="form-label-custom">Nomor Tujuan</label><input v-model="nomorTujuan" type="text" class="form-control-custom" placeholder="08xxxxxxxxxx" /></div>
            <div><label class="form-label-custom">Pesan</label><textarea v-model="pesanManual" class="form-control-custom" rows="4" placeholder="Tulis pesan di sini..."></textarea></div>
            <button class="btn-primary-custom" style="background:#25D366;justify-content:center;padding:10px;" :disabled="sending" @click="sendMessage">
              <i class="bi bi-whatsapp"></i> {{ sending ? 'Mengirim...' : 'Kirim Pesan WhatsApp' }}
            </button>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="card">
            <div class="card-header"><i class="bi bi-gear" style="color:var(--primary);"></i> Konfigurasi Gateway</div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:14px;">
              <div><label class="form-label-custom">Nomor Pengirim</label><input v-model="gatewayConfig.nomor" type="text" class="form-control-custom" /></div>
              <div><label class="form-label-custom">API Key</label><input v-model="gatewayConfig.apiKey" type="password" class="form-control-custom text-mono" /></div>
              <div><label class="form-label-custom">Provider</label>
                <select v-model="gatewayConfig.provider" class="form-control-custom">
                  <option value="WABLAS">WABLAS</option>
                  <option value="WATI">WATI</option>
                  <option value="QONTAK">QONTAK</option>
                  <option value="TWILIO">TWILIO</option>
                </select>
              </div>
              <div><label class="form-label-custom">Template Auto Reply</label><textarea v-model="gatewayConfig.autoReply" class="form-control-custom" rows="3"></textarea></div>
              <label style="display:flex;gap:8px;align-items:center;"><input v-model="gatewayConfig.isAktif" type="checkbox" /> Gateway aktif</label>
              <button class="btn-outline-custom" style="justify-content:center;" :disabled="saving" @click="saveConfig">
                <i class="bi bi-check-lg"></i> {{ saving ? 'Menyimpan...' : 'Simpan Konfigurasi' }}
              </button>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><i class="bi bi-clock-history" style="color:var(--primary);"></i> Riwayat Pengiriman</div>
            <div v-if="riwayat.length === 0" class="card-body" style="padding:32px;text-align:center;color:var(--text-muted);">Belum ada riwayat pengiriman.</div>
            <div v-else class="table-responsive" style="padding:0;">
              <table class="table-custom">
                <thead>
                  <tr><th>Kepada</th><th>Pesan</th><th style="text-align:center;">Waktu</th><th style="text-align:center;">Status</th></tr>
                </thead>
                <tbody>
                  <tr v-for="item in riwayat" :key="item.Id">
                    <td style="font-weight:600;font-size:12px;">{{ item.NamaTujuan || item.NomorTujuan }}</td>
                    <td style="font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ item.Pesan }}</td>
                    <td style="text-align:center;">{{ formatDateTime(item.CreatedAt) }}</td>
                    <td style="text-align:center;"><span :class="['badge-status', badgeWa(item.StatusKirim)]">{{ item.StatusKirim }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
