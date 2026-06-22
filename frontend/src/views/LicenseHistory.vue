<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { saasAPI } from '@/services/api'

const app = useAppStore()

const loading = ref(false)
const search = ref('')
const historyItems = ref([])

const filteredItems = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return historyItems.value.filter((item) => {
    if (!keyword) return true
    return [item.tenant, item.aksi, item.keterangan, item.kodeLisensi, item.oleh]
      .some((value) => String(value || '').toLowerCase().includes(keyword))
  })
})

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(String(value).replace(' ', 'T')))
}

function escapeCsv(value) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

async function fetchHistory() {
  loading.value = true
  try {
    const res = await saasAPI.licenseHistory()
    historyItems.value = (res.data.data || []).map((item) => ({
      id: item.Id,
      tenant: item.NamaTenant,
      aksi: item.Aksi,
      keterangan: item.KeteranganAksi,
      kodeLisensi: item.KodeLisensi,
      tipeLisensi: item.TipeLisensi,
      tanggalMulai: item.TanggalMulai,
      tanggalExpiry: item.TanggalExpiry,
      oleh: item.OlehUsername || 'System',
      createdAt: item.CreatedAt,
    }))
  } catch (e) {
    app.showToast(e.response?.data?.error || 'Gagal memuat riwayat lisensi', 'danger', 'bi-exclamation-triangle')
  } finally {
    loading.value = false
  }
}

function exportHistory() {
  if (filteredItems.value.length === 0) {
    app.showToast('Tidak ada data riwayat untuk diekspor', 'warning', 'bi-download')
    return
  }
  const lines = [
    ['Tenant', 'Aksi', 'Keterangan', 'Kode Lisensi', 'Tipe', 'Mulai', 'Expiry', 'Oleh', 'Waktu'].join(','),
    ...filteredItems.value.map((item) => [
      escapeCsv(item.tenant),
      escapeCsv(item.aksi),
      escapeCsv(item.keterangan),
      escapeCsv(item.kodeLisensi),
      escapeCsv(item.tipeLisensi),
      escapeCsv(item.tanggalMulai),
      escapeCsv(item.tanggalExpiry),
      escapeCsv(item.oleh),
      escapeCsv(formatDate(item.createdAt)),
    ].join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `riwayat-lisensi-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  app.showToast('Riwayat lisensi berhasil diekspor', 'success', 'bi-download')
}

onMounted(() => {
  app.setPage('license-history')
  fetchHistory()
})
</script>

<template>
  <div>
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 class="page-title">Riwayat Lisensi</h1>
        <p class="page-subtitle">Riwayat aktivasi lisensi yang tersimpan di sistem</p>
      </div>
      <button class="btn-outline-custom" @click="exportHistory">
        <i class="bi bi-download"></i> Export
      </button>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-body">
        <label class="form-label-custom">Pencarian</label>
        <div class="search-wrap">
          <i class="bi bi-search search-icon"></i>
          <input v-model="search" type="text" class="form-control-custom search-input" placeholder="Cari tenant, kode lisensi, aksi, atau petugas..." />
        </div>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="card-body" style="padding:48px;text-align:center;color:var(--text-muted);">Memuat riwayat lisensi...</div>
      <div v-else-if="filteredItems.length === 0" class="card-body" style="padding:48px;text-align:center;color:var(--text-muted);">Belum ada riwayat lisensi.</div>
      <div v-else class="table-responsive" style="padding:0;">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Tenant</th>
              <th>Aksi</th>
              <th>Kode Lisensi</th>
              <th>Tipe</th>
              <th>Masa Berlaku</th>
              <th>Oleh</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id">
              <td>{{ formatDate(item.createdAt) }}</td>
              <td style="font-weight:700;">{{ item.tenant }}</td>
              <td><span class="chip">{{ item.aksi }}</span></td>
              <td class="text-mono">{{ item.kodeLisensi || '-' }}</td>
              <td>{{ item.tipeLisensi || '-' }}</td>
              <td style="font-size:12px;color:var(--text-muted);">{{ item.tanggalMulai || '-' }} s/d {{ item.tanggalExpiry || '-' }}</td>
              <td>{{ item.oleh }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
