<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { neracaAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import { Loader2, Droplet, Banknote, TrendingDown, Printer } from 'lucide-vue-next'

const app = useAppStore()
const loading = ref(true)
const data = ref({})
const tahun = ref(new Date().getFullYear())
const bulan = ref(new Date().getMonth() + 1)

const tahunOptions = Array.from({length:6},(_,i)=>2025+i)
const bulanNames = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const bulanList = bulanNames.slice(1).map((l,i)=>({label:l,value:i+1}))
const showAll = ref(false)

function formatRp(n) { return 'Rp ' + Number(n||0).toLocaleString('id-ID') }
function periode() { return `${tahun.value}-${String(bulan.value).padStart(2,'0')}` }

async function fetchData() {
  loading.value = true
  try {
    const p = showAll.value ? {} : { periode: periode() }
    const res = await neracaAPI.get({ params: p })
    data.value = res.data
  } catch(e) {}
  finally { loading.value = false }
}

function toggleShowAll() {
  showAll.value = !showAll.value
  // fetch data immediately after toggling to refresh the view
  fetchData()
}

function printLaporan() {
  const d = data.value
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Neraca ${d.periode}</title>
<style>@page{size:A4;margin:15mm}body{font-family:Arial;font-size:13px;color:#1e293b}
h2{text-align:center;margin-bottom:2px}.sub{text-align:center;font-size:11px;color:#64748b;margin-bottom:16px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:10px}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
.total{font-weight:700;font-size:15px;padding-top:8px}
.green{color:#059669}.red{color:#dc2626}.blue{color:#1e40af}
</style></head><body>
<h2>NERACA KEUANGAN</h2><div class="sub">Periode: ${d.periode}</div>
<div class="card">
<div class="row"><span>Pemasukan Air</span><span class="green">+ Rp ${Number(d.pemasukanAir||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Pemasukan Iuran</span><span class="green">+ Rp ${Number(d.pemasukanIuran||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Total Pengeluaran</span><span class="red">- Rp ${Number(d.pengeluaran||0).toLocaleString('id-ID')}</span></div>
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
        <div class="rounded-xl border p-4 shadow-sm" style="background:#ecfdf5;border-color:#a7f3d0"><div class="text-xs font-medium" style="color:#065f46">Pemasukan Air</div><div class="text-lg font-bold mt-1" style="color:#065f46">{{ formatRp(data.pemasukanAir) }}</div></div>
        <div class="rounded-xl border p-4 shadow-sm" style="background:#eff6ff;border-color:#bfdbfe"><div class="text-xs font-medium" style="color:#1e40af">Pemasukan Iuran</div><div class="text-lg font-bold mt-1" style="color:#1e40af">{{ formatRp(data.pemasukanIuran) }}</div></div>
        <div class="rounded-xl border p-4 shadow-sm" style="background:#fef2f2;border-color:#fecaca"><div class="text-xs font-medium" style="color:#991b1b">Pengeluaran</div><div class="text-lg font-bold mt-1" style="color:#991b1b">{{ formatRp(data.pengeluaran) }}</div></div>
        <div class="rounded-xl border p-4 shadow-sm" style="background:#ecfeff;border-color:#a5f3fc"><div class="text-xs font-medium" style="color:#155e75">Saldo Bersih</div><div class="text-lg font-bold mt-1" style="color:#155e75">{{ formatRp(data.saldo) }}</div></div>
      </div>

      <div class="rounded-xl border p-6 shadow-sm" style="background:#ffffff;border-color:#e2e8f0">
        <h3 class="text-base font-bold mb-4" style="color:#0f172a">Rincian {{ data.periode || '-' }}</h3>
        <div class="space-y-3">
          <div class="flex justify-between text-sm py-2" style="border-bottom:1px solid #f1f5f9">
            <span class="flex items-center gap-2"><Droplet class="h-4 w-4" style="color:#3b82f6" /> Pembayaran Air</span>
            <span class="font-semibold" style="color:#059669">+ {{ formatRp(data.pemasukanAir) }}</span>
          </div>
          <div class="flex justify-between text-sm py-2" style="border-bottom:1px solid #f1f5f9">
            <span class="flex items-center gap-2"><Banknote class="h-4 w-4" style="color:#f59e0b" /> Pembayaran Iuran</span>
            <span class="font-semibold" style="color:#059669">+ {{ formatRp(data.pemasukanIuran) }}</span>
          </div>
          <div class="flex justify-between text-sm py-2" style="border-bottom:1px solid #f1f5f9">
            <span class="flex items-center gap-2"><TrendingDown class="h-4 w-4" style="color:#ef4444" /> Total Pengeluaran</span>
            <span class="font-semibold" style="color:#dc2626">- {{ formatRp(data.pengeluaran) }}</span>
          </div>
          <div class="flex justify-between text-base font-bold pt-2">
            <span style="color:#0f172a">Saldo Akhir</span>
            <span :style="{ color: data.saldo >= 0 ? '#059669' : '#dc2626' }">{{ formatRp(data.saldo) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
