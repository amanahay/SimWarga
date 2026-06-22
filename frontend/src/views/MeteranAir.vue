<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { meteranAPI, wargaAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Card from '@/components/ui/card/Card.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Input from '@/components/ui/input/Input.vue'
import ConfirmDialog from '@/components/ui/confirm-dialog/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Search, Plus, Pencil, Loader2, Eye, History, Gauge, X, User, MapPin, Hash, Trash2 } from 'lucide-vue-next'

const app = useAppStore()
const auth = useAuthStore()
const { toast } = useToast()

// --- State ---
const meterList = ref([])
const loading = ref(false)
const stats = reactive({ aktif: 0, nonaktif: 0, mutasi: 0, avg: '0' })
const search = ref('')
const filterStatus = ref('')

const showModal = ref(false)
const editingMeter = ref(null)
const deletingId = ref(null)

// Warga selector
const wargaOptions = ref([])
const wargaSearch = ref('')
const selectedWarga = ref(null)
const wargaSort = ref('nama')
const wargaPage = ref(1)
const wargaPerPage = 10

// Delete confirmation
const showDeleteConfirm = ref(false)
const meterToDelete = ref(null)

const form = reactive({
  WargaId: '',
  NoMeteran: '',
  LokasiPasang: '',
  TanggalPasang: '',
  StandAwal: 0,
})

// Filtered + sorted + paginated warga list
const filteredWarga = ref([])
const sortedWarga = ref([])
const displayedWarga = ref([])
const wargaTotalPages = ref(1)

watch([wargaOptions, wargaSearch, wargaSort], () => {
  const q = wargaSearch.value.toLowerCase().trim()
  let list = q
    ? wargaOptions.value.filter(w => {
        const nama = (w.NamaKepalaKK || w.nama || '').toLowerCase()
        const nik = (w.NIK || w.nik || '').toLowerCase()
        const alamat = (w.Alamat || w.alamat || '').toLowerCase()
        return nama.includes(q) || nik.includes(q) || alamat.includes(q)
      })
    : [...wargaOptions.value]
  // Sort
  if (wargaSort.value === 'nama') {
    list.sort((a, b) => (a.NamaKepalaKK || a.nama || '').localeCompare(b.NamaKepalaKK || b.nama || ''))
  } else {
    list.sort((a, b) => (a.NIK || a.nik || '').localeCompare(b.NIK || b.nik || ''))
  }
  sortedWarga.value = list
  wargaTotalPages.value = Math.ceil(list.length / wargaPerPage)
  wargaPage.value = 1
}, { immediate: true })

watch([sortedWarga, wargaPage], () => {
  const start = (wargaPage.value - 1) * wargaPerPage
  displayedWarga.value = sortedWarga.value.slice(start, start + wargaPerPage)
}, { immediate: true })

function toggleWargaSort() {
  wargaSort.value = wargaSort.value === 'nama' ? 'nik' : 'nama'
}

// --- Data fetching ---
async function fetchMeteran() {
  loading.value = true
  try {
    const params = {}
    if (search.value) params.search = search.value
    if (filterStatus.value) params.status = filterStatus.value
    const response = await meteranAPI.list(params)
    const data = response.data
    meterList.value = data.data || data.rows || []

    stats.aktif = meterList.value.filter(m => statusDisplay(m).toLowerCase() === 'aktif').length
    stats.nonaktif = meterList.value.filter(m => statusDisplay(m).toLowerCase() === 'nonaktif').length
    stats.mutasi = meterList.value.filter(m => statusDisplay(m).toLowerCase() === 'mutasi' || statusDisplay(m).toLowerCase() === 'pindah').length
    const pemakaianValues = meterList.value
      .map(m => parseInt(m.Pemakaian || m.pemakaian || 0))
      .filter(v => v > 0)
    stats.avg = pemakaianValues.length > 0
      ? Math.round(pemakaianValues.reduce((a, b) => a + b, 0) / pemakaianValues.length).toString()
      : '0'
  } catch (err) {
    toast({ title: 'Gagal memuat data meteran', description: err.response?.data?.error || err.message || 'Terjadi kesalahan', variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

async function fetchWargaOptions() {
  try {
    const response = await wargaAPI.list({ limit: 500 })
    wargaOptions.value = response.data.data || response.data.rows || []
  } catch (err) {
    // Non-critical
  }
}

function onSearch() {
  fetchMeteran()
}

// --- Warga selection ---
function selectWarga(w) {
  selectedWarga.value = w
  form.WargaId = w.Id || w.id
}

// --- Modal helpers ---
function resetForm() {
  form.WargaId = ''
  form.NoMeteran = ''
  form.LokasiPasang = ''
  form.TanggalPasang = ''
  form.StandAwal = 0
  selectedWarga.value = null
  wargaSearch.value = ''
}

function openCreate() {
  resetForm()
  editingMeter.value = null
  showModal.value = true
}

function openEdit(meter) {
  editingMeter.value = meter
  form.WargaId = meter.WargaId || meter.wargaId || ''
  form.NoMeteran = meter.NoMeteran || meter.noMeteran || meter.noMeter || ''
  form.LokasiPasang = meter.LokasiPasang || meter.lokasiPasang || ''
  form.TanggalPasang = meter.TanggalPasang || meter.tanggalPasang || ''
  form.StandAwal = meter.StandAwal || meter.standAwal || 0
  // Find selected warga
  selectedWarga.value = wargaOptions.value.find(w => (w.Id || w.id) === form.WargaId) || null
  wargaSearch.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

// --- CRUD ---
async function handleSave() {
  if (!form.WargaId) {
    toast({ title: 'Validasi gagal', description: 'Silakan pilih pelanggan (warga) terlebih dahulu', variant: 'warning' })
    return
  }
  if (!form.NoMeteran.trim()) {
    toast({ title: 'Validasi gagal', description: 'Nomor meteran wajib diisi', variant: 'warning' })
    return
  }
  try {
    if (editingMeter.value) {
      const id = editingMeter.value.Id || editingMeter.value.id
      await meteranAPI.update(id, form)
      toast({ title: 'Meteran berhasil diperbarui', description: `Data meter ${form.NoMeteran} telah disimpan`, variant: 'success' })
    } else {
      await meteranAPI.create(form)
      toast({ title: 'Meteran berhasil ditambahkan', description: `Meter ${form.NoMeteran} telah ditambahkan`, variant: 'success' })
    }
    closeModal()
    fetchMeteran()
  } catch (err) {
    toast({ title: 'Gagal menyimpan data', description: err.response?.data?.error || err.message || 'Terjadi kesalahan', variant: 'destructive' })
  }
}

function confirmDelete(meter) {
  meterToDelete.value = meter
  showDeleteConfirm.value = true
}

async function doDelete() {
  const meter = meterToDelete.value
  if (!meter) return
  const id = meter.Id || meter.id
  deletingId.value = id
  showDeleteConfirm.value = false
  try {
    await meteranAPI.delete(id)
    toast({ title: 'Meteran berhasil dihapus', description: 'Data meteran telah dihapus dari sistem', variant: 'success' })
    fetchMeteran()
  } catch (err) {
    toast({ title: 'Gagal menghapus data', description: err.response?.data?.error || err.message || 'Terjadi kesalahan', variant: 'destructive' })
  } finally {
    deletingId.value = null
    meterToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  meterToDelete.value = null
}

// --- Helpers ---
function noMeterDisplay(meter) {
  return meter.NoMeteran || meter.noMeteran || meter.noMeter || '-'
}

function pelangganDisplay(meter) {
  const w = wargaOptions.value.find(w => (w.Id || w.id) === (meter.WargaId || meter.wargaId))
  return w ? (w.NamaKepalaKK || w.nama || '-') : (meter.NamaPelanggan || meter.namaPelanggan || meter.pelanggan || '-')
}

function alamatDisplay(meter) {
  return meter.LokasiPasang || meter.lokasiPasang || meter.alamat || '-'
}

function standDisplay(meter) {
  const val = meter.StandTerakhir || meter.standTerakhir || meter.StandAwal || meter.standAwal || 0
  return Number(val).toLocaleString()
}

function pemakaianDisplay(meter) {
  const val = meter.Pemakaian || meter.pemakaian || 0
  return val > 0 ? `${val} m³` : '-'
}

function statusDisplay(meter) {
  return meter.Status || meter.status || 'Aktif'
}

function badgeVariant(status) {
  const s = (status || '').toLowerCase()
  if (s === 'aktif') return 'success'
  if (s === 'nonaktif') return 'destructive'
  if (s === 'mutasi' || s === 'pindah') return 'warning'
  return 'default'
}

function getRowClass(status) {
  const s = (status || '').toLowerCase()
  if (s === 'aktif') return 'bg-emerald-100/80 dark:bg-emerald-950/50'
  if (s === 'nonaktif') return 'bg-red-100/80 dark:bg-red-950/50'
  if (s === 'mutasi' || s === 'pindah') return 'bg-amber-100/80 dark:bg-amber-950/50'
  return ''
}

function getCardClass(status) {
  const s = (status || '').toLowerCase()
  if (s === 'aktif') return 'bg-emerald-100/80 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900'
  if (s === 'nonaktif') return 'bg-red-100/80 dark:bg-red-950/50 border-red-200 dark:border-red-900'
  if (s === 'mutasi' || s === 'pindah') return 'bg-amber-100/80 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900'
  return 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
}

// Random colors for main meter cards
const meterCardColors = [
  'bg-sky-100 dark:bg-sky-950 border-sky-200 dark:border-sky-800',
  'bg-teal-100 dark:bg-teal-950 border-teal-200 dark:border-teal-800',
  'bg-purple-100 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
  'bg-pink-100 dark:bg-pink-950 border-pink-200 dark:border-pink-800',
  'bg-lime-100 dark:bg-lime-950 border-lime-200 dark:border-lime-800',
  'bg-orange-100 dark:bg-orange-950 border-orange-200 dark:border-orange-800',
]
function getMeterCardColor(item) {
  const id = item.Id || item.id || 0
  return meterCardColors[Number(id) % meterCardColors.length]
}

// Check if warga already has meter
function wargaHasMeter(wargaId) {
  return meterList.value.some(m => (m.WargaId || m.wargaId) === wargaId)
}

// --- Init ---
onMounted(() => {
  app.setPage('meteran')
  fetchMeteran()
  fetchWargaOptions()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Meteran Air</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Kelola data meteran air pelanggan</p>
      </div>
      <div class="flex gap-1.5 flex-wrap">
        <Button variant="default" size="sm" class="text-xs h-8 px-2.5" @click="openCreate">
          <Plus class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Tambah Meter</span>
        </Button>
      </div>
    </div>

    <!-- Stat Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px;">
      <div class="stat-card blue">
        <div class="stat-icon blue"><Gauge class="h-5 w-5" /></div>
        <div class="stat-label">Meter Aktif</div>
        <div class="stat-value">{{ stats.aktif }}</div>
      </div>
      <div class="stat-card red">
        <div class="stat-icon red"><i class="bi bi-slash-circle"></i></div>
        <div class="stat-label">Nonaktif</div>
        <div class="stat-value">{{ stats.nonaktif }}</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon orange"><i class="bi bi-arrow-left-right"></i></div>
        <div class="stat-label">Mutasi</div>
        <div class="stat-value">{{ stats.mutasi }}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon green"><i class="bi bi-bar-chart-fill"></i></div>
        <div class="stat-label">Avg Pemakaian</div>
        <div class="stat-value">{{ stats.avg }} m³</div>
      </div>
    </div>

    <!-- Filter Card -->
    <Card style="margin-bottom: 16px;">
      <div style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 200px;">
          <label class="form-label-custom">Cari Meter / Pelanggan</label>
          <div class="search-wrap">
            <Search class="h-4 w-4 search-icon" />
            <Input
              v-model="search"
              type="text"
              placeholder="No. Meter, nama pelanggan..."
              class-name="search-input"
              @keyup.enter="onSearch"
            />
          </div>
        </div>
        <div style="min-width: 140px;">
          <label class="form-label-custom">Status</label>
          <select v-model="filterStatus" class="form-control-custom" @change="onSearch">
            <option value="">Semua</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
            <option value="Mutasi">Mutasi</option>
          </select>
        </div>
      </div>
    </Card>

    <!-- Table -->
    <Card>
      <div v-if="loading" style="display: flex; justify-content: center; align-items: center; padding: 48px 0;">
        <Loader2 class="h-6 w-6 animate-spin text-slate-400" />
      </div>

      <div v-else-if="meterList.length === 0" style="text-align: center; padding: 48px 0; color: var(--text-muted);">
        <p style="font-size: 14px;">Belum ada data meteran</p>
        <Button variant="outline" size="sm" style="margin-top: 12px;" @click="openCreate">
          <Plus class="h-4 w-4" /> Tambah Meter Pertama
        </Button>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style="padding: 0;">
        <div
          v-for="(item, i) in meterList"
          :key="item.Id || item.id || i"
          :class="['rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col', getMeterCardColor(item)]"
        >
          <!-- Card Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0">
                <Gauge class="h-5 w-5" />
              </div>
              <div class="min-w-0">
                <span class="chip text-xs">{{ noMeterDisplay(item) }}</span>
                <div class="font-semibold text-slate-900 dark:text-slate-100 truncate mt-1">{{ pelangganDisplay(item) }}</div>
              </div>
            </div>
            <Badge :variant="badgeVariant(statusDisplay(item))">{{ statusDisplay(item) }}</Badge>
          </div>

          <!-- Card Body -->
          <div class="flex-1 px-5 py-4 space-y-2">
            <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <MapPin class="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span class="truncate">{{ alamatDisplay(item) }}</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="text-center p-2 bg-white/60 dark:bg-white/5 rounded-lg">
                <p class="text-xs text-slate-400">Stand Akhir</p>
                <p class="font-bold text-slate-700 dark:text-slate-300 text-sm">{{ standDisplay(item) }}</p>
              </div>
              <div class="text-center p-2 bg-white/60 dark:bg-white/5 rounded-lg">
                <p class="text-xs text-slate-400">Pemakaian</p>
                <p class="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{{ pemakaianDisplay(item) }}</p>
              </div>
            </div>
          </div>

          <!-- Card Footer -->
          <div class="flex gap-2 px-5 py-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" class="flex-1 text-xs h-8" @click="openEdit(item)">
              <Pencil class="h-3 w-3" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="flex-1 text-xs h-8"
              :disabled="deletingId === (item.Id || item.id)"
              @click="confirmDelete(item)"
            >
              <Loader2 v-if="deletingId === (item.Id || item.id)" class="h-3 w-3 animate-spin" />
              <Trash2 v-else class="h-3 w-3 text-red-500" />
              Hapus
            </Button>
          </div>
        </div>
      </div>
    </Card>

    <!-- Modal: Create / Edit -->
    <div v-if="showModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background: rgba(0,0,0,0.5);">
      <Card class-name="w-full max-w-3xl mx-4 rounded-xl shadow-2xl" style="max-height: 90vh; overflow-y: auto;">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <span>{{ editingMeter ? 'Edit Meteran' : 'Tambah Meteran' }}</span>
            <button class="close-btn" @click="closeModal" title="Tutup">
              <X class="h-4 w-4" />
            </button>
          </div>
        </template>

        <!-- Two-column layout: Warga list | Form -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-height: 400px;">
          <!-- LEFT: Warga List -->
          <div style="border-right: 1px solid var(--border, #e2e8f0); padding-right: 12px; display: flex; flex-direction: column;">
            <label class="form-label-custom">Pilih Pelanggan <span style="color: red;">*</span></label>
            <!-- Search + Sort -->
            <div style="display: flex; gap: 6px; margin-bottom: 8px;">
              <div class="search-wrap" style="flex: 1;">
                <Search class="h-3.5 w-3.5 search-icon" />
                <input
                  v-model="wargaSearch"
                  type="text"
                  placeholder="Cari nama, NIK, alamat..."
                  class="form-control-custom"
                  style="padding-left: 32px; font-size: 12px;"
                />
              </div>
              <button
                class="sort-btn"
                @click="toggleWargaSort"
                :title="wargaSort === 'nama' ? 'Urut Nama (klik untuk NIK)' : 'Urut NIK (klik untuk Nama)'"
              >
                {{ wargaSort === 'nama' ? 'A-Z' : '#' }}
              </button>
            </div>

            <!-- Selected indicator -->
            <div v-if="selectedWarga" style="background: var(--primary-soft, #e3f2fd); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
              <div>
                <span style="font-weight: 700; color: var(--primary, #1565c0);">✓ {{ selectedWarga.NamaKepalaKK || selectedWarga.nama }}</span>
                <span style="color: var(--text-muted); margin-left: 6px;">{{ selectedWarga.NIK || selectedWarga.nik || '' }}</span>
              </div>
              <button style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px;" @click="selectedWarga = null; form.WargaId = ''" title="Batal pilih">✕</button>
            </div>

            <!-- Scrollable warga list -->
            <div style="flex: 1; overflow-y: auto; max-height: 320px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px;">
              <div v-if="displayedWarga.length === 0" style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
                Tidak ada warga ditemukan
              </div>
              <div
                v-for="w in displayedWarga"
                :key="w.Id || w.id"
                @click="selectWarga(w)"
                :style="{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border, #e2e8f0)',
                  background: (selectedWarga && (selectedWarga.Id || selectedWarga.id) === (w.Id || w.id)) ? 'var(--primary-soft, #e3f2fd)' : wargaHasMeter(w.Id || w.id) ? '#ecfdf5' : 'transparent',
                  transition: 'background 0.1s',
                }"
                class="warga-list-item"
              >
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-soft, #e3f2fd); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--primary, #1565c0); flex-shrink: 0;">
                    {{ (w.NamaKepalaKK || w.nama || '?').charAt(0).toUpperCase() }}
                  </div>
                  <div style="min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span style="font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ w.NamaKepalaKK || w.nama || '-' }}</span>
                      <span v-if="wargaHasMeter(w.Id || w.id)" style="font-size: 10px; background: #10b981; color: #fff; padding: 1px 5px; border-radius: 4px; font-weight: 600; flex-shrink: 0;">✓ Meter</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); display: flex; gap: 8px;">
                      <span>{{ w.NIK || w.nik || '-' }}</span>
                      <span v-if="w.RT || w.rt || w.RW || w.rw">RT {{ w.RT || w.rt || '-' }} / RW {{ w.RW || w.rw || '-' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div v-if="wargaTotalPages > 1" style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 6px; font-size: 11px;">
              <button
                class="page-btn"
                :disabled="wargaPage <= 1"
                @click="wargaPage--"
              >‹</button>
              <span style="color: var(--text-muted); padding: 0 6px;">{{ wargaPage }} / {{ wargaTotalPages }}</span>
              <button
                class="page-btn"
                :disabled="wargaPage >= wargaTotalPages"
                @click="wargaPage++"
              >›</button>
            </div>
          </div>

          <!-- RIGHT: Form -->
          <div style="display: flex; flex-direction: column; gap: 12px; padding-left: 4px;">
            <div>
              <label class="form-label-custom">No. Meteran <span style="color: red;">*</span></label>
              <Input v-model="form.NoMeteran" type="text" placeholder="No. Meteran" />
            </div>

            <div>
              <label class="form-label-custom">Lokasi Pasang</label>
              <Input v-model="form.LokasiPasang" type="text" placeholder="Lokasi pemasangan meter" />
            </div>

            <div>
              <label class="form-label-custom">Tanggal Pasang</label>
              <Input v-model="form.TanggalPasang" type="date" />
            </div>

            <div>
              <label class="form-label-custom">Stand Awal</label>
              <Input v-model.number="form.StandAwal" type="number" placeholder="0" />
            </div>

            <!-- Selected pelanggan info -->
            <div v-if="selectedWarga" style="margin-top: 8px; padding: 10px; background: var(--surface-2, #f5f7fa); border-radius: 8px; font-size: 12px; display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; gap: 6px;">
                <User class="h-3.5 w-3.5 text-slate-400 shrink-0" style="margin-top: 1px;" />
                <span style="font-weight: 600;">{{ selectedWarga.NamaKepalaKK || selectedWarga.nama }}</span>
              </div>
              <div style="display: flex; gap: 6px;">
                <MapPin class="h-3.5 w-3.5 text-slate-400 shrink-0" style="margin-top: 1px;" />
                <span>{{ selectedWarga.Alamat || selectedWarga.alamat || '-' }}</span>
              </div>
              <div style="display: flex; gap: 6px;">
                <Hash class="h-3.5 w-3.5 text-slate-400 shrink-0" style="margin-top: 1px;" />
                <span>RT {{ selectedWarga.RT || selectedWarga.rt || '-' }} / RW {{ selectedWarga.RW || selectedWarga.rw || '-' }}</span>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
            <Button variant="outline" @click="closeModal">Tutup</Button>
            <Button variant="default" @click="handleSave">
              {{ editingMeter ? 'Simpan Perubahan' : 'Simpan' }}
            </Button>
          </div>
        </template>
      </Card>
    </div>

    <!-- Delete Confirmation -->
    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Hapus Meteran"
      :message="meterToDelete ? `Yakin ingin menghapus meteran ${noMeterDisplay(meterToDelete)} milik ${pelangganDisplay(meterToDelete)}?` : ''"
      confirm-text="Ya, Hapus"
      cancel-text="Tidak"
      @confirm="doDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.warga-list-item:hover {
  background: var(--surface-2, #f5f7fa) !important;
}

/* Sort button */
.sort-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  border: 1px solid var(--border, #dde3ec);
  background: var(--surface, #fff);
  color: var(--text-secondary, #5a6a85);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.sort-btn:hover {
  background: var(--primary-soft, #e3f2fd);
  color: var(--primary, #1565c0);
  border-color: var(--primary, #1565c0);
}
[data-theme="dark"] .sort-btn,
.dark .sort-btn {
  background: #1e293b;
  border-color: #334155;
  color: #cbd5e1;
}

/* Page button */
.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--border, #dde3ec);
  background: var(--surface, #fff);
  color: var(--text-secondary, #5a6a85);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;
}
.page-btn:hover:not(:disabled) {
  background: var(--primary-soft, #e3f2fd);
  color: var(--primary, #1565c0);
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
[data-theme="dark"] .page-btn,
.dark .page-btn {
  background: #1e293b;
  border-color: #334155;
  color: #cbd5e1;
}

/* Close button */
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
