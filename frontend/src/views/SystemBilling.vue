<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { saasAPI } from '@/services/api'

const app = useAppStore()

const loading = ref(false)
const generating = ref(false)
const search = ref('')
const billings = ref([])
const stats = ref({
  totalTagihan: 0,
  sudahDibayar: 0,
  menungguBayar: 0,
  tenantDitagih: 0,
})

const filteredBillings = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return billings.value.filter((item) => {
    if (!keyword) return true
    return [item.tenant, item.kodeTenant, item.periode, item.status]
      .some((value) => String(value || '').toLowerCase().includes(keyword))
  })
})

function formatRp(value) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`
}

function formatPeriod(value) {
  if (!value) return '-'
  const [year, month] = String(value).split('-')
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1, 1))
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(String(value).replace(' ', 'T')))
}

function badgeBilling(status) {
  if (status === 'Dibayar') return 'lunas'
  if (status === 'Jatuh Tempo') return 'belum'
  return 'pending'
}

async function fetchBillings() {
  loading.value = true
  try {
    const res = await saasAPI.systemBillings()
    billings.value = res.data.data || []
    stats.value = res.data.stats || stats.value
  } catch (e) {
    app.showToast(e.response?.data?.error || 'Gagal memuat tagihan sistem', 'danger', 'bi-exclamation-triangle')
  } finally {
    loading.value = false
  }
}

async function generateBillings() {
  generating.value = true
  try {
    const period = new Date().toISOString().slice(0, 7)
    const res = await saasAPI.generateBillings({ period, dueDate: `${period}-25` })
    app.showToast(`Generate tagihan selesai untuk ${res.data.generated} tenant`, 'success', 'bi-check-circle')
    await fetchBillings()
  } catch (e) {
    app.showToast(e.response?.data?.error || 'Gagal generate tagihan sistem', 'danger', 'bi-exclamation-triangle')
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  app.setPage('system-billing')
  fetchBillings()
})
</script>

<template>
  <div>
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 class="page-title">Tagihan Sistem</h1>
        <p class="page-subtitle">Tagihan fee SaaS berdasarkan data tenant dan transaksi nyata</p>
      </div>
      <button class="btn-primary-custom" :disabled="generating" @click="generateBillings">
        <i class="bi bi-plus-circle"></i> {{ generating ? 'Memproses...' : 'Generate Tagihan' }}
      </button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px;">
      <div class="stat-card blue">
        <div class="stat-icon blue"><i class="bi bi-receipt"></i></div>
        <div class="stat-label">Total Tagihan</div>
        <div class="stat-value">{{ formatRp(stats.totalTagihan) }}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon green"><i class="bi bi-check-circle"></i></div>
        <div class="stat-label">Sudah Dibayar</div>
        <div class="stat-value">{{ formatRp(stats.sudahDibayar) }}</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon orange"><i class="bi bi-clock-history"></i></div>
        <div class="stat-label">Menunggu Bayar</div>
        <div class="stat-value">{{ formatRp(stats.menungguBayar) }}</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-icon cyan"><i class="bi bi-buildings"></i></div>
        <div class="stat-label">Tenant Ditagih</div>
        <div class="stat-value">{{ stats.tenantDitagih }}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-body">
        <label class="form-label-custom">Pencarian</label>
        <div class="search-wrap">
          <i class="bi bi-search search-icon"></i>
          <input v-model="search" type="text" class="form-control-custom search-input" placeholder="Cari tenant, periode, atau status..." />
        </div>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="card-body" style="padding:48px;text-align:center;color:var(--text-muted);">Memuat tagihan sistem...</div>
      <div v-else-if="filteredBillings.length === 0" class="card-body" style="padding:48px;text-align:center;color:var(--text-muted);">Belum ada tagihan sistem.</div>
      <div v-else class="table-responsive" style="padding:0;">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Periode</th>
              <th>Tenant</th>
              <th style="text-align:right;">Dasar</th>
              <th style="text-align:center;">Warga</th>
              <th style="text-align:center;">Transaksi</th>
              <th style="text-align:right;">Total</th>
              <th>Jatuh Tempo</th>
              <th style="text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredBillings" :key="item.id">
              <td><span class="chip">{{ formatPeriod(item.periode) }}</span></td>
              <td>
                <div style="font-weight:700;">{{ item.tenant }}</div>
                <div style="font-size:12px;color:var(--text-muted);">{{ item.kodeTenant }}</div>
              </td>
              <td style="text-align:right;" class="text-mono">{{ formatRp(item.dasarTagihan) }}</td>
              <td style="text-align:center;">{{ item.jumlahWarga }}</td>
              <td style="text-align:center;">{{ item.jumlahTransaksi }}</td>
              <td style="text-align:right;font-weight:700;" class="text-mono">{{ formatRp(item.totalTagihan) }}</td>
              <td>{{ formatDate(item.jatuhTempo) }}</td>
              <td style="text-align:center;">
                <span :class="['badge-status', badgeBilling(item.status)]">{{ item.status }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
