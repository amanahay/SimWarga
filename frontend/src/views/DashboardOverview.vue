<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { dashboardAPI, tagihanAirAPI } from '@/services/api'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

const app = useAppStore()
const auth = useAuthStore()

const today = computed(() => {
  const d = new Date()
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
})

const stats = ref({
  totalWarga: 0,
  pelangganAir: 0,
  belumBayar: 0,
  pendapatanAir: 0,
  pendapatanIuran: 0,
})

const jatuhTempo = ref([])
const aktivitas = ref([])
const loading = ref(true)

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function badgeTagihan(status) {
  if (status === 'Lunas') return 'success'
  if (status === 'Belum') return 'danger'
  if (status === 'Sebagian') return 'warning'
  return 'secondary'
}

onMounted(async () => {
  app.setPage('dashboard')
  await loadData()
})

async function loadData() {
  try {
    // Load dashboard stats
    const statsRes = await dashboardAPI.stats()
    stats.value = statsRes.data

    // Load jatuh tempo (belum bayar & sebagian)
    const tagihanRes = await tagihanAirAPI.list({ status: 'Belum', limit: 10 })
    jatuhTempo.value = (tagihanRes.data?.data || []).map(t => ({
      pelanggan: t.NamaKepalaKK || 'N/A',
      alamat: t.Alamat || '-',
      tagihan: formatRupiah(t.TotalTagihan || 0),
      jatuhTempo: t.Periode || '-',
      status: t.StatusTagihan || 'Belum',
      totalTagihan: t.TotalTagihan || 0,
    }))

    // Mock aktivitas (bisa dikembangkan lebih lanjut dengan API)
    aktivitas.value = [
      { icon: 'bi-graph-up-arrow', text: 'Dashboard dimuat dengan data terbaru', time: 'Baru saja', amount: null },
      { icon: 'bi-check-circle', text: `Total ${stats.value.pelangganAir} pelanggan air terdaftar`, time: '1 jam lalu', amount: null },
      { icon: 'bi-people-fill', text: `${stats.value.totalWarga} warga terdaftar di sistem`, time: '2 jam lalu', amount: null },
    ]

    loading.value = false
    initCharts()
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    app.showToast('Gagal memuat data dashboard', 'danger', 'bi-exclamation-triangle')
    loading.value = false
  }
}

function initCharts() {
  const ctx1 = document.getElementById('chartAir')
  if (ctx1) {
    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
        datasets: [
          { label: 'Pemakaian Air (m³)', data: [210, 195, 225, 208, 240, 218], backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 6 },
          { label: 'Tagihan (Rp Juta)', data: [4.2, 3.9, 4.5, 4.1, 4.8, 4.3], backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { size: 11 } } } },
        scales: { y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.06)' } }, x: { grid: { display: false } } },
      },
    })
  }

  const ctx2 = document.getElementById('chartPie')
  if (ctx2) {
    // Calculate status distribution
    const totalTagihan = jatuhTempo.value.reduce((sum, item) => sum + (item.totalTagihan || 0), 0)
    const belumBayarCount = jatuhTempo.value.filter(t => t.status === 'Belum').length
    const sebagianCount = jatuhTempo.value.filter(t => t.status === 'Sebagian').length
    const lunasCount = Math.max(0, stats.value.pelangganAir - belumBayarCount - sebagianCount)

    new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['Lunas', 'Belum Bayar', 'Sebagian'],
        datasets: [{ data: [lunasCount, belumBayarCount, sebagianCount], backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(239,68,68,0.8)', 'rgba(245,158,11,0.8)'], borderWidth: 0, borderRadius: 4 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { size: 11 } } } },
      },
    })
  }
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-subtitle">Selamat datang, {{ auth.userName }} · {{ today }}</p>
    </div>

    <!-- Tenant Selector Card -->
    <div class="card" style="background: linear-gradient(135deg, #1d4ed8, #3b82f6); color: #fff; margin-bottom: 20px; border: none;">
      <div class="card-body" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="bi bi-geo-alt-fill" style="font-size: 22px;"></i>
          <div>
            <div style="font-weight: 700; font-size: 16px;">{{ auth.user?.NamaTenant || 'Tenant' }}</div>
            <div style="font-size: 13px; opacity: 0.85;">{{ auth.userRole || '' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stat Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
      <div class="stat-card blue">
        <div class="stat-icon blue"><i class="bi bi-people-fill"></i></div>
        <div class="stat-label">Total Warga</div>
        <div class="stat-value">{{ stats.totalWarga }}</div>
        <div class="stat-trend up"><i class="bi bi-arrow-up-short"></i> Aktif</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon green"><i class="bi bi-droplet-fill"></i></div>
        <div class="stat-label">Pelanggan Air</div>
        <div class="stat-value">{{ stats.pelangganAir }}</div>
        <div class="stat-trend up"><i class="bi bi-check-circle"></i> Terdaftar</div>
      </div>
      <div class="stat-card red">
        <div class="stat-icon red"><i class="bi bi-exclamation-triangle-fill"></i></div>
        <div class="stat-label">Belum Bayar</div>
        <div class="stat-value">{{ stats.belumBayar }}</div>
        <div class="stat-trend down"><i class="bi bi-cash-stack"></i> Menunggu</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-icon cyan"><i class="bi bi-graph-up-arrow"></i></div>
        <div class="stat-label">Pendapatan Bulan Ini</div>
        <div class="stat-value" style="font-size: 18px;">{{ formatRupiah(stats.pendapatanAir + stats.pendapatanIuran) }}</div>
        <div class="stat-trend up"><i class="bi bi-arrow-up-short"></i> Air + Iuran</div>
      </div>
    </div>

    <!-- Chart Cards -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 20px;">
      <div class="card">
        <div class="card-header">
          <i class="bi bi-bar-chart-fill" style="color: var(--primary);"></i> Tren Pemakaian & Tagihan Air
        </div>
        <div class="card-body" style="height: 280px; position: relative;">
          <canvas id="chartAir"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <i class="bi bi-pie-chart-fill" style="color: var(--primary);"></i> Status Pembayaran
        </div>
        <div class="card-body" style="height: 280px; position: relative;">
          <canvas id="chartPie"></canvas>
        </div>
      </div>
    </div>

    <!-- Jatuh Tempo Minggu Ini + Aktivitas -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <!-- Jatuh Tempo Table -->
      <div class="card">
        <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
          <span><i class="bi bi-calendar2-exclamation" style="color: var(--danger);"></i> Jatuh Tempo Minggu Ini</span>
          <button class="btn-icon" title="Lihat semua" @click="app.showToast('Lihat semua tagihan jatuh tempo', 'info', 'bi-calendar2-exclamation')">
            <i class="bi bi-arrow-right"></i>
          </button>
        </div>
        <div style="padding: 0; overflow-x: auto;">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Pelanggan</th>
                <th>Tagihan</th>
                <th style="text-align: center;">Jatuh Tempo</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="jatuhTempo.length === 0">
                <td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">Tidak ada tagihan jatuh tempo</td>
              </tr>
              <tr v-for="(item, i) in jatuhTempo" :key="i">
                <td>
                  <div style="font-weight: 600; font-size: 13px;">{{ item.pelanggan }}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">{{ item.alamat }}</div>
                </td>
                <td class="text-mono" style="font-weight: 600;">{{ item.tagihan }}</td>
                <td style="text-align: center; font-size: 12px;">{{ item.jatuhTempo }}</td>
                <td style="text-align: center;">
                  <span :class="['badge-status', badgeTagihan(item.status)]">{{ item.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Aktivitas Terbaru -->
      <div class="card">
        <div class="card-header">
          <i class="bi bi-activity" style="color: var(--primary);"></i> Aktivitas Terbaru
        </div>
        <div class="card-body">
          <div class="timeline">
            <div v-for="(item, i) in aktivitas" :key="i" class="tl-item">
              <div class="tl-dot" :style="{ background: item.amount ? 'var(--secondary)' : 'var(--primary)' }">
                <i :class="['bi', item.icon]" style="font-size: 10px; color: #fff;"></i>
              </div>
              <div style="flex: 1;">
                <div style="font-size: 13px; font-weight: 500;">{{ item.text }}</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">{{ item.time }}</div>
              </div>
              <div v-if="item.amount" class="chip" style="font-size: 11px; white-space: nowrap;">{{ item.amount }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
