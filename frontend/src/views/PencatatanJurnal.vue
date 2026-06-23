<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { transaksiAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Input from '@/components/ui/input/Input.vue'
import ConfirmDialog from '@/components/ui/confirm-dialog/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Loader2, Plus, Pencil, Trash2, Calendar, TrendingUp, TrendingDown, BookOpen, AlertCircle, Search, Printer } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()

const list = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editing = ref(null)
const showDeleteConfirm = ref(false)
const toDelete = ref(null)
// Filtering & Search
const filterJenis = ref('Semua')
const searchWarga = ref('')
const tahun = ref(new Date().getFullYear())
const bulan = ref(new Date().getMonth() + 1)
const showAll = ref(false)

// Pagination states
const page = ref(1)
const perPage = 15

watch([filterJenis, searchWarga, tahun, bulan, showAll], () => {
  page.value = 1
})

const displayedList = computed(() => {
  const start = (page.value - 1) * perPage
  return filteredList.value.slice(start, start + perPage)
})

const totalPages = computed(() => Math.ceil(filteredList.value.length / perPage))

const tahunOptions = Array.from({length:6},(_,i)=>2025+i)
const bulanNames = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const bulanList = bulanNames.slice(1).map((l,i)=>({label:l,value:i+1}))

const form = reactive({
  JenisTransaksi: 'Pemasukan',
  TanggalTransaksi: new Date().toISOString().slice(0,10),
  TanggalJurnal: new Date().toISOString().slice(0,10),
  Nominal: 0,
  JenisKeterangan: '',
  Deskripsi: ''
})

function formatRp(n) { return 'Rp ' + Number(n||0).toLocaleString('id-ID') }
function formatNominal(n) { return n ? Number(n).toLocaleString('id-ID') : '' }
function onNominalInput(e) { form.Nominal = Number(e.target.value.replace(/\D/g,'')) }

const stats = computed(() => {
  let totalPemasukan = 0
  let totalPengeluaran = 0
  let totalHutang = 0
  
  filteredList.value.forEach(item => {
    if (item.JenisTransaksi === 'Pemasukan') totalPemasukan += (item.Pemasukan || 0)
    else if (item.JenisTransaksi === 'Pengeluaran') totalPengeluaran += (item.Pengeluaran || 0)
    else if (item.JenisTransaksi === 'Hutang') totalHutang += (item.Hutang || 0)
  })

  return {
    pemasukan: totalPemasukan,
    pengeluaran: totalPengeluaran,
    hutang: totalHutang,
    saldo: totalPemasukan - totalPengeluaran,
    count: filteredList.value.length
  }
})

const filteredList = computed(() => {
  let result = [...list.value]
  
  // 1. Filter by transaction type
  if (filterJenis.value !== 'Semua') {
    result = result.filter(item => item.JenisTransaksi === filterJenis.value)
  }
  
  // 2. Filter by search query
  if (searchWarga.value.trim()) {
    const q = searchWarga.value.toLowerCase()
    result = result.filter(item => 
      (item.JenisKeterangan || '').toLowerCase().includes(q) || 
      (item.Deskripsi || '').toLowerCase().includes(q)
    )
  }
  
  // 3. Filter by period (Month-Year) if not showing all
  if (!showAll.value) {
    const targetPeriode = `${tahun.value}-${String(bulan.value).padStart(2, '0')}`
    result = result.filter(item => {
      const dateStr = item.TanggalTransaksi || ''
      return dateStr.startsWith(targetPeriode)
    })
  }
  
  return result
})

async function fetchData() {
  loading.value = true
  try {
    const r = await transaksiAPI.list()
    list.value = r.data.data || []
  } catch(e) {
    toast({title: 'Gagal', description: e.message, variant: 'destructive'})
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.JenisTransaksi = 'Pemasukan'
  form.TanggalTransaksi = new Date().toISOString().slice(0,10)
  form.TanggalJurnal = new Date().toISOString().slice(0,10)
  form.Nominal = 0
  form.JenisKeterangan = ''
  form.Deskripsi = ''
  showModal.value = true
}

function openEdit(item) {
  editing.value = item
  form.JenisTransaksi = item.JenisTransaksi
  form.TanggalTransaksi = item.TanggalTransaksi || ''
  form.TanggalJurnal = item.TanggalJurnal || item.TanggalTransaksi || ''
  form.JenisKeterangan = item.JenisKeterangan || ''
  form.Deskripsi = item.Deskripsi || ''
  
  if (item.JenisTransaksi === 'Pemasukan') form.Nominal = item.Pemasukan || 0
  else if (item.JenisTransaksi === 'Pengeluaran') form.Nominal = item.Pengeluaran || 0
  else if (item.JenisTransaksi === 'Hutang') form.Nominal = item.Hutang || 0
  
  showModal.value = true
}

async function handleSave() {
  if(!form.TanggalTransaksi) {
    toast({title: 'Validasi', description: 'Tanggal Transaksi wajib diisi', variant: 'destructive'})
    return
  }
  if(!form.JenisKeterangan.trim()) {
    toast({title: 'Validasi', description: 'Keterangan Singkat wajib diisi', variant: 'destructive'})
    return
  }
  if(!form.Nominal) {
    toast({title: 'Validasi', description: 'Nominal tidak boleh 0', variant: 'destructive'})
    return
  }

  // Construct request payload matching backend expectation
  const payload = {
    TanggalTransaksi: form.TanggalTransaksi,
    TanggalJurnal: form.TanggalJurnal || form.TanggalTransaksi,
    JenisTransaksi: form.JenisTransaksi,
    JenisKeterangan: form.JenisKeterangan,
    Deskripsi: form.Deskripsi,
    Pemasukan: form.JenisTransaksi === 'Pemasukan' ? form.Nominal : 0,
    Pengeluaran: form.JenisTransaksi === 'Pengeluaran' ? form.Nominal : 0,
    Hutang: form.JenisTransaksi === 'Hutang' ? form.Nominal : 0
  }

  saving.value = true
  try {
    if(editing.value) {
      await transaksiAPI.update(editing.value.Id, payload)
      toast({title: 'Berhasil diperbarui', variant: 'success'})
    } else {
      await transaksiAPI.create(payload)
      toast({title: 'Berhasil ditambahkan', variant: 'success'})
    }
    showModal.value = false
    fetchData()
  } catch(e) {
    toast({title: 'Gagal menyimpan', description: e.response?.data?.error || e.message, variant: 'destructive'})
  } finally {
    saving.value = false
  }
}

function confirmDelete(item) {
  toDelete.value = item
  showDeleteConfirm.value = true
}

async function doDelete() {
  if(!toDelete.value) return
  showDeleteConfirm.value = false
  try {
    await transaksiAPI.delete(toDelete.value.Id)
    toast({title: 'Berhasil dihapus', variant: 'success'})
    fetchData()
  } catch(e) {
    toast({title: 'Gagal menghapus', variant: 'destructive'})
  } finally {
    toDelete.value = null
  }
}

function printJurnal() {
  const data = filteredList.value
  const titlePeriode = showAll.value ? 'Semua Periode' : `${tahun.value}-${String(bulan.value).padStart(2,'0')}`
  const now = new Date().toLocaleString('id-ID')
  
  let rows = data.map((item, idx) => {
    const tgl = item.TanggalTransaksi || '-'
    const tglJurnal = item.TanggalJurnal || item.TanggalTransaksi || '-'
    const tipe = item.JenisTransaksi || '-'
    const ket = item.JenisKeterangan || '-'
    const desc = item.Deskripsi || '-'
    const masuk = item.Pemasukan > 0 ? formatRp(item.Pemasukan) : '-'
    const keluar = item.Pengeluaran > 0 ? formatRp(item.Pengeluaran) : '-'
    const hutang = item.Hutang > 0 ? formatRp(item.Hutang) : '-'
    
    return `
      <tr>
        <td class="c">${idx + 1}</td>
        <td>${tgl}</td>
        <td>${tglJurnal}</td>
        <td class="bold">${tipe}</td>
        <td>
          <div class="bold">${ket}</div>
          <div style="font-size:10px;color:#64748b">${desc}</div>
        </td>
        <td class="r green">${masuk}</td>
        <td class="r red">${keluar}</td>
        <td class="r amber">${hutang}</td>
      </tr>
    `
  }).join('')

  const totalMasuk = formatRp(stats.value.pemasukan)
  const totalKeluar = formatRp(stats.value.pengeluaran)
  const totalHutang = formatRp(stats.value.hutang)
  const totalSaldo = formatRp(stats.value.saldo)

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Jurnal Keuangan ${titlePeriode}</title>
<style>
  @page{size:A4;margin:15mm}
  body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;line-height:1.4}
  h2{text-align:center;margin:0 0 4px;font-size:16px}
  .sub{text-align:center;font-size:11px;color:#64748b;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}
  th{background:#f1f5f9;font-weight:bold;text-transform:uppercase;font-size:10px}
  .r{text-align:right}
  .c{text-align:center}
  .bold{font-weight:bold}
  .green{color:#059669}
  .red{color:#dc2626}
  .amber{color:#b45309}
  .summary-box{display:grid;grid-template-cols:repeat(4,1fr);gap:10px;margin-bottom:15px}
  .sum-card{border:1px solid #e2e8f0;border-radius:6px;padding:8px;background:#f8fafc}
  .sum-title{font-size:9px;color:#64748b;font-weight:bold;text-transform:uppercase}
  .sum-val{font-size:12px;font-weight:bold;margin-top:2px}
</style></head><body>
  <h2>LAPORAN JURNAL TRANSAKSI KAS</h2>
  <div class="sub">Periode: ${titlePeriode} · Dicetak: ${now}</div>
  
  <div class="summary-box">
    <div class="sum-card"><div class="sum-title">Total Pemasukan</div><div class="sum-val green">${totalMasuk}</div></div>
    <div class="sum-card"><div class="sum-title">Total Pengeluaran</div><div class="sum-val red">${totalKeluar}</div></div>
    <div class="sum-card"><div class="sum-title">Total Hutang</div><div class="sum-val amber">${totalHutang}</div></div>
    <div class="sum-card"><div class="sum-title">Saldo Bersih</div><div class="sum-val">${totalSaldo}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:30px">No</th>
        <th>Tgl Transaksi</th>
        <th>Tgl Jurnal</th>
        <th>Tipe</th>
        <th>Keterangan / Detail</th>
        <th class="r">Pemasukan</th>
        <th class="r">Pengeluaran</th>
        <th class="r">Hutang</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="8" class="c">Tidak ada data transaksi</td></tr>'}
    </tbody>
  </table>
  
  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
</body></html>`
  const w = window.open('','_blank','width=900,height=600')
  w.document.write(html); w.document.close()
}

onMounted(() => {
  app.setPage('jurnal')
  fetchData()
})
</script>

<template>
  <div>
    <!-- Title & Add Button -->
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Pencatatan Jurnal / Input Kas</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Catat pemasukan, pengeluaran kas umum, dan hutang warga</p>
      </div>
      <div class="flex gap-2 items-end flex-wrap">
        <div style="min-width:90px" v-if="!showAll">
          <label class="form-label-custom">Bulan</label>
          <select v-model="bulan" class="form-control-custom" style="font-size:12px">
            <option v-for="b in bulanList" :key="b.value" :value="b.value">{{ b.label }}</option>
          </select>
        </div>
        <div style="min-width:80px" v-if="!showAll">
          <label class="form-label-custom">Tahun</label>
          <select v-model="tahun" class="form-control-custom" style="font-size:12px">
            <option v-for="y in tahunOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <Button :variant="showAll ? 'success' : 'outline'" size="sm" class="text-xs h-9 px-3" @click="showAll = !showAll">
          {{ showAll ? 'Semua (aktif)' : 'Semua Periode' }}
        </Button>
        <Button variant="outline" size="sm" class="text-xs h-9 px-3" @click="printJurnal">
          <Printer class="h-3.5 w-3.5 mr-1" /> Print A4
        </Button>
        <Button variant="default" size="sm" class="text-xs h-9 px-2.5" @click="openCreate">
          <Plus class="h-3.5 w-3.5 mr-1" /> Input Jurnal
        </Button>
      </div>
    </div>

    <!-- Stats Section -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="rounded-xl border border-slate-200 p-4 shadow-sm bg-white dark:bg-slate-900 dark:border-slate-800">
        <div class="text-xs font-semibold text-slate-500">Total Pemasukan Jurnal</div>
        <div class="text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400">{{ formatRp(stats.pemasukan) }}</div>
      </div>
      <div class="rounded-xl border border-slate-200 p-4 shadow-sm bg-white dark:bg-slate-900 dark:border-slate-800">
        <div class="text-xs font-semibold text-slate-500">Total Pengeluaran Jurnal</div>
        <div class="text-lg font-bold mt-1 text-rose-600 dark:text-rose-400">{{ formatRp(stats.pengeluaran) }}</div>
      </div>
      <div class="rounded-xl border border-slate-200 p-4 shadow-sm bg-white dark:bg-slate-900 dark:border-slate-800">
        <div class="text-xs font-semibold text-slate-500">Total Hutang Jurnal</div>
        <div class="text-lg font-bold mt-1 text-amber-600 dark:text-amber-400">{{ formatRp(stats.hutang) }}</div>
      </div>
      <div class="rounded-xl border border-slate-200 p-4 shadow-sm bg-white dark:bg-slate-900 dark:border-slate-800">
        <div class="text-xs font-semibold text-slate-500">Saldo Bersih Jurnal</div>
        <div class="text-lg font-bold mt-1" :class="{ 'text-emerald-600 dark:text-emerald-400': stats.saldo >= 0, 'text-rose-600 dark:text-rose-400': stats.saldo < 0 }">
          {{ formatRp(stats.saldo) }}
        </div>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="flex gap-3 items-end mb-6 flex-wrap">
      <!-- Types Filter -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
        <Button 
          v-for="jenis in ['Semua', 'Pemasukan', 'Pengeluaran', 'Hutang']" 
          :key="jenis" 
          :variant="filterJenis === jenis ? 'default' : 'outline'" 
          size="sm" 
          class="text-xs h-8 px-3" 
          @click="filterJenis = jenis"
        >
          {{ jenis }}
        </Button>
      </div>
      
      <!-- Search Input -->
      <div style="flex: 1; min-width: 200px">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            v-model="searchWarga" 
            class="form-control-custom h-8" 
            style="padding-left:32px; font-size:12px;" 
            placeholder="Cari keterangan akun atau deskripsi jurnal..." 
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredList.length === 0" class="text-center py-20 text-slate-400 border border-dashed rounded-xl bg-white dark:bg-slate-900">
      <BookOpen class="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p class="font-medium">Belum ada jurnal pencatatan kas</p>
      <p class="text-xs text-slate-500 mt-1">Tidak ada transaksi yang cocok untuk filter periode ini</p>
    </div>

    <!-- List of Transactions -->
    <div v-else>
      <!-- Desktop View (Table) -->
      <div class="desktop-view card" style="padding: 0; overflow-x: auto;">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Info Transaksi</th>
              <th>Tgl Jurnal</th>
              <th>Tipe</th>
              <th>Keterangan</th>
              <th style="text-align: right;">Pemasukan</th>
              <th style="text-align: right;">Pengeluaran</th>
              <th style="text-align: right;">Hutang</th>
              <th style="text-align: center;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in displayedList" :key="item.Id">
              <td>
                <div style="font-weight: 600;">{{ item.JenisKeterangan }}</div>
                <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                  <Calendar class="h-3 w-3" /> {{ item.TanggalTransaksi }}
                </div>
              </td>
              <td style="font-size: 13px;">
                {{ item.TanggalJurnal || item.TanggalTransaksi }}
              </td>
              <td>
                <Badge v-if="item.JenisTransaksi === 'Pemasukan'" variant="success">Masuk</Badge>
                <Badge v-else-if="item.JenisTransaksi === 'Pengeluaran'" variant="destructive">Keluar</Badge>
                <Badge v-else-if="item.JenisTransaksi === 'Hutang'" variant="secondary">Hutang</Badge>
              </td>
              <td style="font-size: 12px; color: var(--text-muted); max-w-xs truncate" :title="item.Deskripsi">
                {{ item.Deskripsi || '-' }}
              </td>
              <td style="text-align: right; font-weight: 600; color: #059669; font-size: 13px;">
                {{ item.Pemasukan > 0 ? formatRp(item.Pemasukan) : '-' }}
              </td>
              <td style="text-align: right; font-weight: 600; color: #dc2626; font-size: 13px;">
                {{ item.Pengeluaran > 0 ? formatRp(item.Pengeluaran) : '-' }}
              </td>
              <td style="text-align: right; font-weight: 600; color: #d97706; font-size: 13px;">
                {{ item.Hutang > 0 ? formatRp(item.Hutang) : '-' }}
              </td>
              <td>
                <div class="flex items-center justify-center gap-2">
                  <template v-if="item.SourceTable">
                    <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 text-[10px] py-0.5 px-2 font-semibold">
                      Otomatis ({{ item.SourceTable === 'PembayaranAir' ? 'Pembayaran Air' : (item.SourceTable === 'PembayaranIuran' ? 'Pembayaran Iuran' : item.SourceTable) }})
                    </span>
                  </template>
                  <template v-else>
                    <Button variant="outline" size="icon" class="h-7 w-7 text-slate-500" @click="openEdit(item)">
                      <Pencil class="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="icon" class="h-7 w-7 text-rose-500 border-rose-200 dark:border-rose-900" @click="confirmDelete(item)">
                      <Trash2 class="h-3 w-3" />
                    </Button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile View (Card List) -->
      <div class="mobile-view space-y-3">
        <div 
          v-for="item in displayedList" 
          :key="item.Id" 
          class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-2.5"
        >
          <!-- Header: Type Badge & Date -->
          <div class="flex items-center justify-between">
            <div class="flex flex-wrap items-center gap-1.5">
              <Badge v-if="item.JenisTransaksi === 'Pemasukan'" variant="success">Masuk</Badge>
              <Badge v-else-if="item.JenisTransaksi === 'Pengeluaran'" variant="destructive">Keluar</Badge>
              <Badge v-else-if="item.JenisTransaksi === 'Hutang'" variant="secondary">Hutang</Badge>
              
              <span v-if="item.SourceTable" class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 text-[9px] py-0.5 px-1.5 font-medium">
                Otomatis ({{ item.SourceTable === 'PembayaranAir' ? 'Air' : (item.SourceTable === 'PembayaranIuran' ? 'Iuran' : item.SourceTable) }})
              </span>
            </div>
            <div class="text-xs text-slate-500 flex items-center gap-1 shrink-0">
              <Calendar class="h-3 w-3" />
              <span>{{ item.TanggalTransaksi }}</span>
            </div>
          </div>

          <!-- Body: Title & Description -->
          <div>
            <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ item.JenisKeterangan }}</h4>
            <p v-if="item.Deskripsi" class="text-xs text-slate-500 mt-1 leading-relaxed">{{ item.Deskripsi }}</p>
            <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              Tgl Jurnal: {{ item.TanggalJurnal || item.TanggalTransaksi }}
            </div>
          </div>

          <!-- Footer: Amount & Actions -->
          <div class="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/60 mt-1">
            <!-- Nominal -->
            <div>
              <span class="text-[9px] block text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Nominal</span>
              <div 
                class="text-sm font-bold mt-0.5" 
                :class="{
                  'text-emerald-600 dark:text-emerald-400': item.JenisTransaksi === 'Pemasukan',
                  'text-rose-600 dark:text-rose-400': item.JenisTransaksi === 'Pengeluaran',
                  'text-amber-600 dark:text-amber-400': item.JenisTransaksi === 'Hutang'
                }"
              >
                <span v-if="item.JenisTransaksi === 'Pemasukan'">+</span>
                <span v-else-if="item.JenisTransaksi === 'Pengeluaran'">-</span>
                {{ formatRp(item.Pemasukan || item.Pengeluaran || item.Hutang) }}
              </div>
            </div>

            <!-- Actions (if not automatic) -->
            <div class="flex items-center gap-1.5" v-if="!item.SourceTable">
              <Button variant="outline" size="sm" class="h-8 px-2 text-xs text-slate-600 dark:text-slate-300" @click="openEdit(item)">
                <Pencil class="h-3 w-3 mr-1" /> Edit
              </Button>
              <Button variant="outline" size="sm" class="h-8 px-2 text-xs text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-950/40 hover:bg-rose-50 dark:hover:bg-rose-950/20" @click="confirmDelete(item)">
                <Trash2 class="h-3 w-3 mr-1" /> Hapus
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6 text-sm">
      <button class="page-btn" :disabled="page <= 1" @click="page--">‹</button>
      <span class="text-slate-500">{{ page }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="page >= totalPages" @click="page++">›</button>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background:rgba(0,0,0,.5)">
      <div class="w-full max-w-md rounded-xl border border-slate-200 shadow-2xl mx-4 modal-form bg-white dark:bg-slate-950 dark:border-slate-800" style="max-height:90vh;overflow-y:auto">
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ editing ? 'Edit' : 'Catat' }} Jurnal Kas</h2>
          <button class="close-btn" @click="showModal=false">&times;</button>
        </div>
        <div class="px-6 py-4 space-y-4">
          <!-- Jenis Transaksi Radio Tabs -->
          <div>
            <label class="form-label-custom">Jenis Transaksi <span class="text-red-500">*</span></label>
            <div class="grid grid-cols-3 gap-2 mt-1">
              <button 
                v-for="jenis in ['Pemasukan', 'Pengeluaran', 'Hutang']"
                :key="jenis"
                type="button"
                class="py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all"
                :class="form.JenisTransaksi === jenis 
                  ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500' 
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'"
                @click="form.JenisTransaksi = jenis"
              >
                {{ jenis }}
              </button>
            </div>
          </div>

          <!-- Tanggal Transaksi -->
          <div>
            <label class="form-label-custom">Tanggal Transaksi <span class="text-red-500">*</span></label>
            <Input v-model="form.TanggalTransaksi" type="date" />
          </div>

          <!-- Tanggal Jurnal -->
          <div>
            <label class="form-label-custom">Tanggal Pencatatan Jurnal</label>
            <Input v-model="form.TanggalJurnal" type="date" />
          </div>

          <!-- Jenis Keterangan -->
          <div>
            <label class="form-label-custom">Keterangan Singkat / Akun <span class="text-red-500">*</span></label>
            <Input v-model="form.JenisKeterangan" placeholder="Contoh: Iuran Sukarela, Kas RT, Hutang Sembako" />
          </div>

          <!-- Nominal -->
          <div>
            <label class="form-label-custom">Nominal (Rupiah) <span class="text-red-500">*</span></label>
            <input 
              :value="formatNominal(form.Nominal)" 
              type="text" 
              class="form-control-custom" 
              placeholder="0" 
              @focus="$event.target.select()" 
              @input="onNominalInput" 
            />
          </div>

          <!-- Deskripsi Detail -->
          <div>
            <label class="form-label-custom">Deskripsi Lengkap / Catatan</label>
            <textarea 
              v-model="form.Deskripsi" 
              class="form-control-custom min-h-[80px] py-2" 
              placeholder="Tambahkan detail transaksi jika diperlukan..."
            ></textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-4">
          <Button variant="outline" @click="showModal=false">Tutup</Button>
          <Button variant="default" :disabled="saving" @click="handleSave">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin mr-1" />
            {{ saving ? 'Menyimpan...' : 'Simpan' }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Confirm Deletion -->
    <ConfirmDialog 
      :open="showDeleteConfirm" 
      title="Hapus Transaksi Jurnal" 
      :message="toDelete ? 'Yakin hapus transaksi ' + toDelete.JenisKeterangan + '?' : ''" 
      confirm-text="Ya, Hapus" 
      cancel-text="Tidak" 
      @confirm="doDelete" 
      @cancel="showDeleteConfirm=false" 
    />
  </div>
</template>

<style scoped>
.modal-form { background: #ffffff !important; }
.dark .modal-form { background: #020617 !important; }
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border,#dde3ec);
  background: var(--surface-2,#f5f7fa);
  color: var(--text-secondary,#5a6a85);
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
.table-custom th {
  padding: 6px 10px !important;
  font-size: 11px !important;
}
.table-custom td {
  padding: 6px 10px !important;
  font-size: 12px !important;
}
.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border,#dde3ec);
  background: var(--surface,#fff);
  color: var(--text-secondary,#5a6a85);
  cursor: pointer;
  font-size: 14px;
  transition: all .15s ease;
}
.page-btn:hover:not(:disabled) {
  background: var(--primary-soft,#e3f2fd);
  color: var(--primary,#1565c0);
}
.page-btn:disabled {
  opacity: .4;
  cursor: default;
}

/* Responsive display helper */
@media (max-width: 768px) {
  .desktop-view {
    display: none !important;
  }
  .mobile-view {
    display: block !important;
  }
}
@media (min-width: 769px) {
  .desktop-view {
    display: block !important;
  }
  .mobile-view {
    display: none !important;
  }
}
</style>
