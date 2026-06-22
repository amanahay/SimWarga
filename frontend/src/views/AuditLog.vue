<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { auditAPI } from '@/services/api'
import { Loader2 } from 'lucide-vue-next'

const app = useAppStore()

const loading = ref(false)
const search = ref('')
const filterUser = ref('')
const filterAction = ref('')
const auditData = ref([])

const userOptions = computed(() =>
  [...new Set(auditData.value.map((item) => item.user).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
)
const actionOptions = computed(() =>
  [...new Set(auditData.value.map((item) => item.aksi).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
)

const filteredAuditData = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return auditData.value.filter((item) => {
    if (filterUser.value && item.user !== filterUser.value) return false
    if (filterAction.value && item.aksi !== filterAction.value) return false
    if (!keyword) return true
    return [
      item.user,
      item.aksi,
      item.modul,
      item.detail,
      item.ip,
    ].some((value) => String(value || '').toLowerCase().includes(keyword))
  })
})

function aksiColor(aksi) {
  const map = {
    CREATE: { bg: '#10b981', color: '#fff' },
    UPDATE: { bg: '#3b82f6', color: '#fff' },
    LOGIN: { bg: '#0891b2', color: '#fff' },
    GENERATE: { bg: '#8b5cf6', color: '#fff' },
    DELETE: { bg: '#ef4444', color: '#fff' },
    REGISTER: { bg: '#14b8a6', color: '#fff' },
  }
  return map[aksi] || { bg: '#94a3b8', color: '#fff' }
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(String(value).replace(' ', 'T')))
}

function mapAuditRow(item) {
  return {
    id: item.Id,
    waktu: formatDateTime(item.CreatedAt),
    user: item.Username || 'System',
    aksi: item.Aksi || '-',
    modul: item.Modul || '-',
    detail: item.Keterangan || item.RecordId || '-',
    ip: item.IpAddress || '-',
  }
}

async function fetchAudit() {
  loading.value = true
  try {
    const res = await auditAPI.list()
    auditData.value = (res.data.data || []).map(mapAuditRow)
  } catch (e) {
    app.showToast(e.response?.data?.error || e.message || 'Gagal memuat audit log', 'danger', 'bi-exclamation-triangle')
  } finally {
    loading.value = false
  }
}

function escapeCsv(value) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function exportAudit() {
  const rows = filteredAuditData.value
  if (rows.length === 0) {
    app.showToast('Tidak ada data audit untuk diekspor', 'warning', 'bi-download')
    return
  }

  const header = ['Waktu', 'User', 'Aksi', 'Modul', 'Detail', 'IP']
  const lines = [
    header.join(','),
    ...rows.map((item) => [
      escapeCsv(item.waktu),
      escapeCsv(item.user),
      escapeCsv(item.aksi),
      escapeCsv(item.modul),
      escapeCsv(item.detail),
      escapeCsv(item.ip),
    ].join(',')),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  link.href = url
  link.download = `audit-log-${stamp}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  app.showToast('Audit log berhasil diekspor ke CSV', 'success', 'bi-download')
}

onMounted(() => {
  app.setPage('audit')
  fetchAudit()
})
</script>

<template>
  <div>
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 class="page-title">Audit Log</h1>
        <p class="page-subtitle">Pantau semua aktivitas pengguna dalam sistem</p>
      </div>
      <button class="btn-outline-custom" @click="exportAudit">
        <i class="bi bi-download"></i> Export
      </button>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-body" style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;">
          <label class="form-label-custom">Cari</label>
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input v-model="search" type="text" class="form-control-custom search-input" placeholder="Cari aksi, modul, atau detail..." />
          </div>
        </div>
        <div style="min-width:180px;">
          <label class="form-label-custom">User</label>
          <select v-model="filterUser" class="form-control-custom">
            <option value="">Semua User</option>
            <option v-for="user in userOptions" :key="user" :value="user">{{ user }}</option>
          </select>
        </div>
        <div style="min-width:160px;">
          <label class="form-label-custom">Aksi</label>
          <select v-model="filterAction" class="form-control-custom">
            <option value="">Semua Aksi</option>
            <option v-for="aksi in actionOptions" :key="aksi" :value="aksi">{{ aksi }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="card-body" style="display:flex;align-items:center;justify-content:center;padding:48px;">
        <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
      </div>
      <div v-else-if="filteredAuditData.length === 0" class="card-body" style="padding:48px;text-align:center;color:var(--text-muted);">
        Belum ada data audit log.
      </div>
      <div v-else class="table-responsive" style="padding:0;">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>User</th>
              <th style="text-align:center;">Aksi</th>
              <th>Modul</th>
              <th>Detail</th>
              <th class="text-mono">IP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredAuditData" :key="item.id">
              <td>{{ item.waktu }}</td>
              <td style="font-weight:600;">{{ item.user }}</td>
              <td style="text-align:center;">
                <span
                  class="chip"
                  :style="{ background: aksiColor(item.aksi).bg, color: aksiColor(item.aksi).color, fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px' }"
                >{{ item.aksi }}</span>
              </td>
              <td>{{ item.modul }}</td>
              <td style="font-size:12px;color:var(--text-muted);">{{ item.detail }}</td>
              <td class="text-mono">{{ item.ip }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
