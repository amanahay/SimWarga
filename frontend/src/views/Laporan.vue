<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { neracaAPI, tagihanIuranAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import { Loader2, Wallet, PieChart, Printer } from 'lucide-vue-next'

const app = useAppStore()
const loading = ref(true)
const neraca = ref({})
const iuranStats = ref({ total: 0, lunas: 0, belum: 0 })
const tahun = ref(new Date().getFullYear())
const bulan = ref(new Date().getMonth() + 1)

const bulanList = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
]

const tahunOptions = Array.from({length:6},(_,i)=>2025+i)

function formatRp(n) { return 'Rp ' + Number(n||0).toLocaleString('id-ID') }
function periode() { return `${tahun.value}-${String(bulan.value).padStart(2,'0')}` }

async function fetchData() {
  loading.value = true
  try {
    const [nr, ti] = await Promise.all([neracaAPI.get({params:{periode:periode()}}), tagihanIuranAPI.list({limit:999})])
    neraca.value = nr.data
    const all = ti.data.data || []
    iuranStats.value = { total: all.reduce((s,t)=>s+(t.Nominal||0),0), lunas: all.filter(t=>t.StatusTagihan==='Lunas').reduce((s,t)=>s+(t.Nominal||0),0), belum: all.filter(t=>t.StatusTagihan==='Belum').reduce((s,t)=>s+(t.Nominal||0),0) }
  } catch(e) {}
  finally { loading.value = false }
}

function printLaporan() {
  const n = neraca.value; const i = iuranStats.value
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Laporan ${n.periode}</title>
<style>@page{size:A4;margin:15mm}body{font-family:Arial;font-size:13px;color:#1e293b}h2{text-align:center;margin-bottom:2px}.sub{text-align:center;font-size:11px;color:#64748b;margin-bottom:16px}h3{font-size:14px;margin:14px 0 6px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px}.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px}.total{font-weight:700;font-size:14px;padding-top:6px}.green{color:#059669}.red{color:#dc2626}.bar{height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden;margin:8px 0}.bar div{height:100%;background:#059669;border-radius:5px}
</style></head><body>
<h2>LAPORAN KEUANGAN & IURAN</h2><div class="sub">Periode: ${n.periode}</div>
<h3>Ringkasan Keuangan</h3><div class="card">
<div class="row"><span>Pemasukan Air</span><span class="green">+ Rp ${Number(n.pemasukanAir||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Pemasukan Iuran</span><span class="green">+ Rp ${Number(n.pemasukanIuran||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Pemasukan Jurnal Lain</span><span class="green">+ Rp ${Number(n.pemasukanLain||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Pengeluaran Kas Operasional</span><span class="red">- Rp ${Number(n.pengeluaran||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Pengeluaran Jurnal Lain</span><span class="red">- Rp ${Number(n.pengeluaranLain||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Total Hutang (Jurnal)</span><span style="color:#d97706">Rp ${Number(n.hutang||0).toLocaleString('id-ID')}</span></div>
<div class="row total"><span>SALDO KAS</span><span class="${n.saldo>=0?'green':'red'}">Rp ${Number(n.saldo||0).toLocaleString('id-ID')}</span></div>
</div>
<h3>Kolektibilitas Iuran</h3><div class="card">
<div class="row"><span>Total Tagihan</span><span>Rp ${Number(i.total||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Lunas</span><span class="green">Rp ${Number(i.lunas||0).toLocaleString('id-ID')}</span></div>
<div class="row"><span>Belum</span><span class="red">Rp ${Number(i.belum||0).toLocaleString('id-ID')}</span></div>
<div class="bar"><div style="width:${i.total?Math.round(i.lunas/i.total*100):0}%"></div></div>
<div style="font-size:11px;color:#64748b">${i.total?Math.round(i.lunas/i.total*100):0}% lunas</div>
</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
</body></html>`
  const w = window.open('','_blank','width=900,height=600')
  w.document.write(html); w.document.close()
}

watch([tahun, bulan], fetchData)
onMounted(()=>{ app.setPage('laporan'); fetchData() })
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Laporan</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Laporan keuangan & iuran periode {{ neraca.periode || '-' }}</p>
      </div>
      <div class="flex gap-2 items-end">
        <div style="min-width:80px"><label class="form-label-custom">Bulan</label><select v-model="bulan" class="form-control-custom" style="font-size:12px"><option v-for="b in bulanList" :key="b.value" :value="b.value">{{ b.label }}</option></select></div>
        <div style="min-width:80px"><label class="form-label-custom">Tahun</label><select v-model="tahun" class="form-control-custom" style="font-size:12px"><option v-for="y in tahunOptions" :key="y" :value="y">{{ y }}</option></select></div>
        <Button variant="outline" size="sm" class="text-xs h-9 px-3" @click="printLaporan"><Printer class="h-3.5 w-3.5" /> Print</Button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Loader2 class="h-8 w-8 animate-spin text-indigo-600" /></div>

    <template v-else>
      <h3 class="text-base font-bold mb-3" style="color: var(--text-primary);"><Wallet class="h-4 w-4 inline mr-1" /> Ringkasan Keuangan</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="rounded-xl border p-4 shadow-sm" style="background: var(--secondary-soft); border-color: rgba(46, 125, 50, 0.3);"><div class="text-xs font-medium" style="color: var(--secondary);">Total Pemasukan</div><div class="text-lg font-bold mt-1" style="color: var(--secondary);">{{ formatRp(neraca.totalPemasukan) }}</div></div>
        <div class="rounded-xl border p-4 shadow-sm" style="background: var(--danger-soft); border-color: rgba(198, 40, 40, 0.3);"><div class="text-xs font-medium" style="color: var(--danger);">Total Pengeluaran</div><div class="text-lg font-bold mt-1" style="color: var(--danger);">{{ formatRp(neraca.totalPengeluaran) }}</div></div>
        <div class="rounded-xl border p-4 shadow-sm" style="background: var(--warning-soft); border-color: rgba(245, 124, 0, 0.3);"><div class="text-xs font-medium" style="color: var(--warning);">Total Hutang</div><div class="text-lg font-bold mt-1" style="color: var(--warning);">{{ formatRp(neraca.hutang) }}</div></div>
        <div class="rounded-xl border p-4 shadow-sm" style="background: var(--primary-soft); border-color: rgba(21, 101, 192, 0.3);"><div class="text-xs font-medium" style="color: var(--primary);">Saldo Kas</div><div class="text-lg font-bold mt-1" style="color: var(--primary);">{{ formatRp(neraca.saldo) }}</div></div>
      </div>

      <h3 class="text-base font-bold mb-3" style="color: var(--text-primary);"><PieChart class="h-4 w-4 inline mr-1" /> Kolektibilitas Iuran</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div class="rounded-xl border p-4 shadow-sm" style="background: var(--primary-soft); border-color: rgba(21, 101, 192, 0.3);"><div class="text-xs font-medium" style="color: var(--primary);">Total Tagihan</div><div class="text-lg font-bold mt-1" style="color: var(--primary);">{{ formatRp(iuranStats.total) }}</div></div>
        <div class="rounded-xl border p-4 shadow-sm" style="background: var(--secondary-soft); border-color: rgba(46, 125, 50, 0.3);"><div class="text-xs font-medium" style="color: var(--secondary);">Sudah Lunas</div><div class="text-lg font-bold mt-1" style="color: var(--secondary);">{{ formatRp(iuranStats.lunas) }}</div></div>
        <div class="rounded-xl border p-4 shadow-sm" style="background: var(--danger-soft); border-color: rgba(198, 40, 40, 0.3);"><div class="text-xs font-medium" style="color: var(--danger);">Belum Lunas</div><div class="text-lg font-bold mt-1" style="color: var(--danger);">{{ formatRp(iuranStats.belum) }}</div></div>
      </div>
      <div class="card p-4 mb-6">
        <div style="height:12px;background:#e2e8f0;border-radius:6px;overflow:hidden">
          <div :style="{width: iuranStats.total ? (iuranStats.lunas/iuranStats.total*100)+'%' : '0%', height:'100%', background:'#059669', borderRadius:'6px', transition:'width .3s'}"></div>
        </div>
        <div class="flex justify-between text-xs mt-2 text-slate-500">
          <span>{{ iuranStats.total ? Math.round(iuranStats.lunas/iuranStats.total*100) : 0 }}% lunas</span>
          <span>{{ formatRp(iuranStats.lunas) }} / {{ formatRp(iuranStats.total) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>
