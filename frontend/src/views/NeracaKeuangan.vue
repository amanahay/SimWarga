<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { neracaAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import { Loader2, Droplet, Banknote, TrendingDown, Printer, BookOpen, AlertCircle } from 'lucide-vue-next'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const app = useAppStore()
const loading = ref(true)
const data = ref({})
const tahun = ref(new Date().getFullYear())
const bulan = ref(new Date().getMonth() + 1)

const tahunOptions = Array.from({length:6},(_,i)=>2025+i)
const bulanNames = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const bulanList = bulanNames.slice(1).map((l,i)=>({label:l,value:i+1}))
const showAll = ref(false)

const chartTab = ref('Summary')
let chartInstance = null

function formatRp(n) { return 'Rp ' + Number(n||0).toLocaleString('id-ID') }
function periode() { return `${tahun.value}-${String(bulan.value).padStart(2,'0')}` }

async function fetchData() {
  loading.value = true
  try {
    const p = showAll.value ? {} : { periode: periode() }
    const res = await neracaAPI.get({ params: p })
    data.value = res.data
    setTimeout(updateChart, 80)
  } catch(e) {}
  finally { loading.value = false }
}

function toggleShowAll() {
  showAll.value = !showAll.value
  fetchData()
}

function setChartTab(t) {
  chartTab.value = t
  setTimeout(updateChart, 0)
}

function updateChart() {
  const ctx = document.getElementById('neracaChart')
  if (!ctx) return
  
  if (chartInstance) {
    chartInstance.destroy()
  }
  
  const d = data.value
  if (!d) return

  if (chartTab.value === 'Summary') {
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Pemasukan', 'Pengeluaran', 'Hutang', 'Saldo Akhir'],
        datasets: [{
          label: 'Nominal',
          data: [
            d.totalPemasukan || 0,
            d.totalPengeluaran || 0,
            d.hutang || 0,
            d.saldo || 0
          ],
          backgroundColor: [
            'rgba(16, 185, 129, 0.75)', // emerald
            'rgba(239, 68, 68, 0.75)',  // red
            'rgba(245, 158, 11, 0.75)',  // amber
            d.saldo >= 0 ? 'rgba(59, 130, 246, 0.75)' : 'rgba(239, 68, 68, 0.75)'
          ],
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => 'Rp ' + Number(ctx.raw).toLocaleString('id-ID')
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: {
              callback: (val) => 'Rp ' + Number(val).toLocaleString('id-ID', { maximumFractionDigits: 0 })
            }
          },
          x: { grid: { display: false } }
        }
      }
    })
  } else if (chartTab.value === 'Pemasukan') {
    const totalPemasukan = (d.pemasukanAir || 0) + (d.pemasukanIuran || 0) + (d.pemasukanLain || 0)
    
    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pemasukan Air', 'Pemasukan Iuran', 'Pemasukan Lain'],
        datasets: [{
          data: [
            d.pemasukanAir || 0,
            d.pemasukanIuran || 0,
            d.pemasukanLain || 0
          ],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(16, 185, 129, 0.8)'
          ],
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw
                const pct = totalPemasukan ? Math.round((val / totalPemasukan) * 100) : 0
                return `Rp ${Number(val).toLocaleString('id-ID')} (${pct}%)`
              }
            }
          }
        }
      }
    })
  }
}

function printLaporan() {
  const d = data.value
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Neraca ${d.periode}</title>
<style>@page{size:A4;margin:15mm}body{font-family:Arial;font-size:13px;color:#1e293b}
h2{text-align:center;margin-bottom:2px}.sub{text-align:center;font-size:11px;color:#64748b;margin-bottom:16px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:10px}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
.total{font-weight:700;font-size:15px;padding-top:8px}
.green{color:#059669}.red{color:#dc2626}.blue{color:#1e40af}.amber{color:#b45309}
</style></head><body>
<h2>NERACA KEUANGAN</h2><div class="sub">Periode: ${d.periode}</div>
<div class="card">
<div class="row"><span>Pemasukan Air</span><span class="green">+ Rp ${Number(d.pemasukanAir||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Pemasukan Iuran</span><span class="green">+ Rp ${Number(d.pemasukanIuran||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Pemasukan Jurnal Lain</span><span class="green">+ Rp ${Number(d.pemasukanLain||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Pengeluaran Kas Operasional</span><span class="red">- Rp ${Number(d.pengeluaran||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Pengeluaran Jurnal Lain</span><span class="red">- Rp ${Number(d.pengeluaranLain||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Total Hutang (Jurnal)</span><span class="amber">Rp ${Number(d.hutang||0).toLocaleString('id-ID')}</span></div>
<div class="row total"><span>SALDO AKHIR</span><span class="${d.saldo>=0?'green':'red'}">Rp ${Number(d.saldo||0).toLocaleString('id-ID')}</span></div>
</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
</body></html>`
  const w = window.open('','_blank','width=900,height=600')
  w.document.write(html); w.document.close()
}

watch([tahun, bulan], fetchData)
onMounted(()=>{ app.setPage('neraca'); fetchData() })
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Neraca Keuangan</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Ringkasan keuangan periode {{ data.periode || '-' }}</p>
      </div>
      <div class="flex gap-2 items-end">
        <div style="min-width:90px" v-if="!showAll"><label class="form-label-custom">Bulan</label><select v-model="bulan" class="form-control-custom" style="font-size:12px"><option v-for="b in bulanList" :key="b.value" :value="b.value">{{ b.label }}</option></select></div>
        <div style="min-width:80px" v-if="!showAll"><label class="form-label-custom">Tahun</label><select v-model="tahun" class="form-control-custom" style="font-size:12px"><option v-for="y in tahunOptions" :key="y" :value="y">{{ y }}</option></select></div>
        <Button :variant="showAll ? 'success' : 'outline'" size="sm" class="text-xs h-9 px-3" @click="toggleShowAll">{{ showAll ? 'Semua (aktif)' : 'Semua' }}</Button>
        <Button variant="outline" size="sm" class="text-xs h-9 px-3" @click="printLaporan"><Printer class="h-3.5 w-3.5" /> Print</Button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Loader2 class="h-8 w-8 animate-spin text-indigo-600" /></div>

    <template v-else>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="rounded-xl border p-4 shadow-sm" style="background: var(--secondary-soft); border-color: rgba(46, 125, 50, 0.3);"><div class="text-xs font-medium" style="color: var(--secondary);">Total Pemasukan</div><div class="text-lg font-bold mt-1" style="color: var(--secondary);">{{ formatRp(data.totalPemasukan) }}</div></div>
        <div class="rounded-xl border p-4 shadow-sm" style="background: var(--danger-soft); border-color: rgba(198, 40, 40, 0.3);"><div class="text-xs font-medium" style="color: var(--danger);">Total Pengeluaran</div><div class="text-lg font-bold mt-1" style="color: var(--danger);">{{ formatRp(data.totalPengeluaran) }}</div></div>
        <div class="rounded-xl border p-4 shadow-sm" style="background: var(--warning-soft); border-color: rgba(245, 124, 0, 0.3);"><div class="text-xs font-medium" style="color: var(--warning);">Total Hutang</div><div class="text-lg font-bold mt-1" style="color: var(--warning);">{{ formatRp(data.hutang) }}</div></div>
        <div class="rounded-xl border p-4 shadow-sm" style="background: var(--primary-soft); border-color: rgba(21, 101, 192, 0.3);"><div class="text-xs font-medium" style="color: var(--primary);">Saldo Bersih</div><div class="text-lg font-bold mt-1" style="color: var(--primary);">{{ formatRp(data.saldo) }}</div></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Rincian Card -->
        <div class="card p-6">
          <h3 class="text-base font-bold mb-4" style="color: var(--text-primary);">Rincian {{ data.periode || '-' }}</h3>
          <div class="space-y-3">
            <div class="flex justify-between text-sm py-2" style="border-bottom:1px solid var(--border)">
              <span class="flex items-center gap-2" style="color: var(--text-primary);"><Droplet class="h-4 w-4" style="color:#3b82f6" /> Pembayaran Air</span>
              <span class="font-semibold" style="color:#059669">+ {{ formatRp(data.pemasukanAir) }}</span>
            </div>
            <div class="flex justify-between text-sm py-2" style="border-bottom:1px solid var(--border)">
              <span class="flex items-center gap-2" style="color: var(--text-primary);"><Banknote class="h-4 w-4" style="color:#f59e0b" /> Pembayaran Iuran</span>
              <span class="font-semibold" style="color:#059669">+ {{ formatRp(data.pemasukanIuran) }}</span>
            </div>
            <div class="flex justify-between text-sm py-2" style="border-bottom:1px solid var(--border)">
              <span class="flex items-center gap-2" style="color: var(--text-primary);"><BookOpen class="h-4 w-4" style="color:#10b981" /> Pemasukan Jurnal Lain</span>
              <span class="font-semibold" style="color:#059669">+ {{ formatRp(data.pemasukanLain) }}</span>
            </div>
            <div class="flex justify-between text-sm py-2" style="border-bottom:1px solid var(--border)">
              <span class="flex items-center gap-2" style="color: var(--text-primary);"><TrendingDown class="h-4 w-4" style="color:#ef4444" /> Pengeluaran Kas Operasional</span>
              <span class="font-semibold" style="color:#dc2626">- {{ formatRp(data.pengeluaran) }}</span>
            </div>
            <div class="flex justify-between text-sm py-2" style="border-bottom:1px solid var(--border)">
              <span class="flex items-center gap-2" style="color: var(--text-primary);"><TrendingDown class="h-4 w-4" style="color:#f43f5e" /> Pengeluaran Jurnal Lain</span>
              <span class="font-semibold" style="color:#dc2626">- {{ formatRp(data.pengeluaranLain) }}</span>
            </div>
            <div class="flex justify-between text-sm py-2" style="border-bottom:1px solid var(--border)">
              <span class="flex items-center gap-2" style="color: var(--text-primary);"><AlertCircle class="h-4 w-4" style="color:#d97706" /> Total Hutang (Jurnal)</span>
              <span class="font-semibold" style="color:#d97706">{{ formatRp(data.hutang) }}</span>
            </div>
            <div class="flex justify-between text-base font-bold pt-2">
              <span style="color: var(--text-primary);">Saldo Akhir</span>
              <span :style="{ color: data.saldo >= 0 ? '#059669' : '#dc2626' }">{{ formatRp(data.saldo) }}</span>
            </div>
          </div>
        </div>

        <!-- Grafik Keuangan -->
        <div class="card p-6 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold" style="color: var(--text-primary);">Visualisasi Keuangan</h3>
            <div class="flex gap-1.5">
              <button 
                v-for="t in ['Summary', 'Pemasukan']" 
                :key="t"
                class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all"
                :class="chartTab === t
                  ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'"
                @click="setChartTab(t)"
              >
                {{ t }}
              </button>
            </div>
          </div>
          <div style="position: relative; height: 260px; width: 100%;" class="flex items-center justify-center">
            <canvas id="neracaChart"></canvas>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
