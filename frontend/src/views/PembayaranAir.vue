<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { pembayaranAirAPI, tagihanAirAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Loader2, Calendar, Banknote, CreditCard, Search, Droplet, Printer, X } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()
const allTagihan = ref([])
const riwayat = ref([])
const loading = ref(false)
const searchQuery = ref('')
const paying = ref(false)
const metodeBayar = ref('Tunai')
const selectAll = ref(false)
const page = ref(1)
const perPage = 12

// Confirmation Modal States
const showPayModal = ref(false)
const uangDiterimaInput = ref('')

// Payment History Pagination & Search
const searchQueryHistory = ref('')
const pageHistory = ref(1)
const perPageHistory = 10

function formatRp(n) { return 'Rp ' + Number(n||0).toLocaleString('id-ID') }

function formatNumberIDR(val) {
  if (!val && val !== 0) return ''
  return Number(val).toLocaleString('id-ID')
}

function parseNumberIDR(str) {
  if (!str) return 0
  const cleaned = String(str).replace(/[^\d]/g, '')
  return cleaned ? parseInt(cleaned, 10) : 0
}

function handleUangInput(e) {
  let val = e.target.value
  let clean = val.replace(/[^\d]/g, '')
  if (clean === '') {
    uangDiterimaInput.value = ''
    return
  }
  const parsed = parseInt(clean, 10)
  uangDiterimaInput.value = parsed.toLocaleString('id-ID')
}

const uangDiterima = computed({
  get() {
    return parseNumberIDR(uangDiterimaInput.value)
  },
  set(val) {
    uangDiterimaInput.value = formatNumberIDR(val)
  }
})

const filtered = computed(() => {
  let data = [...allTagihan.value].filter(t => t.StatusTagihan !== 'Lunas')
  if(searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    data = data.filter(t => (t.NamaKepalaKK||'').toLowerCase().includes(q) || (t.NoMeteran||'').toLowerCase().includes(q))
  }
  return data
})
const totalPages = computed(() => Math.ceil(filtered.value.length / perPage))
const displayed = computed(() => filtered.value.slice((page.value-1)*perPage, page.value*perPage))
const checkedItems = computed(() => allTagihan.value.filter(t => t.checked && t.StatusTagihan !== 'Lunas'))
const checkedTotal = computed(() => checkedItems.value.reduce((s,t)=>s+(t.TotalTagihan||0),0))
const checkedCount = computed(() => checkedItems.value.length)

// Payment confirmation helpers
const kembalian = computed(() => {
  if (metodeBayar.value !== 'Tunai') return 0
  if (!uangDiterima.value) return 0
  const val = uangDiterima.value - checkedTotal.value
  return val > 0 ? val : 0
})

const isUangDiterimaSuficient = computed(() => {
  if (metodeBayar.value !== 'Tunai') return true
  return (uangDiterima.value || 0) >= checkedTotal.value
})

const cashSuggestions = computed(() => {
  const total = checkedTotal.value
  const list = [total]
  const denominations = [10000, 20000, 50000, 100000]
  denominations.forEach(d => {
    const next = Math.ceil(total / d) * d
    if (next > total && !list.includes(next)) {
      list.push(next)
    }
  })
  return list.sort((a, b) => a - b)
})

function toggleSelectAll() {
  const val = !selectAll.value; selectAll.value = val
  displayed.value.forEach(t => { if(t.StatusTagihan!=='Lunas') t.checked = val })
}

async function fetchData() {
  loading.value = true
  try {
    const [tRes, pRes] = await Promise.all([tagihanAirAPI.list({}), pembayaranAirAPI.list()])
    allTagihan.value = (tRes.data.data||[]).map(t=>({...t,checked:false}))
    riwayat.value = pRes.data.data||[]
  } catch(e) { toast({title:'Gagal',description:e.message,variant:'destructive'}) }
  finally { loading.value = false }
}

function goPage(p) { if(p>=1 && p<=totalPages.value) { page.value=p; selectAll.value=false } }

function openConfirmationModal() {
  if (!checkedCount.value) {
    toast({ title: 'Pilih tagihan', description: 'Centang minimal satu tagihan untuk membayar', variant: 'destructive' })
    return
  }
  // Quick fill input with exact total bill by default
  uangDiterimaInput.value = formatNumberIDR(checkedTotal.value)
  showPayModal.value = true
}

function openSingleBayar(t) {
  allTagihan.value.forEach(x => { x.checked = false })
  t.checked = true
  openConfirmationModal()
}

async function bulkBayar() {
  if(!checkedCount.value) { toast({title:'Pilih tagihan',description:'Centang minimal satu',variant:'destructive'}); return }
  paying.value = true
  try {
    let count = 0
    for(const t of checkedItems.value) {
      await pembayaranAirAPI.create({ 
        TagihanAirId:t.Id, 
        JumlahBayar:t.TotalTagihan, 
        MetodeBayar:metodeBayar.value,
        Keterangan: metodeBayar.value === 'Tunai' && uangDiterima.value
          ? `Pembayaran Tunai (Uang: ${formatRp(uangDiterima.value)}, Kembalian: ${formatRp(kembalian.value)})`
          : `Pembayaran via ${metodeBayar.value}`
      })
      count++
    }
    toast({
      title:'Berhasil',
      description:`${count} tagihan lunas, total ${formatRp(checkedTotal.value)}` + 
        (metodeBayar.value === 'Tunai' && uangDiterima.value ? `. Kembalian: ${formatRp(kembalian.value)}` : ''),
      variant:'success'
    })
    showPayModal.value = false
    selectAll.value = false; 
    fetchData()
  } catch(e) { toast({title:'Gagal',description:e.response?.data?.error||e.message,variant:'destructive'}) }
  finally { paying.value = false }
}

const filteredHistory = computed(() => {
  let data = [...riwayat.value]
  if (searchQueryHistory.value.trim()) {
    const q = searchQueryHistory.value.toLowerCase()
    data = data.filter(p => 
      (p.NamaKepalaKK || '').toLowerCase().includes(q) || 
      (p.NoMeteran || '').toLowerCase().includes(q) ||
      (p.NomorTransaksi || '').toLowerCase().includes(q) ||
      (p.MetodeBayar || '').toLowerCase().includes(q)
    )
  }
  return data
})

const totalPagesHistory = computed(() => Math.ceil(filteredHistory.value.length / perPageHistory))
const displayedHistory = computed(() => filteredHistory.value.slice((pageHistory.value - 1) * perPageHistory, pageHistory.value * perPageHistory))

function goPageHistory(p) { if(p>=1 && p<=totalPagesHistory.value) { pageHistory.value = p } }

function printReceipt(t) {
  const warga = t.NamaKepalaKK||'-'
  const alamat = t.Alamat||'-'
  const meter = t.NoMeteran||'-'
  const sebelum = t.StandAwal||0
  const sekarang = t.StandAkhir||0
  const pakai = t.Pemakaian||0
  const harga = t.HargaPerM3||0
  const periode = t.Periode||'-'
  const subtotal = t.TotalTagihan||0
  const now = new Date().toLocaleString('id-ID')

  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bukti Bayar</title>'+
'<style>@page{size:A5;margin:12mm 10mm}body{font-family:Arial;font-size:12px;color:#000;padding:0}'+
'h2{margin:0 0 2px;font-size:14px;text-align:center}.addr{font-size:10px;text-align:center;margin-bottom:8px}'+
'table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #000;padding:4px 6px;font-size:11px}'+
'th{background:#e5e7eb}.r{text-align:right}.c{text-align:center}.bold{font-weight:bold}'+
'.total-row td{font-weight:bold;font-size:13px}.line{border-top:1px dashed #000;margin:6px 0}'+
'</style></head><body>'+
'<h2>BUKTI PEMBAYARAN AIR</h2>'+
'<div class="addr">'+warga+' | '+alamat+'</div>'+
'<div class="addr">No.Meter: '+meter+' | Periode: '+periode+'</div>'+
'<table><thead><tr><th colspan="2">Rincian</th></tr></thead><tbody>'+
'<tr><td>Meter Sebelum</td><td class="r">'+sebelum.toLocaleString('id-ID')+'</td></tr>'+
'<tr><td>Meter Terakhir</td><td class="r">'+sekarang.toLocaleString('id-ID')+'</td></tr>'+
'<tr><td>Pemakaian</td><td class="r">'+pakai+' m³</td></tr>'+
'<tr><td>Harga per m³</td><td class="r">Rp '+harga.toLocaleString('id-ID')+'</td></tr>'+
'</tbody></table>'+
'<table><tr class="total-row"><td>TOTAL DIBAYAR</td><td class="r">Rp '+Number(subtotal||0).toLocaleString('id-ID')+'</td></tr></table>'+
'<div class="line"></div><div class="c bold">LUNAS</div>'+
'<div style="font-size:9px;text-align:center;margin-top:4px">Dicetak: '+now+' · SimWarga</div>'+
'<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>'
  const w = window.open('','_blank','width=500,height=600'); w.document.write(html); w.document.close()
}

function printBulk() {
  if(!checkedCount.value) return
  const data = checkedItems.value
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
    pages += '<div class="page">'+
'<h2>BUKTI PEMBAYARAN AIR</h2>'+
'<div class="addr">'+warga+' | '+alamat+'</div>'+
'<div class="addr">No.Meter: '+meter+' | Periode: '+periode+'</div>'+
'<table><thead><tr><th colspan="2">Rincian</th></tr></thead><tbody>'+
'<tr><td>Meter Sebelum</td><td class="r">'+sebelum.toLocaleString('id-ID')+'</td></tr>'+
'<tr><td>Meter Terakhir</td><td class="r">'+sekarang.toLocaleString('id-ID')+'</td></tr>'+
'<tr><td>Pemakaian</td><td class="r">'+pakai+' m³</td></tr>'+
'<tr><td>Harga per m³</td><td class="r">Rp '+harga.toLocaleString('id-ID')+'</td></tr>'+
'</tbody></table>'+
'<table><tr class="total-row"><td>TOTAL DIBAYAR</td><td class="r">Rp '+Number(subtotal||0).toLocaleString('id-ID')+'</td></tr></table>'+
'<div class="line"></div><div class="c bold">LUNAS</div>'+
'<div style="font-size:9px;text-align:center"># '+(idx+1)+'/'+data.length+' · Dicetak: '+now+' · SimWarga</div>'+
'</div>'
  })
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bukti Bulk</title>'+
'<style>@page{size:A5;margin:12mm 10mm}body{font-family:Arial;font-size:12px;color:#000;padding:0}'+
'h2{margin:0 0 2px;font-size:14px;text-align:center}.addr{font-size:10px;text-align:center;margin-bottom:8px}'+
'table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #000;padding:4px 6px;font-size:11px}'+
'th{background:#e5e7eb}.r{text-align:right}.c{text-align:center}.bold{font-weight:bold}'+
'.total-row td{font-weight:bold;font-size:13px}.line{border-top:1px dashed #000;margin:6px 0}'+
'.page{page-break-after:always;padding:0 0 8mm 0}.page:last-child{page-break-after:auto}'+
'</style></head><body>'+pages+'<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>'
  const w = window.open('','_blank','width=500,height=600'); w.document.write(html); w.document.close()
}

onMounted(()=>{ app.setPage('pembayaran-air'); fetchData() })
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Pembayaran Air</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Bayar & cetak bukti pembayaran</p>
      </div>
      <Button v-if="checkedCount" variant="outline" size="sm" class="text-xs h-8 px-2.5" @click="printBulk">
        <Printer class="h-3.5 w-3.5 mr-1" /> Cetak {{ checkedCount }} Bukti
      </Button>
    </div>

    <!-- Filter & Search Bar for Unpaid Bills -->
    <div class="flex gap-3 items-end mb-4 flex-wrap">
      <div style="flex:1;min-width:200px">
        <label class="form-label-custom">Cari Tagihan</label>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            v-model="searchQuery" 
            class="form-control-custom" 
            style="padding-left:32px" 
            placeholder="Nama atau No. Meter..." 
            @input="page=1" 
          />
        </div>
      </div>
      <div style="min-width:110px">
        <label class="form-label-custom">Metode Default</label>
        <select v-model="metodeBayar" class="form-control-custom" style="font-size:12px">
          <option>Tunai</option>
          <option>Transfer</option>
          <option>QRIS</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
    </div>
    
    <div v-else-if="filtered.length===0" class="text-center py-20 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 w-full">
      <Banknote class="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p class="font-medium">Semua tagihan sudah lunas 🎉</p>
    </div>

    <div v-else>
      <div class="flex items-center gap-3 px-4 py-2 mb-2 text-sm flex-wrap">
        <label class="flex items-center gap-2 cursor-pointer" style="color: var(--text-secondary);">
          <input type="checkbox" :checked="selectAll" @change="toggleSelectAll" class="w-4 h-4 accent-indigo-600" />
          Pilih Semua
        </label>
        <span class="text-slate-400">|</span>
        <span style="color: var(--text-muted);">{{ filtered.length }} tagihan belum lunas</span>
        <Button 
          v-if="checkedCount" 
          variant="default" 
          size="sm" 
          class="text-xs h-8 px-3 ml-auto bg-indigo-600 hover:bg-indigo-700 text-white" 
          :disabled="paying" 
          @click="openConfirmationModal"
        >
          <CreditCard class="h-3.5 w-3.5 mr-1" />Bayar {{ checkedCount }} ({{ formatRp(checkedTotal) }})
        </Button>
      </div>

      <!-- Unpaid Bills Grid using default card classes and design variables -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="t in displayed" 
          :key="t.Id" 
          :class="['card transition-all flex flex-col', t.checked ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10' : '']"
          style="margin-bottom: 0;"
        >
          <div class="flex items-start gap-3 px-5 pt-4 pb-3">
            <input type="checkbox" v-model="t.checked" class="w-4 h-4 accent-indigo-600 mt-1 shrink-0 cursor-pointer" />
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div style="font-weight: 600; color: var(--text-primary);" class="truncate">{{ t.NamaKepalaKK }}</div>
                  <div style="font-size: 11px; font-family: monospace; color: var(--text-muted);">{{ t.NoMeteran }}</div>
                </div>
                <Badge variant="destructive">{{ t.StatusTagihan }}</Badge>
              </div>
              <div class="mt-2 space-y-1.5">
                <div class="flex items-center gap-2 text-xs" style="color: var(--text-secondary);">
                  <Calendar class="h-3.5 w-3.5 text-slate-400" />
                  <span>{{ t.Periode }}</span>
                </div>
                <div class="flex items-center gap-2 text-xs" style="color: var(--text-secondary);">
                  <Droplet class="h-3.5 w-3.5 text-slate-400" />
                  <span>{{ t.Pemakaian||0 }} m³</span>
                </div>
                <div style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">{{ formatRp(t.TotalTagihan) }}</div>
              </div>
            </div>
          </div>
          <!-- Card Action Footer -->
          <div class="px-5 pb-4 mt-auto pt-2 border-t flex justify-end" style="border-color: var(--border);">
            <Button variant="default" size="sm" class="text-xs h-7 px-3" @click="openSingleBayar(t)">
              <CreditCard class="h-3 w-3 mr-1" /> Bayar
            </Button>
          </div>
        </div>
      </div>

      <!-- Pagination for Unpaid Bills -->
      <div v-if="totalPages>1" class="flex items-center justify-center gap-2 mt-6 text-sm">
        <button class="page-btn" :disabled="page<=1" @click="goPage(page-1)">‹</button>
        <span class="text-slate-500">{{ page }}/{{ totalPages }}</span>
        <button class="page-btn" :disabled="page>=totalPages" @click="goPage(page+1)">›</button>
      </div>
    </div>

    <!-- Enhanced Payment History Table using variables -->
    <div class="mt-8">
      <div class="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary);">Riwayat Pembayaran</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Daftar transaksi pembayaran air warga</p>
        </div>
        <div class="relative w-full sm:w-64">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input 
            v-model="searchQueryHistory" 
            class="form-control-custom text-xs" 
            style="padding-left:30px; height: 32px;" 
            placeholder="Cari riwayat..." 
            @input="pageHistory=1" 
          />
        </div>
      </div>

      <div v-if="filteredHistory.length === 0" class="text-center py-10 text-sm border border-dashed rounded-xl" style="background: var(--surface); border-color: var(--border); color: var(--text-muted);">
        <Banknote class="h-10 w-10 mx-auto mb-2 opacity-30" />
        Belum ada riwayat pembayaran yang cocok.
      </div>
      
      <div v-else class="card" style="padding: 0; overflow: auto;">
        <table class="table-custom">
          <thead>
            <tr>
              <th>No. Transaksi</th>
              <th>Nama Kepala KK</th>
              <th>No. Meter</th>
              <th style="text-align: center;">Periode</th>
              <th style="text-align: center;">Metode</th>
              <th style="text-align: right;">Jumlah Bayar</th>
              <th style="text-align: center;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in displayedHistory" :key="p.Id">
              <td style="font-family: monospace; font-size: 11px; font-weight: 600; color: var(--text-secondary);">
                {{ p.NomorTransaksi || '-' }}
              </td>
              <td>
                <span style="font-weight: 600; color: var(--text-primary);">{{ p.NamaKepalaKK }}</span>
              </td>
              <td style="font-family: monospace; font-size: 11px; color: var(--text-muted);">
                {{ p.NoMeteran || '-' }}
              </td>
              <td style="text-align: center;">
                <Badge variant="outline" class="text-xs">{{ p.Periode }}</Badge>
              </td>
              <td style="text-align: center;">
                <span style="font-size: 12px; font-weight: 500; color: var(--text-secondary);">{{ p.MetodeBayar || 'Tunai' }}</span>
              </td>
              <td style="text-align: right; font-weight: 700; color: var(--text-primary);">
                {{ formatRp(p.JumlahBayar) }}
              </td>
              <td style="text-align: center;">
                <Button 
                  variant="outline" 
                  size="xs" 
                  class="h-7 px-2 text-xs flex items-center justify-center gap-1 mx-auto"
                  @click="printReceipt(p)"
                >
                  <Printer class="h-3 w-3" /> Cetak Struk
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination for History -->
      <div v-if="totalPagesHistory > 1" class="flex items-center justify-center gap-2 mt-4 text-xs">
        <button class="page-btn text-[11px] w-7 h-7" :disabled="pageHistory <= 1" @click="goPageHistory(pageHistory - 1)">‹</button>
        <span class="text-slate-500">{{ pageHistory }}/{{ totalPagesHistory }}</span>
        <button class="page-btn text-[11px] w-7 h-7" :disabled="pageHistory >= totalPagesHistory" @click="goPageHistory(pageHistory + 1)">›</button>
      </div>
    </div>

    <!-- Theme-compliant Payment Confirmation Modal -->
    <div v-if="showPayModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background:rgba(0,0,0,0.5)">
      <div class="w-full max-w-md rounded-xl border shadow-2xl mx-4 p-6 modal-form">
        <div class="flex items-center justify-between mb-4">
          <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">Konfirmasi Pembayaran Air</h3>
          <button class="close-btn" @click="showPayModal=false"><X class="h-4 w-4" /></button>
        </div>
        
        <!-- Summary of selected bills -->
        <div class="mb-4">
          <label class="form-label-custom">Detail Tagihan ({{ checkedCount }} warga)</label>
          <div class="max-h-32 overflow-y-auto border rounded-lg p-3 space-y-2 text-xs mt-1" style="background: var(--surface-2); border-color: var(--border);">
            <div v-for="t in checkedItems" :key="t.Id" class="flex justify-between items-center">
              <div class="min-w-0 flex-1 pr-2">
                <div style="font-weight: 600; color: var(--text-primary);" class="truncate">{{ t.NamaKepalaKK }}</div>
                <div style="font-size: 10px; color: var(--text-muted); font-family: monospace;">{{ t.NoMeteran }} · {{ t.Periode }}</div>
              </div>
              <div style="font-weight: 700; color: var(--text-primary);" class="ml-2 shrink-0">{{ formatRp(t.TotalTagihan) }}</div>
            </div>
          </div>
        </div>

        <div class="space-y-4 mb-5">
          <!-- Total -->
          <div class="flex justify-between items-center text-sm py-2 border-b border-dashed" style="border-color: var(--border);">
            <span style="color: var(--text-secondary);">Total Tagihan</span>
            <span class="text-xl font-black text-indigo-600 dark:text-indigo-400">{{ formatRp(checkedTotal) }}</span>
          </div>

          <!-- Payment Method -->
          <div>
            <label class="form-label-custom">Metode Bayar</label>
            <select v-model="metodeBayar" class="form-control-custom mt-1" style="font-size:13px">
              <option>Tunai</option>
              <option>Transfer</option>
              <option>QRIS</option>
            </select>
          </div>

          <!-- Cash payment fields -->
          <div v-if="metodeBayar === 'Tunai'" class="space-y-3 pt-1">
            <div>
              <label class="form-label-custom">Uang Diterima (Rp)</label>
              <input 
                type="text" 
                :value="uangDiterimaInput" 
                @input="handleUangInput" 
                class="form-control-custom mt-1 text-base font-bold font-mono" 
                placeholder="Masukkan nominal uang tunai..."
              />
            </div>

            <!-- Quick denominations with hover styling using variables -->
            <div class="flex flex-wrap gap-1.5">
              <button 
                v-for="amt in cashSuggestions" 
                :key="amt" 
                type="button" 
                class="text-[11px] px-2 py-1 rounded font-mono transition-colors"
                style="background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--border);"
                @mouseover="($event.target.style.background = 'var(--primary-soft)')"
                @mouseleave="($event.target.style.background = 'var(--surface-2)')"
                @click="uangDiterima = amt"
              >
                {{ amt === checkedTotal ? 'Pas' : formatRp(amt) }}
              </button>
            </div>

            <!-- Change display styled with dynamic primary soft variables -->
            <div class="flex justify-between items-center text-sm p-3 rounded-lg border" style="background: var(--primary-soft); border-color: var(--primary); opacity: 0.95;">
              <span class="font-medium" style="color: var(--primary);">Kembalian</span>
              <span class="font-bold text-lg font-mono" style="color: var(--primary);">{{ formatRp(kembalian) }}</span>
            </div>

            <!-- Error warning -->
            <div v-if="!isUangDiterimaSuficient && uangDiterima !== null" class="text-xs text-rose-600 dark:text-rose-400 font-semibold">
              ⚠️ Uang diterima kurang dari total tagihan!
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <Button variant="outline" class="flex-1 text-xs" @click="showPayModal=false">Batal</Button>
          <Button 
            variant="default" 
            class="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" 
            :disabled="paying || !isUangDiterimaSuficient" 
            @click="bulkBayar"
          >
            <Loader2 v-if="paying" class="h-3.5 w-3.5 animate-spin mr-1" />
            {{ paying ? 'Memproses...' : 'Proses Pembayaran' }}
          </Button>
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
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border, #dde3ec);
  background: var(--surface-2, #f5f7fa);
  color: var(--text-secondary, #5a6a85);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: all .15s ease;
}
.close-btn:hover {
  background: #ef4444;
  border-color: #ef4444;
  color: #fff;
}
.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border, #dde3ec);
  background: var(--surface, #fff);
  color: var(--text-secondary, #5a6a85);
  cursor: pointer;
  font-size: 14px;
  transition: all .15s ease;
}
.page-btn:hover:not(:disabled) {
  background: var(--primary-soft, #e3f2fd);
  color: var(--primary, #1565c0);
}
.page-btn:disabled {
  opacity: .4;
  cursor: default;
}
</style>
