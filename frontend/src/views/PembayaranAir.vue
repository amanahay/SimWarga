<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { pembayaranAirAPI, tagihanAirAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Loader2, Calendar, Banknote, CreditCard, Search, Droplet, Printer } from 'lucide-vue-next'

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

function formatRp(n) { return 'Rp ' + Number(n||0).toLocaleString('id-ID') }

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

async function bulkBayar() {
  if(!checkedCount.value) { toast({title:'Pilih tagihan',description:'Centang minimal satu',variant:'destructive'}); return }
  paying.value = true
  try {
    let count = 0
    for(const t of checkedItems.value) {
      await pembayaranAirAPI.create({ TagihanAirId:t.Id, JumlahBayar:t.TotalTagihan, MetodeBayar:metodeBayar.value })
      count++
    }
    toast({title:'Berhasil',description:`${count} tagihan lunas, total ${formatRp(checkedTotal.value)}`,variant:'success'})
    selectAll.value = false; fetchData()
  } catch(e) { toast({title:'Gagal',description:e.response?.data?.error||e.message,variant:'destructive'}) }
  finally { paying.value = false }
}

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
      <div><h1 class="page-heading text-lg sm:text-xl font-bold">Pembayaran Air</h1><p class="page-subheading text-xs sm:text-sm mt-0.5">Bayar & cetak bukti pembayaran</p></div>
      <Button v-if="checkedCount" variant="outline" size="sm" class="text-xs h-8 px-2.5" @click="printBulk"><Printer class="h-3.5 w-3.5" /> Cetak {{ checkedCount }} Bukti</Button>
    </div>

    <div class="flex gap-3 items-end mb-4 flex-wrap">
      <div style="flex:1;min-width:200px"><label class="form-label-custom">Cari</label><div class="relative"><Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input v-model="searchQuery" class="form-control-custom" style="padding-left:32px" placeholder="Nama atau No. Meter..." @input="page=1" /></div></div>
      <div style="min-width:110px"><label class="form-label-custom">Metode</label><select v-model="metodeBayar" class="form-control-custom" style="font-size:12px"><option>Tunai</option><option>Transfer</option><option>QRIS</option></select></div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Loader2 class="h-8 w-8 animate-spin text-indigo-600" /></div>
    <div v-else-if="filtered.length===0" class="text-center py-20 text-slate-400"><Banknote class="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Semua tagihan sudah lunas 🎉</p></div>

    <div v-else>
      <div class="flex items-center gap-3 px-4 py-2 mb-2 text-sm flex-wrap">
        <label class="flex items-center gap-2 cursor-pointer text-slate-600"><input type="checkbox" :checked="selectAll" @change="toggleSelectAll" class="w-4 h-4 accent-indigo-600" />Pilih Semua</label>
        <span class="text-slate-400">|</span><span class="text-slate-500">{{ filtered.length }} tagihan</span>
        <Button v-if="checkedCount" variant="default" size="sm" class="text-xs h-8 px-3 ml-auto" :disabled="paying" @click="bulkBayar"><CreditCard class="h-3.5 w-3.5" />Bayar {{ checkedCount }} ({{ formatRp(checkedTotal) }})</Button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="t in displayed" :key="t.Id" :class="['rounded-xl border shadow-sm transition-all flex flex-col',t.checked?'border-indigo-400 bg-indigo-50':'border-slate-200 bg-white']">
          <div class="flex items-start gap-3 px-5 py-4">
            <input type="checkbox" v-model="t.checked" class="w-4 h-4 accent-indigo-600 mt-1 shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2"><div class="min-w-0"><div class="font-semibold text-slate-900 truncate">{{ t.NamaKepalaKK }}</div><div class="text-xs font-mono text-slate-500">{{ t.NoMeteran }}</div></div><Badge variant="destructive">{{ t.StatusTagihan }}</Badge></div>
              <div class="mt-2 space-y-1">
                <div class="flex items-center gap-2 text-sm text-slate-600"><Calendar class="h-3.5 w-3.5 text-slate-400" /><span>{{ t.Periode }}</span></div>
                <div class="flex items-center gap-2 text-sm text-slate-600"><Droplet class="h-3.5 w-3.5 text-slate-400" /><span>{{ t.Pemakaian||0 }} m³</span></div>
                <div class="text-lg font-bold text-slate-900">{{ formatRp(t.TotalTagihan) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="totalPages>1" class="flex items-center justify-center gap-2 mt-6 text-sm">
        <button class="page-btn" :disabled="page<=1" @click="goPage(page-1)">‹</button><span class="text-slate-500">{{ page }}/{{ totalPages }}</span><button class="page-btn" :disabled="page>=totalPages" @click="goPage(page+1)">›</button>
      </div>
    </div>

    <div class="mt-8"><h3 class="text-base font-bold mb-3" style="color:#0f172a">Riwayat Pembayaran (8 Terbaru)</h3>
      <div v-if="riwayat.length===0" class="text-center py-6 text-slate-400 text-sm">Belum ada riwayat</div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="p in riwayat.slice(0,8)" :key="p.Id" class="rounded-lg border border-slate-200 bg-white p-3">
          <div class="font-semibold text-xs truncate">{{ p.NamaKepalaKK }}</div>
          <div class="text-xs text-slate-500">{{ p.Periode }}</div>
          <div class="flex justify-between items-center mt-1"><span class="text-xs text-slate-400">{{ p.MetodeBayar||'Tunai' }}</span><span class="font-bold text-sm text-slate-900">{{ formatRp(p.JumlahBayar) }}</span></div>
          <button class="text-xs mt-1.5" style="color:#2563eb" @click="printReceipt(p)">🖨 Cetak</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--border,#dde3ec);background:var(--surface,#fff);color:var(--text-secondary,#5a6a85);cursor:pointer;font-size:14px;transition:all .15s ease}.page-btn:hover:not(:disabled){background:var(--primary-soft,#e3f2fd);color:var(--primary,#1565c0)}.page-btn:disabled{opacity:.4;cursor:default}
</style>
