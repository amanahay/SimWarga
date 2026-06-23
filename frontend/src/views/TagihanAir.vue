<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { tagihanAirAPI, tagihanIuranAPI, pembayaranAirAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Loader2, Droplet, Calendar, RefreshCw, Search, Printer, CreditCard, X } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()
const tagihan = ref([])
const iuranData = ref([])
const loading = ref(false)
const filterStatus = ref('')
const searchQuery = ref('')
const genTahun = ref(new Date().getFullYear())
const genBulan = ref(new Date().getMonth()+1)
const bulanOpt = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const bulanList = bulanOpt.slice(1).map((l,i)=>({label:l,value:i+1}))
const tahunOpt = Array.from({length:10},(_,i)=>new Date().getFullYear()+i)
const page = ref(1)
const perPage = 12

// Payment Modal States
const showPayModal = ref(false)
const payingItem = ref(null)
const paying = ref(false)
const metodeBayar = ref('Tunai')

function formatRp(n) { return 'Rp ' + Number(n||0).toLocaleString('id-ID') }
function badgeVariant(s) { if(s==='Lunas') return 'success'; if(s==='Belum') return 'destructive'; return 'warning' }

const filtered = computed(() => {
  let data = [...tagihan.value]
  if(filterStatus.value) data = data.filter(t => t.StatusTagihan === filterStatus.value)
  if(searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    data = data.filter(t => (t.NamaKepalaKK||'').toLowerCase().includes(q) || (t.NoMeteran||'').toLowerCase().includes(q))
  }
  return data
})
const totalPages = computed(() => Math.ceil(filtered.value.length / perPage))
const displayed = computed(() => filtered.value.slice((page.value-1)*perPage, page.value*perPage))

async function fetchData() {
  loading.value = true
  try {
    const [airRes, iurRes] = await Promise.all([tagihanAirAPI.list({}), tagihanIuranAPI.list({ status: 'Belum' })])
    tagihan.value = airRes.data.data || []
    iuranData.value = iurRes.data.data || []
  } catch(e) { toast({title:'Gagal',description:e.message,variant:'destructive'}) }
  finally { loading.value = false }
}

async function generateTagihan() {
  const per = `${genTahun.value}-${String(genBulan.value).padStart(2,'0')}`
  try {
    const res = await tagihanAirAPI.generate({ periode: per })
    toast({title:'Berhasil',description:`${res.data.generated} tagihan dibuat`,variant:'success'})
    fetchData()
  } catch(e) { toast({title:'Gagal',description:e.response?.data?.error||e.message,variant:'destructive'}) }
}

function goPage(p) { if(p>=1 && p<=totalPages.value) { page.value = p } }

function openBayar(item) {
  payingItem.value = item
  metodeBayar.value = 'Tunai'
  showPayModal.value = true
}

async function prosesBayar() {
  if (!payingItem.value) return
  paying.value = true
  try {
    await pembayaranAirAPI.create({
      TagihanAirId: payingItem.value.Id,
      JumlahBayar: payingItem.value.TotalTagihan,
      MetodeBayar: metodeBayar.value,
      Keterangan: 'Pembayaran Air otomatis dari halaman Tagihan Air'
    })
    toast({ title: 'Pembayaran berhasil', description: `Tagihan Air ${payingItem.value.NamaKepalaKK} - ${formatRp(payingItem.value.TotalTagihan)}`, variant: 'success' })
    showPayModal.value = false
    fetchData()
  } catch(e) {
    toast({ title: 'Gagal memproses pembayaran', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    paying.value = false
  }
}

function printTagihan(t) {
  const warga = t.NamaKepalaKK||'-'
  const alamat = t.Alamat||'-'
  const meter = t.NoMeteran||'-'
  const sebelum = t.StandAwal||0
  const sekarang = t.StandAkhir||0
  const pakai = t.Pemakaian||0
  const harga = t.HargaPerM3||0
  const periode = t.Periode||'-'
  const subtotal = t.TotalTagihan||0
  // Get iuran for this warga
  const wargaIuran = iuranData.value.filter(i => i.WargaId === t.WargaId && i.StatusTagihan === 'Belum')
  const totalIuran = wargaIuran.reduce((s,i)=>s+(i.Nominal||0),0)
  const grandTotal = subtotal + totalIuran
  const now = new Date().toLocaleString('id-ID')

  let iuranRows = wargaIuran.map(i => '<tr><td>'+i.NamaIuran+'</td><td>'+i.Periode+'</td><td style="text-align:right">'+Number(i.Nominal||0).toLocaleString('id-ID')+'</td></tr>').join('')

  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tagihan</title>'+
'<style>@page{size:A5;margin:8mm}body{font-family:Arial;font-size:12px;color:#000}'+
'h2{margin:0 0 2px;font-size:14px;text-align:center}.addr{font-size:10px;text-align:center;margin-bottom:8px}'+
'table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #000;padding:4px 6px;font-size:11px}'+
'th{background:#e5e7eb}.r{text-align:right}.c{text-align:center}.bold{font-weight:bold}'+
'.total-row td{font-weight:bold;font-size:13px}.line{border-top:1px dashed #000;margin:6px 0}'+
'</style></head><body>'+
'<h2>TAGIHAN AIR & IURAN</h2>'+
'<div class="addr">'+warga+' | '+alamat+'</div>'+
'<div class="addr">No.Meter: '+meter+' | Periode: '+periode+'</div>'+
'<table><thead><tr><th colspan="2">Rincian Tagihan Air</th></tr></thead><tbody>'+
'<tr><td>Meter Sebelum</td><td class="r">'+sebelum.toLocaleString('id-ID')+'</td></tr>'+
'<tr><td>Meter Terakhir</td><td class="r">'+sekarang.toLocaleString('id-ID')+'</td></tr>'+
'<tr><td>Pemakaian</td><td class="r">'+pakai+' m³</td></tr>'+
'<tr><td>Harga per m³</td><td class="r">Rp '+harga.toLocaleString('id-ID')+'</td></tr>'+
'<tr class="bold"><td>Sub Total Air</td><td class="r">Rp '+subtotal.toLocaleString('id-ID')+'</td></tr>'+
'</tbody></table>'+
(wargaIuran.length ? '<table><thead><tr><th colspan="3">Tagihan Iuran</th></tr><tr><th>Iuran</th><th>Periode</th><th class="r">Jumlah</th></tr></thead><tbody>'+iuranRows+'<tr class="bold"><td colspan="2">Sub Total Iuran</td><td class="r">Rp '+totalIuran.toLocaleString('id-ID')+'</td></tr></tbody></table>' : '')+
'<table><tr class="total-row"><td>TOTAL TAGIHAN</td><td class="r">Rp '+grandTotal.toLocaleString('id-ID')+'</td></tr></table>'+
'<div class="line"></div><div style="font-size:9px;text-align:center">Dicetak: '+now+' · SimWarga</div>'+
'<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>'
  const w = window.open('','_blank','width=500,height=600'); w.document.write(html); w.document.close()
}

function printBulk() {
  const data = filtered.value
  if(!data.length) return
  const now = new Date().toLocaleString('id-ID')
  let pages = ''
  data.forEach((t, idx) => {
    const warga = t.NamaKepalaKK||'-'
    const alamat = t.Alamat||'-'
    const meter = t.NoMeteran||'-'
    const sebelum = t.StandAwal||0
    const sekarang = t.StandAkhir||0
    const pakai = t.Pemakaian||0
    const harga = t.HargaPerM3||0
    const periode = t.Periode||'-'
    const subtotal = t.TotalTagihan||0
    const wargaIuran = iuranData.value.filter(i => i.WargaId === t.WargaId && i.StatusTagihan === 'Belum')
    const totalIuran = wargaIuran.reduce((s,i)=>s+(i.Nominal||0),0)
    const grandTotal = subtotal + totalIuran
    let iuranRows = wargaIuran.map(i => '<tr><td>'+i.NamaIuran+'</td><td>'+i.Periode+'</td><td style="text-align:right">Rp '+Number(i.Nominal||0).toLocaleString('id-ID')+'</td></tr>').join('')
    pages += '<div class="page">'+
'<h2>TAGIHAN AIR & IURAN</h2>'+
'<div class="addr">'+warga+' | '+alamat+'</div>'+
'<div class="addr">No.Meter: '+meter+' | Periode: '+periode+'</div>'+
'<table><thead><tr><th colspan="2">Rincian Tagihan Air</th></tr></thead><tbody>'+
'<tr><td>Meter Sebelum</td><td class="r">'+sebelum.toLocaleString('id-ID')+'</td></tr>'+
'<tr><td>Meter Terakhir</td><td class="r">'+sekarang.toLocaleString('id-ID')+'</td></tr>'+
'<tr><td>Pemakaian</td><td class="r">'+pakai+' m³</td></tr>'+
'<tr><td>Harga per m³</td><td class="r">Rp '+harga.toLocaleString('id-ID')+'</td></tr>'+
'<tr class="bold"><td>Sub Total Air</td><td class="r">Rp '+subtotal.toLocaleString('id-ID')+'</td></tr>'+
'</tbody></table>'+
(wargaIuran.length ? '<table><thead><tr><th colspan="3">Tagihan Iuran</th></tr><tr><th>Iuran</th><th>Periode</th><th class="r">Jumlah</th></tr></thead><tbody>'+iuranRows+'<tr class="bold"><td colspan="2">Sub Total Iuran</td><td class="r">Rp '+totalIuran.toLocaleString('id-ID')+'</td></tr></tbody></table>' : '')+
'<table><tr class="total-row"><td>TOTAL TAGIHAN</td><td class="r">Rp '+grandTotal.toLocaleString('id-ID')+'</td></tr></table>'+
'<div class="line"></div><div style="font-size:9px;text-align:center"># '+(idx+1)+'/'+data.length+' · Dicetak: '+now+' · SimWarga</div>'+
'</div>'
  })
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tagihan Bulk</title>'+
'<style>@page{size:A5;margin:12mm 10mm}body{font-family:Arial;font-size:12px;color:#000;padding:0}'+
'h2{margin:0 0 2px;font-size:14px;text-align:center}.addr{font-size:10px;text-align:center;margin-bottom:8px}'+
'table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #000;padding:4px 6px;font-size:11px}'+
'th{background:#e5e7eb}.r{text-align:right}.c{text-align:center}.bold{font-weight:bold}'+
'.total-row td{font-weight:bold;font-size:13px}.line{border-top:1px dashed #000;margin:6px 0}'+
'.page{page-break-after:always;padding:0 0 8mm 0}.page:last-child{page-break-after:auto}'+
'</style></head><body>'+pages+'<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>'
  const w = window.open('','_blank','width=500,height=600'); w.document.write(html); w.document.close()
}

onMounted(() => { app.setPage('tagihan-air'); fetchData() })
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div><h1 class="page-heading text-lg sm:text-xl font-bold">Tagihan Air</h1><p class="page-subheading text-xs sm:text-sm mt-0.5">Kelola & cetak tagihan pelanggan</p></div>
      <div class="flex gap-2 items-end">
        <Button variant="outline" size="sm" class="text-xs h-9 px-3" @click="printBulk"><Printer class="h-3.5 w-3.5" /> Print {{ filtered.length }} Tagihan</Button>
        <select v-model="genTahun" class="form-control-custom" style="width:80px;font-size:12px"><option v-for="y in tahunOpt" :key="y" :value="y">{{ y }}</option></select>
        <select v-model="genBulan" class="form-control-custom" style="width:70px;font-size:12px"><option v-for="b in bulanList" :key="b.value" :value="b.value">{{ b.label }}</option></select>
        <Button variant="default" size="sm" class="text-xs h-9 px-3" @click="generateTagihan"><RefreshCw class="h-3.5 w-3.5" /> Generate</Button>
      </div>
    </div>

    <div class="flex gap-3 items-end mb-4 flex-wrap">
      <div style="min-width:120px"><label class="form-label-custom">Status</label><select v-model="filterStatus" class="form-control-custom" style="font-size:12px" @change="page=1"><option value="">Semua</option><option value="Belum">Belum Bayar</option><option value="Sebagian">Sebagian</option><option value="Lunas">Lunas</option></select></div>
      <div style="flex:1;min-width:200px"><label class="form-label-custom">Cari</label><div class="relative"><Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input v-model="searchQuery" class="form-control-custom" style="padding-left:32px" placeholder="Nama atau No. Meter..." @input="page=1" /></div></div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Loader2 class="h-8 w-8 animate-spin text-indigo-600" /></div>
    <div v-else-if="tagihan.length===0" class="text-center py-20 text-slate-400"><Droplet class="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Belum ada tagihan.</p></div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="t in displayed" :key="t.Id" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col">
        <div class="flex items-start justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0 font-bold text-sm text-blue-600 dark:text-blue-400">{{ (t.NamaKepalaKK||'?').charAt(0) }}</div>
            <div class="min-w-0"><div class="font-semibold text-slate-900 dark:text-slate-100 truncate">{{ t.NamaKepalaKK }}</div><div class="text-xs font-mono text-slate-500">{{ t.NoMeteran }}</div></div>
          </div>
          <Badge :variant="badgeVariant(t.StatusTagihan)">{{ t.StatusTagihan }}</Badge>
        </div>
        <div class="flex-1 px-5 py-3 space-y-2">
          <div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><Calendar class="h-3.5 w-3.5 text-slate-400" /><span>{{ t.Periode }}</span></div>
          <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Droplet class="h-3.5 w-3.5 text-slate-400" /><span>{{ t.Pemakaian||0 }} m³</span></div>
          <div class="text-lg font-bold text-slate-900 dark:text-slate-100">{{ formatRp(t.TotalTagihan) }}</div>
        </div>
        <div class="px-5 pb-4 flex gap-2">
          <Button variant="outline" size="sm" class="flex-1 text-xs h-8" @click="printTagihan(t)">
            <Printer class="h-3.5 w-3.5 mr-1" /> Cetak
          </Button>
          <Button v-if="t.StatusTagihan !== 'Lunas'" variant="default" size="sm" class="flex-1 text-xs h-8" @click="openBayar(t)">
            <CreditCard class="h-3.5 w-3.5 mr-1" /> Bayar
          </Button>
        </div>
      </div>
    </div>

    <div v-if="totalPages>1" class="flex items-center justify-center gap-2 mt-6 text-sm">
      <button class="page-btn" :disabled="page<=1" @click="goPage(page-1)">‹</button><span class="text-slate-500">{{ page }}/{{ totalPages }}</span><button class="page-btn" :disabled="page>=totalPages" @click="goPage(page+1)">›</button>
    </div>

    <!-- Payment Confirmation Modal -->
    <div v-if="showPayModal && payingItem" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background:rgba(0,0,0,0.5)">
      <div class="w-full max-w-sm rounded-xl border shadow-2xl mx-4 p-6 modal-form">
        <div class="flex items-center justify-between mb-4">
          <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">Konfirmasi Pembayaran Air</h3>
          <button class="close-btn" @click="showPayModal=false">&times;</button>
        </div>
        <div class="space-y-3 mb-5">
          <div style="font-size: 13px; color: var(--text-primary);" class="flex justify-between">
            <span style="color: var(--text-secondary);">Warga</span>
            <span style="font-weight: 600;">{{ payingItem.NamaKepalaKK }}</span>
          </div>
          <div style="font-size: 13px; color: var(--text-primary);" class="flex justify-between">
            <span style="color: var(--text-secondary);">No. Meteran</span>
            <span style="font-family: monospace;">{{ payingItem.NoMeteran }}</span>
          </div>
          <div style="font-size: 13px; color: var(--text-primary);" class="flex justify-between">
            <span style="color: var(--text-secondary);">Periode</span>
            <span>{{ payingItem.Periode }}</span>
          </div>
          <div style="font-size: 13px; color: var(--text-primary);" class="flex justify-between">
            <span style="color: var(--text-secondary);">Pemakaian</span>
            <span>{{ payingItem.Pemakaian || 0 }} m³</span>
          </div>
          <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); border-top: 1px solid var(--border);" class="flex justify-between pt-2">
            <span>Nominal</span>
            <span>{{ formatRp(payingItem.TotalTagihan) }}</span>
          </div>
          <div>
            <label class="form-label-custom">Metode Bayar</label>
            <select v-model="metodeBayar" class="form-control-custom" style="font-size:13px">
              <option>Tunai</option>
              <option>Transfer</option>
              <option>QRIS</option>
            </select>
          </div>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" @click="showPayModal=false">Batal</Button>
          <Button variant="default" class="flex-1" :disabled="paying" @click="prosesBayar"><Loader2 v-if="paying" class="h-4 w-4 animate-spin" />{{ paying?'Memproses...':'Bayar' }}</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-form {
  background: var(--surface, #ffffff) !important;
  border: 1px solid var(--border, #dde3ec) !important;
}
.close-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--border,#dde3ec);background:var(--surface-2,#f5f7fa);color:var(--text-secondary,#5a6a85);cursor:pointer;font-size:18px;line-height:1;transition:all .15s ease}
.close-btn:hover{background:#ef4444;border-color:#ef4444;color:#fff}
.page-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--border,#dde3ec);background:var(--surface,#fff);color:var(--text-secondary,#5a6a85);cursor:pointer;font-size:14px;transition:all .15s ease}.page-btn:hover:not(:disabled){background:var(--primary-soft,#e3f2fd);color:var(--primary,#1565c0)}.page-btn:disabled{opacity:.4;cursor:default}
</style>
