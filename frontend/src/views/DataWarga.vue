<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { wargaAPI, wargaBulkAPI, rwAPI, rtAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Card from '@/components/ui/card/Card.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Input from '@/components/ui/input/Input.vue'
import ConfirmDialog from '@/components/ui/confirm-dialog/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Search, Plus, Pencil, Trash2, Eye, Loader2, ChevronLeft, ChevronRight, X, Upload, Download, User, Phone, MapPin, Hash, Filter, ChevronDown, ChevronUp, Copy, Check, Shuffle, Printer } from 'lucide-vue-next'

const app = useAppStore()
const auth = useAuthStore()
const { toast } = useToast()

// --- State ---
const wargaList = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const filterRT = ref('')
const filterRW = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)

const showFilter = ref(false)
const showModal = ref(false)
const editingWarga = ref(null)
const deletingId = ref(null)

// Detail modal
const showDetailModal = ref(false)
const detailWarga = ref(null)

// Delete confirmation
const showDeleteConfirm = ref(false)
const wargaToDelete = ref(null)

// Master data dropdowns
const rwList = ref([])
const rtList = ref([])
const rtFilterList = ref([])

const form = reactive({
  NIK: '',
  NamaKepalaKK: '',
  Alamat: '',
  NoRumah: '',
  RT: '',
  RW: '',
  NoHp: '',
  StatusHuni: 'Aktif',
  RW_Id: '',
})

// --- Bulk Import ---
const showImportModal = ref(false)
const importJsonText = ref('')
const importing = ref(false)
const importResult = ref(null)
const exampleCopied = ref(false)

const bulkExample = JSON.stringify([
  {
    NamaKepalaKK: "Ahmad Fauzi",
    NIK: "3201010101010001",
    Alamat: "Jl. Melati No. 12",
    NoRumah: "12",
    RT: "0",
    RW: "0",
    NoHp: "081234567890",
    StatusHuni: "Aktif"
  },
  {
    NamaKepalaKK: "Siti Aminah",
    NIK: "3201010101010002",
    Alamat: "Jl. Melati No. 15",
    NoRumah: "15",
    RT: "0",
    RW: "0",
    NoHp: "081298765432",
    StatusHuni: "Aktif"
  }
], null, 2)

function copyExample() {
  navigator.clipboard.writeText(bulkExample).then(() => {
    exampleCopied.value = true
    toast({ title: 'Berhasil disalin', description: 'Contoh payload telah disalin ke clipboard', variant: 'success' })
    setTimeout(() => { exampleCopied.value = false }, 2000)
  }).catch(() => {
    toast({ title: 'Gagal menyalin', description: 'Salin secara manual', variant: 'destructive' })
  })
}

// --- Master data fetching ---
async function fetchMasterRW() {
  try {
    const res = await rwAPI.list()
    rwList.value = res.data.data || []
  } catch (e) {
    console.error('Gagal memuat data RW', e)
  }
}

async function fetchMasterRT(rwId) {
  if (!rwId) {
    rtList.value = []
    return
  }
  try {
    const res = await rtAPI.list({ rw_id: rwId })
    rtList.value = res.data.data || []
  } catch (e) {
    console.error('Gagal memuat data RT', e)
  }
}

async function fetchFilterRT(rwId) {
  if (!rwId) {
    rtFilterList.value = []
    filterRT.value = ''
    return
  }
  try {
    const res = await rtAPI.list({ rw_id: rwId })
    rtFilterList.value = res.data.data || []
  } catch (e) {
    console.error('Gagal memuat data RT', e)
  }
}

// Watch RW selection → load RT for form
watch(() => form.RW_Id, (newVal) => {
  form.RT = ''
  // Set form.RW (NomorRW) dari master RW yang dipilih
  const rw = rwList.value.find(r => r.Id == newVal)
  form.RW = rw ? rw.NomorRW : ''
  fetchMasterRT(newVal)
})

// Watch filter RW → load RT for filter
watch(filterRW, (newVal) => {
  fetchFilterRT(newVal)
})

// --- Data fetching ---
async function fetchWarga() {
  loading.value = true
  try {
    const params = {
      search: search.value || undefined,
      rt: filterRT.value || undefined,
      rw: filterRW.value || undefined,
      status: filterStatus.value || undefined,
      page: currentPage.value,
      limit: 12,
    }
    const response = await wargaAPI.list(params)
    const result = response.data
    let data = result.data || []
    // Sort by name alphabetically
    data.sort((a, b) => (nameDisplay(a)).localeCompare(nameDisplay(b)))
    wargaList.value = data
    totalItems.value = result.total || 0
    totalPages.value = result.totalPages || 1
  } catch (err) {
    toast({ title: 'Gagal memuat data', description: err.response?.data?.error || err.message || 'Terjadi kesalahan', variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

function onSearch() {
  currentPage.value = 1
  fetchWarga()
}

// --- NIK Generator ---
function generateNIK() {
  let nik = ''
  nik += '32'
  nik += '01'
  nik += '01'
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
  const year = String(Math.floor(Math.random() * 50) + 60).padStart(2, '0')
  nik += day + month + year
  nik += String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  form.NIK = nik
}

// --- Modal helpers ---
function resetForm() {
  form.NIK = ''
  form.NamaKepalaKK = ''
  form.Alamat = ''
  form.NoRumah = ''
  form.RT = ''
  form.RW = ''
  form.NoHp = ''
  form.StatusHuni = 'Aktif'
  form.RW_Id = ''
  rtList.value = []
}

function resetFormAfterCreate() {
  // Only clear name, NIK, noRumah — keep RW & RT selections
  form.NIK = ''
  form.NamaKepalaKK = ''
  form.Alamat = ''
  form.NoRumah = ''
  form.NoHp = ''
  form.StatusHuni = 'Aktif'
}

function openCreate() {
  resetForm()
  editingWarga.value = null
  showModal.value = true
}

async function openEdit(warga) {
  editingWarga.value = warga
  // Cari RW_Id dari NomorRW
  const rw = rwList.value.find(r => r.NomorRW === (warga.RW || warga.rw))
  form.RW_Id = rw ? rw.Id : ''
  form.NIK = warga.NIK || warga.nik || ''
  form.NamaKepalaKK = warga.NamaKepalaKK || warga.nama || ''
  form.Alamat = warga.Alamat || warga.alamat || ''
  form.NoRumah = warga.NoRumah || warga.noRumah || ''
  form.RW = warga.RW || warga.rw || ''
  form.NoHp = warga.NoHp || warga.noHp || ''
  form.StatusHuni = warga.StatusHuni || warga.status || 'Aktif'
  if (form.RW_Id) {
    await fetchMasterRT(form.RW_Id)
    // Set RT setelah RT list ter-load
    form.RT = warga.RT || warga.rt || ''
  } else {
    form.RT = ''
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

// --- Detail ---
function openDetail(warga) {
  detailWarga.value = warga
  showDetailModal.value = true
}

// --- Delete confirmation ---
function confirmDelete(warga) {
  wargaToDelete.value = warga
  showDeleteConfirm.value = true
}

async function doDelete() {
  const warga = wargaToDelete.value
  if (!warga) return
  const id = warga.Id || warga.id
  deletingId.value = id
  showDeleteConfirm.value = false
  try {
    await wargaAPI.delete(id)
    toast({ title: 'Warga berhasil dihapus', description: 'Data warga telah dihapus dari sistem', variant: 'success' })
    fetchWarga()
  } catch (err) {
    toast({ title: 'Gagal menghapus data', description: err.response?.data?.error || err.message || 'Terjadi kesalahan', variant: 'destructive' })
  } finally {
    deletingId.value = null
    wargaToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  wargaToDelete.value = null
}

// --- CRUD ---
async function handleSave() {
  if (!form.RW_Id) {
    toast({ title: 'Validasi gagal', description: 'RW wajib dipilih', variant: 'warning' })
    return
  }
  if (!form.RT) {
    toast({ title: 'Validasi gagal', description: 'RT wajib dipilih', variant: 'warning' })
    return
  }
  if (!form.NamaKepalaKK.trim()) {
    toast({ title: 'Validasi gagal', description: 'Nama Kepala Keluarga wajib diisi', variant: 'warning' })
    return
  }
  saving.value = true
  try {
    if (editingWarga.value) {
      const id = editingWarga.value.Id || editingWarga.value.id
      await wargaAPI.update(id, form)
      toast({ title: 'Warga berhasil diperbarui', description: `Data ${form.NamaKepalaKK} telah disimpan`, variant: 'success' })
      closeModal()
    } else {
      await wargaAPI.create(form)
      toast({ title: 'Warga berhasil ditambahkan', description: `Data ${form.NamaKepalaKK} telah ditambahkan`, variant: 'success' })
      resetFormAfterCreate()
      // Stay on modal for next entry
    }
    fetchWarga()
  } catch (err) {
    toast({ title: 'Gagal menyimpan data', description: err.response?.data?.error || err.message || 'Terjadi kesalahan', variant: 'destructive' })
  } finally {
    saving.value = false
  }
}

// --- Export ---
async function handleExport() {
  try {
    const response = await wargaAPI.list({ limit: 9999 })
    const data = response.data.data || []
    // Sort by name
    data.sort((a, b) => (nameDisplay(a)).localeCompare(nameDisplay(b)))
    // Build print-friendly HTML table
    const rows = data.map((w, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${nikDisplay(w)}</td>
        <td>${nameDisplay(w)}</td>
        <td>${noHpDisplay(w)}</td>
        <td>RT ${rtDisplay(w)} / RW ${rwDisplay(w)}</td>
        <td></td>
      </tr>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Data Warga</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; }
  h2 { text-align: center; margin-bottom: 4px; }
  .sub { text-align: center; font-size: 11px; color: #64748b; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #2563eb; color: #fff; padding: 8px 6px; text-align: left; font-size: 11px; }
  td { padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
  tr:nth-child(even) td { background: #f8fafc; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<h2>DATA WARGA</h2>
<div class="sub">Tanggal: ${new Date().toLocaleDateString('id-ID')} · Total: ${data.length} warga</div>
<table><thead><tr><th>No</th><th>NIK</th><th>Nama KK</th><th>HP</th><th>RW/RT</th><th>Keterangan</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body></html>`
    const w = window.open('', '_blank', 'width=1000,height=700')
    w.document.write(html)
    w.document.close()
    toast({ title: 'Print siap', description: `${data.length} data warga siap dicetak`, variant: 'success' })
  } catch (err) {
    toast({ title: 'Gagal export data', description: err.message, variant: 'destructive' })
  }
}

// --- Bulk Import ---
function openImport() {
  importJsonText.value = ''
  importResult.value = null
  showImportModal.value = true
}

async function handleImport() {
  if (!importJsonText.value.trim()) return
  importing.value = true
  importResult.value = null
  try {
    const parsed = JSON.parse(importJsonText.value)
    if (!Array.isArray(parsed)) {
      toast({ title: 'Format tidak valid', description: 'JSON harus berupa array of objects', variant: 'destructive' })
      importing.value = false
      return
    }
    const data = parsed.map(item => ({
      ...item,
      RT: item.RT || item.rt || "0",
      RW: item.RW || item.rw || "0",
    }))
    const response = await wargaBulkAPI.import(data)
    const result = response.data
    const imported = result.imported || result.success || 0
    const skipped = result.skipped || result.failed || 0
    const total = parsed.length
    importResult.value = `Berhasil import ${imported} dari ${total} data${skipped > 0 ? `, ${skipped} dilewati` : ''}`
    toast({ title: 'Import selesai', description: importResult.value, variant: 'success' })
    fetchWarga()
  } catch (err) {
    if (err instanceof SyntaxError) {
      toast({ title: 'JSON tidak valid', description: `Kesalahan parse: ${err.message}. Pastikan menggunakan tanda kutip ganda (") untuk key dan value string.`, variant: 'destructive' })
    } else {
      toast({ title: 'Gagal import data', description: err.response?.data?.error || err.message || 'Terjadi kesalahan', variant: 'destructive' })
    }
  } finally {
    importing.value = false
  }
}

// --- Helpers ---
function nameDisplay(warga) {
  return warga.NamaKepalaKK || warga.nama || '-'
}

function nikDisplay(warga) {
  return warga.NIK || warga.nik || '-'
}

function noHpDisplay(warga) {
  return warga.NoHp || warga.noHp || warga.telp || '-'
}

function statusDisplay(warga) {
  return warga.StatusHuni || warga.status || 'Aktif'
}

function rtDisplay(warga) {
  return warga.RT || warga.rt || '-'
}

function rwDisplay(warga) {
  return warga.RW || warga.rw || '-'
}

function alamatDisplay(warga) {
  return warga.Alamat || warga.alamat || '-'
}

function badgeVariant(status) {
  const s = (status || '').toLowerCase()
  if (s === 'aktif') return 'success'
  if (s === 'nonaktif' || s === 'pindah') return 'destructive'
  return 'default'
}

// Random card color classes
const cardColors = [
  { bg: 'bg-indigo-100 dark:bg-indigo-950', border: 'border-l-indigo-400 dark:border-l-indigo-500' },
  { bg: 'bg-emerald-100 dark:bg-emerald-950', border: 'border-l-emerald-400 dark:border-l-emerald-500' },
  { bg: 'bg-amber-100 dark:bg-amber-950', border: 'border-l-amber-400 dark:border-l-amber-500' },
  { bg: 'bg-rose-100 dark:bg-rose-950', border: 'border-l-rose-400 dark:border-l-rose-500' },
  { bg: 'bg-cyan-100 dark:bg-cyan-950', border: 'border-l-cyan-400 dark:border-l-cyan-500' },
  { bg: 'bg-violet-100 dark:bg-violet-950', border: 'border-l-violet-400 dark:border-l-violet-500' },
]
function getCardColor(warga) {
  const id = warga.Id || warga.id || 0
  return cardColors[Number(id) % cardColors.length]
}

function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  fetchWarga()
}

// --- Init ---
onMounted(() => {
  app.setPage('warga')
  fetchMasterRW()
  fetchWarga()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Data Warga</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Kelola data warga di lingkungan Anda</p>
      </div>
      <div class="flex gap-1.5 flex-wrap">
        <Button variant="outline" size="sm" class="text-xs h-8 px-2.5" @click="handleExport">
          <Printer class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Print</span>
        </Button>
        <Button variant="outline" size="sm" class="text-xs h-8 px-2.5" @click="openImport">
          <Upload class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Import JSON</span>
        </Button>
        <Button variant="default" size="sm" class="text-xs h-8 px-2.5" @click="openCreate">
          <Plus class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Tambah Warga</span>
        </Button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-card flex flex-wrap gap-3 items-end mb-6 rounded-xl border p-4" style="background: #f8fafc; border-color: #e2e8f0;">
      <div class="flex-1 min-w-[180px]">
        <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cari Warga</label>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 search-icon" />
          <Input
            v-model="search"
            type="text"
            placeholder="Nama, NIK, atau ID..."
            class-name="pl-9"
            @keyup.enter="onSearch"
          />
        </div>
      </div>
      <div class="self-end">
        <Button
          variant="outline"
          size="sm"
          class="text-xs h-9 px-3"
          @click="showFilter = !showFilter"
        >
          <Filter class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">{{ showFilter ? 'Sembunyikan' : 'Tampilkan' }} Filter</span>
          <ChevronDown v-if="!showFilter" class="h-3.5 w-3.5" />
          <ChevronUp v-else class="h-3.5 w-3.5" />
        </Button>
      </div>

      <!-- Filter RT/RW/Status (hideable) -->
      <template v-if="showFilter">
        <div class="min-w-[110px]">
          <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">RW</label>
          <select v-model="filterRW" class="form-control-custom" @change="onSearch">
            <option value="">Semua RW</option>
            <option v-for="rw in rwList" :key="rw.Id" :value="rw.NomorRW">{{ rw.NomorRW }}</option>
          </select>
        </div>
        <div class="min-w-[110px]">
          <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">RT</label>
          <select v-model="filterRT" class="form-control-custom" @change="onSearch">
            <option value="">Semua RT</option>
            <option v-for="rt in rtFilterList" :key="rt.Id" :value="rt.NomorRT">RT {{ rt.NomorRT }}</option>
          </select>
        </div>
        <div class="min-w-[110px]">
          <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
          <select v-model="filterStatus" class="form-control-custom" @change="onSearch">
            <option value="">Semua</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
            <option value="Pindah">Pindah</option>
          </select>
        </div>
      </template>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-20">
      <Loader2 class="animate-spin h-8 w-8 text-indigo-500" />
    </div>

    <!-- Empty State -->
    <div v-else-if="!wargaList.length" class="text-center py-20">
      <User class="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
      <p class="text-slate-500 dark:text-slate-400 text-sm">Belum ada data warga</p>
      <Button variant="outline" size="sm" class="mt-3" @click="openCreate">
        <Plus class="h-4 w-4" /> Tambah Warga Pertama
      </Button>
    </div>

    <!-- Card Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
      <div
        v-for="(warga, index) in wargaList"
        :key="warga.Id || warga.id"
        :class="['rounded-xl border-l-4 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all p-5 flex flex-col gap-3', getCardColor(warga).bg, getCardColor(warga).border]"
      >
        <!-- Top row: avatar + name + status badge -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0">
              #{{ (currentPage - 1) * 12 + index + 1 }}
            </div>
            <div class="min-w-0">
              <h3 class="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight truncate">{{ nameDisplay(warga) }}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">{{ nikDisplay(warga) }}</p>
            </div>
          </div>
          <Badge :variant="badgeVariant(statusDisplay(warga))" class="shrink-0">
            {{ statusDisplay(warga) }}
          </Badge>
        </div>

        <!-- Details row -->
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
          <span class="flex items-center gap-1.5 truncate">
            <MapPin class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate">{{ alamatDisplay(warga) }}</span>
          </span>
          <span class="flex items-center gap-1.5">
            <Hash class="h-3.5 w-3.5 shrink-0" /> RT {{ rtDisplay(warga) }} / RW {{ rwDisplay(warga) }}
          </span>
          <span v-if="noHpDisplay(warga) !== '-'" class="flex items-center gap-1.5">
            <Phone class="h-3.5 w-3.5 shrink-0" /> {{ noHpDisplay(warga) }}
          </span>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-1 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" size="sm" @click="openDetail(warga)">
            <Eye class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" @click="openEdit(warga)">
            <Pencil class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            :disabled="deletingId === (warga.Id || warga.id)"
            @click="confirmDelete(warga)"
          >
            <Loader2 v-if="deletingId === (warga.Id || warga.id)" class="h-4 w-4 animate-spin" />
            <Trash2 v-else class="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between text-sm">
      <span class="text-slate-500 dark:text-slate-400">Menampilkan {{ wargaList.length }} dari {{ totalItems }} warga</span>
      <div class="flex gap-1 items-center">
        <Button variant="outline" size="icon" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <span class="px-3 text-slate-600 dark:text-slate-400">{{ currentPage }} / {{ totalPages }}</span>
        <Button variant="outline" size="icon" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Modal: Create / Edit -->
    <div v-if="showModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background: rgba(0,0,0,0.5);">
      <Card class-name="w-full max-w-lg mx-4 rounded-xl shadow-2xl" style="max-height: 90vh; overflow-y: auto;">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <span>{{ editingWarga ? 'Edit Warga' : 'Tambah Warga' }}</span>
            <button class="close-btn" @click="closeModal" title="Tutup">
              <X class="h-4 w-4" />
            </button>
          </div>
        </template>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <!-- RW + RT side by side -->
          <div>
            <label class="form-label-custom">RW <span style="color: red;">*</span></label>
            <select v-model="form.RW_Id" class="form-control-custom">
              <option value="">-- Pilih RW --</option>
              <option v-for="rw in rwList" :key="rw.Id" :value="rw.Id">RW {{ rw.NomorRW }}</option>
            </select>
          </div>
          <div>
            <label class="form-label-custom">RT <span style="color: red;">*</span></label>
            <select v-model="form.RT" class="form-control-custom" :disabled="!form.RW_Id">
              <option value="">-- Pilih RT --</option>
              <option v-for="rt in rtList" :key="rt.Id" :value="rt.NomorRT">RT {{ rt.NomorRT }}</option>
            </select>
          </div>

          <!-- Nama Kepala KK -->
          <div style="grid-column: span 2;">
            <label class="form-label-custom">Nama Kepala KK <span style="color: red;">*</span></label>
            <Input v-model="form.NamaKepalaKK" type="text" placeholder="Nama lengkap kepala keluarga" />
          </div>

          <!-- NIK + Generate -->
          <div style="grid-column: span 2;">
            <label class="form-label-custom">NIK</label>
            <div style="display: flex; gap: 8px;">
              <div style="flex: 1;">
                <Input v-model="form.NIK" type="text" placeholder="16 digit NIK" maxlength="16" />
              </div>
              <Button variant="outline" size="sm" class="text-xs h-9 px-3 shrink-0" @click="generateNIK" title="Generate NIK acak">
                <Shuffle class="h-3.5 w-3.5" /> Generate
              </Button>
            </div>
          </div>

          <!-- Alamat -->
          <div style="grid-column: span 2;">
            <label class="form-label-custom">Alamat</label>
            <textarea
              v-model="form.Alamat"
              class="form-control-custom"
              rows="2"
              placeholder="Alamat lengkap"
              style="width: 100%; resize: vertical;"
            ></textarea>
          </div>

          <!-- No Rumah -->
          <div>
            <label class="form-label-custom">No. Rumah</label>
            <Input v-model="form.NoRumah" type="text" placeholder="No. Rumah" />
          </div>

          <!-- No HP -->
          <div>
            <label class="form-label-custom">No. HP</label>
            <Input v-model="form.NoHp" type="text" placeholder="08xxxxxxxxxx" />
          </div>

          <!-- Status Huni -->
          <div style="grid-column: span 2;">
            <label class="form-label-custom">Status Huni</label>
            <select v-model="form.StatusHuni" class="form-control-custom">
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
              <option value="Pindah">Pindah</option>
            </select>
          </div>
        </div>

        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
            <Button variant="outline" @click="closeModal">Tutup</Button>
            <Button variant="default" :disabled="saving" @click="handleSave">
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              {{ saving ? 'Menyimpan...' : (editingWarga ? 'Simpan Perubahan' : 'Simpan') }}
            </Button>
          </div>
        </template>
      </Card>
    </div>

    <!-- Modal: Detail Warga -->
    <div v-if="showDetailModal && detailWarga" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background: rgba(0,0,0,0.5);">
      <Card class-name="w-full max-w-md mx-4 rounded-xl shadow-2xl" style="max-height: 90vh; overflow-y: auto;">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <span>Detail Warga</span>
            <button class="close-btn" @click="showDetailModal = false" title="Tutup">
              <X class="h-4 w-4" />
            </button>
          </div>
        </template>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Avatar + Name -->
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--primary-soft, #e3f2fd); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: var(--primary, #1565c0); flex-shrink: 0;">
              {{ nameDisplay(detailWarga).charAt(0).toUpperCase() }}
            </div>
            <div>
              <h3 style="font-size: 16px; font-weight: 700;">{{ nameDisplay(detailWarga) }}</h3>
              <p style="font-size: 13px; color: var(--text-muted); font-family: monospace;">{{ nikDisplay(detailWarga) }}</p>
            </div>
          </div>

          <div style="border-top: 1px solid var(--border, #e2e8f0); padding-top: 12px; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: var(--text-muted);">Status</span>
              <Badge :variant="badgeVariant(statusDisplay(detailWarga))">{{ statusDisplay(detailWarga) }}</Badge>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: var(--text-muted);">RT / RW</span>
              <span style="font-weight: 600;">RT {{ rtDisplay(detailWarga) }} / RW {{ rwDisplay(detailWarga) }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: var(--text-muted);">Alamat</span>
              <span style="font-weight: 500; text-align: right; max-width: 60%;">{{ alamatDisplay(detailWarga) }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: var(--text-muted);">No. Rumah</span>
              <span style="font-weight: 600;">{{ detailWarga.NoRumah || detailWarga.noRumah || '-' }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: var(--text-muted);">No. HP</span>
              <span style="font-weight: 600;">{{ noHpDisplay(detailWarga) }}</span>
            </div>
          </div>
        </div>

        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
            <Button variant="outline" @click="showDetailModal = false">Tutup</Button>
            <Button variant="default" @click="showDetailModal = false; openEdit(detailWarga)">
              <Pencil class="h-4 w-4" /> Edit
            </Button>
          </div>
        </template>
      </Card>
    </div>

    <!-- Modal: Bulk Import -->
    <div v-if="showImportModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background: rgba(0,0,0,0.5);">
      <Card class-name="w-full max-w-xl mx-4 rounded-xl shadow-2xl" style="max-height: 90vh; overflow-y: auto;">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <span>Import Warga (JSON)</span>
            <button class="close-btn" @click="showImportModal = false" title="Tutup">
              <X class="h-4 w-4" />
            </button>
          </div>
        </template>

        <div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">
            Tempel data JSON warga. Format: array of objects dengan field NIK, NamaKepalaKK, Alamat, NoRumah, RT, RW, NoHp, StatusHuni.
            RT/RW default ke <strong>"0"</strong> jika tidak diisi.
          </p>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">📋 Contoh Payload (bulk import)</span>
              <Button variant="outline" size="sm" class="text-xs h-7 px-2 gap-1" @click="copyExample">
                <Check v-if="exampleCopied" class="h-3 w-3 text-emerald-500" />
                <Copy v-else class="h-3 w-3" />
                {{ exampleCopied ? 'Tersalin' : 'Salin' }}
              </Button>
            </div>
            <pre style="background: var(--surface-2, #f1f5f9); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 12px; font-size: 11px; font-family: monospace; overflow-x: auto; max-height: 180px; overflow-y: auto; white-space: pre; color: var(--text-primary); margin: 0;">{{ bulkExample }}</pre>
          </div>

          <textarea
            v-model="importJsonText"
            class="form-control-custom"
            rows="10"
            placeholder='[{"NamaKepalaKK":"John Doe","NIK":"3201...","Alamat":"Jl. X No.1","RT":"0","RW":"0","NoHp":"0812..."}]'
            style="width: 100%; resize: vertical; font-family: monospace; font-size: 12px;"
          ></textarea>

          <div v-if="importResult" style="margin-top: 12px; padding: 10px 14px; border-radius: 8px; font-size: 13px; background: var(--success-bg, #ecfdf5); color: var(--success-text, #065f46);">
            {{ importResult }}
          </div>
        </div>

        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
            <Button variant="outline" @click="showImportModal = false">Tutup</Button>
            <Button variant="default" :disabled="importing || !importJsonText.trim()" @click="handleImport">
              <Loader2 v-if="importing" class="h-4 w-4 animate-spin" />
              <Upload v-else class="h-4 w-4" />
              {{ importing ? 'Mengimport...' : 'Import' }}
            </Button>
          </div>
        </template>
      </Card>
    </div>

    <!-- Delete Confirmation -->
    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Hapus Warga"
      :message="wargaToDelete ? `Yakin ingin menghapus ${nameDisplay(wargaToDelete)}? Data yang dihapus tidak dapat dikembalikan.` : ''"
      confirm-text="Ya, Hapus"
      cancel-text="Tidak"
      @confirm="doDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.filter-card {
  background: #f8fafc !important;
  border-color: #e2e8f0 !important;
}
[data-theme="dark"] .filter-card,
.dark .filter-card {
  background: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
}
[data-theme="dark"] .filter-card .form-control-custom,
.dark .filter-card .form-control-custom {
  background: #ffffff !important;
  border-color: #cbd5e1 !important;
  color: #1e293b !important;
}
[data-theme="dark"] .filter-card label,
.dark .filter-card label {
  color: #475569 !important;
}
[data-theme="dark"] .filter-card .search-icon,
.dark .filter-card .search-icon {
  color: #94a3b8 !important;
}

/* Close button di modal header */
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
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.close-btn:hover {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}
[data-theme="dark"] .close-btn,
.dark .close-btn {
  background: #1e293b;
  border-color: #334155;
  color: #cbd5e1;
}
[data-theme="dark"] .close-btn:hover,
.dark .close-btn:hover {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}
</style>
