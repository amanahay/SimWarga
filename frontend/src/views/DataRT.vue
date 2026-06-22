<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { rtAPI, rtBulkAPI, rwAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Card from '@/components/ui/card/Card.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Input from '@/components/ui/input/Input.vue'
import ConfirmDialog from '@/components/ui/confirm-dialog/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Plus, Pencil, Trash2, Loader2, X, Upload, Copy, Check, MapPin, Building2, Phone } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()

// --- State ---
const rtList = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingRT = ref(null)
const deletingId = ref(null)
const rwOptions = ref([])
const filterRW = ref('')

// Delete confirmation
const showDeleteConfirm = ref(false)
const rtToDelete = ref(null)

const form = reactive({
  RW_Id: '',
  NomorRT: '',
  KetuaRT: '',
  NoHp: '',
  Alamat: '',
  Provinsi: '',
  KotaKab: '',
  Kecamatan: '',
  KelDesa: '',
  NamaKomplek: '',
  Keterangan: '',
})

// --- Bulk Import ---
const showImportModal = ref(false)
const importJsonText = ref('')
const importing = ref(false)
const importResult = ref(null)
const exampleCopied = ref(false)

const bulkExample = JSON.stringify([
  {
    RW_Id: 1,
    NomorRT: "01",
    KetuaRT: "Suparno",
    NoHp: "0811-1111-0001",
    Alamat: "Jl. Melati No. 1",
    Provinsi: "Jawa Barat",
    KotaKab: "Bandung",
    Kecamatan: "Cileunyi",
    KelDesa: "Sukajadi",
    NamaKomplek: "Griya Asri",
    Keterangan: "RT 01 - Blok A dan B"
  },
  {
    RW_Id: 1,
    NomorRT: "03",
    KetuaRT: "Hj. Siti Maryam",
    NoHp: "0811-1111-0002",
    Alamat: "Jl. Mawar No. 5",
    Provinsi: "Jawa Barat",
    KotaKab: "Bandung",
    Kecamatan: "Cileunyi",
    KelDesa: "Sukajadi",
    NamaKomplek: "Griya Asri",
    Keterangan: "RT 03 - Blok C dan D"
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

// --- Data fetching ---
async function fetchRT() {
  loading.value = true
  try {
    const params = {}
    if (filterRW.value) params.rw_id = filterRW.value
    const response = await rtAPI.list(params)
    const result = response.data
    rtList.value = Array.isArray(result) ? result : (result.data || [])
  } catch (err) {
    toast({ title: 'Gagal memuat data', description: err.response?.data?.error || err.message || 'Terjadi kesalahan', variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

async function fetchRWOptions() {
  try {
    const response = await rwAPI.list()
    const result = response.data
    rwOptions.value = Array.isArray(result) ? result : (result.data || [])
  } catch (err) {
    // silently fail; select will just be empty
  }
}

function onFilterChange() {
  fetchRT()
}

// --- Modal helpers ---
function resetForm() {
  form.RW_Id = ''
  form.NomorRT = ''
  form.KetuaRT = ''
  form.NoHp = ''
  form.Alamat = ''
  form.Provinsi = ''
  form.KotaKab = ''
  form.Kecamatan = ''
  form.KelDesa = ''
  form.NamaKomplek = ''
  form.Keterangan = ''
}

function openCreate() {
  resetForm()
  editingRT.value = null
  showModal.value = true
}

function openEdit(rt) {
  editingRT.value = rt
  form.RW_Id = rt.RW_Id || rt.rw_id || ''
  form.NomorRT = rt.NomorRT || rt.nomorRT || ''
  form.KetuaRT = rt.KetuaRT || rt.ketuaRT || ''
  form.NoHp = rt.NoHp || rt.noHp || ''
  form.Alamat = rt.Alamat || rt.alamat || ''
  form.Provinsi = rt.Provinsi || rt.provinsi || ''
  form.KotaKab = rt.KotaKab || rt.kotaKab || ''
  form.Kecamatan = rt.Kecamatan || rt.kecamatan || ''
  form.KelDesa = rt.KelDesa || rt.kelDesa || ''
  form.NamaKomplek = rt.NamaKomplek || rt.namaKomplek || ''
  form.Keterangan = rt.Keterangan || rt.keterangan || ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

// --- CRUD ---
async function handleSave() {
  if (!form.NomorRT.trim()) {
    toast({ title: 'Validasi gagal', description: 'Nomor RT wajib diisi', variant: 'warning' })
    return
  }
  if (!form.RW_Id) {
    toast({ title: 'Validasi gagal', description: 'RW wajib dipilih', variant: 'warning' })
    return
  }
  saving.value = true
  try {
    if (editingRT.value) {
      const id = editingRT.value.Id || editingRT.value.id
      await rtAPI.update(id, form)
      toast({ title: 'RT berhasil diperbarui', description: `Data RT ${form.NomorRT} telah disimpan`, variant: 'success' })
    } else {
      await rtAPI.create(form)
      toast({ title: 'RT berhasil ditambahkan', description: `Data RT ${form.NomorRT} telah ditambahkan`, variant: 'success' })
    }
    closeModal()
    fetchRT()
  } catch (err) {
    toast({ title: 'Gagal menyimpan data', description: err.response?.data?.error || err.message || 'Terjadi kesalahan', variant: 'destructive' })
  } finally {
    saving.value = false
  }
}

async function confirmDelete(rt) {
  rtToDelete.value = rt
  showDeleteConfirm.value = true
}

async function doDelete() {
  const rt = rtToDelete.value
  if (!rt) return
  const id = rt.Id || rt.id
  deletingId.value = id
  showDeleteConfirm.value = false
  try {
    await rtAPI.delete(id)
    toast({ title: 'RT berhasil dihapus', description: 'Data RT telah dihapus dari sistem', variant: 'success' })
    fetchRT()
  } catch (err) {
    toast({ title: 'Gagal menghapus data', description: err.response?.data?.error || err.message || 'Terjadi kesalahan', variant: 'destructive' })
  } finally {
    deletingId.value = null
    rtToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  rtToDelete.value = null
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
    const response = await rtBulkAPI.import(parsed)
    const result = response.data
    const imported = result.imported || result.success || 0
    const skipped = result.skipped || result.failed || 0
    const total = parsed.length
    importResult.value = `Berhasil import ${imported} dari ${total} data${skipped > 0 ? `, ${skipped} dilewati` : ''}`
    toast({ title: 'Import selesai', description: importResult.value, variant: 'success' })
    fetchRT()
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
function nomorDisplay(rt) {
  return rt.NomorRT || rt.nomorRT || '-'
}

function ketuaDisplay(rt) {
  return rt.KetuaRT || rt.ketuaRT || '-'
}

function alamatDisplay(rt) {
  return rt.Alamat || rt.alamat || '-'
}

function komplekDisplay(rt) {
  return rt.NamaKomplek || rt.namaKomplek || '-'
}

function rwDisplay(rt) {
  const rw = rt.RW || rt.rw || rt.NomorRW || rt.nomorRW
  if (rw) return `RW ${rw}`
  if (rt.RW_Id || rt.rw_id) {
    const id = rt.RW_Id || rt.rw_id
    const found = rwOptions.value.find(r => (r.Id || r.id) == id)
    if (found) return `RW ${found.NomorRW || found.nomorRW || id}`
    return `RW #${id}`
  }
  return '-'
}

const rtCardColors = ['indigo','emerald','amber','rose','cyan','violet']
function getRTCardBg(i) {
  const c = rtCardColors[i % rtCardColors.length]
  return `bg-${c}-100 dark:bg-${c}-950 border-${c}-200 dark:border-${c}-800`
}

// --- Init ---
onMounted(() => {
  app.setPage('rt')
  fetchRWOptions()
  fetchRT()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Data RT</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Kelola data Rukun Tetangga di lingkungan Anda</p>
      </div>
      <div class="flex gap-1.5 flex-wrap">
        <Button variant="outline" size="sm" class="text-xs h-8 px-2.5" @click="openImport">
          <Upload class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Import JSON</span>
        </Button>
        <Button variant="default" size="sm" class="text-xs h-8 px-2.5" @click="openCreate">
          <Plus class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Tambah RT</span>
        </Button>
      </div>
    </div>

    <!-- Filter Card -->
    <Card style="margin-bottom: 16px;">
      <div style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;">
        <div style="min-width: 200px;">
          <label class="form-label-custom">Filter by RW</label>
          <select v-model="filterRW" class="form-control-custom" @change="onFilterChange">
            <option value="">Semua RW</option>
            <option v-for="rw in rwOptions" :key="rw.Id || rw.id" :value="rw.Id || rw.id">
              RW {{ rw.NomorRW || rw.nomorRW || (rw.Id || rw.id) }}
            </option>
          </select>
        </div>
      </div>
    </Card>

    <!-- Loading -->
    <div v-if="loading" style="display: flex; justify-content: center; align-items: center; padding: 48px 0;">
      <Loader2 class="h-6 w-6 animate-spin text-slate-400" />
    </div>

    <!-- Empty -->
    <div v-else-if="rtList.length === 0" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" style="text-align: center; padding: 48px 0; color: var(--text-muted);">
      <Plus class="h-8 w-8 mx-auto mb-2 text-slate-300" />
      <p style="font-size: 14px;">Belum ada data RT</p>
      <Button variant="outline" size="sm" style="margin-top: 12px;" @click="openCreate">
        <Plus class="h-4 w-4" /> Tambah RT Pertama
      </Button>
    </div>

    <!-- Card Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="(item, i) in rtList"
        :key="item.Id || item.id || i"
        :class="['rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col', getRTCardBg(i)]"
      >
        <!-- Card Header -->
        <div class="flex items-center gap-3 px-5 py-4 border-b border-white/30 dark:border-white/10">
          <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0">
            RT
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="chip text-xs">RT {{ nomorDisplay(item) }}</span>
              <span class="text-xs text-slate-500 dark:text-slate-400">{{ rwDisplay(item) }}</span>
            </div>
            <div class="font-semibold text-slate-900 dark:text-slate-100 truncate mt-1">{{ ketuaDisplay(item) }}</div>
          </div>
        </div>

        <!-- Card Body -->
        <div class="flex-1 px-5 py-4 space-y-2">
          <div v-if="alamatDisplay(item) !== '-'" class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
            <MapPin class="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
            <span class="line-clamp-2">{{ alamatDisplay(item) }}</span>
          </div>
          <div v-if="komplekDisplay(item) !== '-'" class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Building2 class="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{{ komplekDisplay(item) }}</span>
          </div>
          <div v-if="item.NoHp || item.noHp" class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Phone class="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{{ item.NoHp || item.noHp }}</span>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="flex gap-2 px-5 py-3 border-t border-white/30 dark:border-white/10">
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

    <!-- Modal: Create / Edit -->
    <div v-if="showModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background: rgba(0,0,0,0.5);">
      <Card class-name="w-full max-w-lg mx-4 rounded-xl shadow-2xl" style="max-height: 90vh; overflow-y: auto;">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <span>{{ editingRT ? 'Edit RT' : 'Tambah RT' }}</span>
            <button class="close-btn" @click="closeModal" title="Tutup">
              <X class="h-4 w-4" />
            </button>
          </div>
        </template>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <!-- RW (select) -->
          <div>
            <label class="form-label-custom">RW <span style="color: red;">*</span></label>
            <select v-model="form.RW_Id" class="form-control-custom">
              <option value="">Pilih RW</option>
              <option v-for="rw in rwOptions" :key="rw.Id || rw.id" :value="rw.Id || rw.id">
                RW {{ rw.NomorRW || rw.nomorRW || (rw.Id || rw.id) }} — {{ rw.KetuaRW || rw.ketuaRW || '' }}
              </option>
            </select>
          </div>

          <!-- Nomor RT -->
          <div>
            <label class="form-label-custom">Nomor RT <span style="color: red;">*</span></label>
            <Input v-model="form.NomorRT" type="text" placeholder="Contoh: 01" />
          </div>

          <!-- Ketua RT -->
          <div>
            <label class="form-label-custom">Ketua RT</label>
            <Input v-model="form.KetuaRT" type="text" placeholder="Nama ketua RT" />
          </div>

          <!-- No HP -->
          <div>
            <label class="form-label-custom">No. HP</label>
            <Input v-model="form.NoHp" type="text" placeholder="08xxxxxxxxxx" />
          </div>

          <!-- Alamat Lengkap Section -->
          <div style="border-top: 1px solid var(--border-color, #e2e8f0); margin-top: 4px; padding-top: 12px;">
            <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Alamat Lengkap</h4>

            <!-- Provinsi -->
            <div style="margin-bottom: 12px;">
              <label class="form-label-custom">Provinsi</label>
              <Input v-model="form.Provinsi" type="text" placeholder="Provinsi" />
            </div>

            <!-- Kota/Kab -->
            <div style="margin-bottom: 12px;">
              <label class="form-label-custom">Kota / Kabupaten</label>
              <Input v-model="form.KotaKab" type="text" placeholder="Kota atau Kabupaten" />
            </div>

            <!-- Kecamatan -->
            <div style="margin-bottom: 12px;">
              <label class="form-label-custom">Kecamatan</label>
              <Input v-model="form.Kecamatan" type="text" placeholder="Kecamatan" />
            </div>

            <!-- Kel/Desa -->
            <div style="margin-bottom: 12px;">
              <label class="form-label-custom">Kelurahan / Desa</label>
              <Input v-model="form.KelDesa" type="text" placeholder="Kelurahan atau Desa" />
            </div>

            <!-- Nama Komplek -->
            <div style="margin-bottom: 12px;">
              <label class="form-label-custom">Nama Komplek</label>
              <Input v-model="form.NamaKomplek" type="text" placeholder="Nama komplek / perumahan" />
            </div>

            <!-- Alamat -->
            <div style="margin-bottom: 12px;">
              <label class="form-label-custom">Alamat</label>
              <textarea
                v-model="form.Alamat"
                class="form-control-custom"
                rows="3"
                placeholder="Alamat lengkap"
                style="width: 100%; resize: vertical;"
              ></textarea>
            </div>
          </div>

          <!-- Keterangan -->
          <div>
            <label class="form-label-custom">Keterangan</label>
            <textarea
              v-model="form.Keterangan"
              class="form-control-custom"
              rows="2"
              placeholder="Keterangan tambahan"
              style="width: 100%; resize: vertical;"
            ></textarea>
          </div>
        </div>

        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
            <Button variant="outline" @click="closeModal">Batal</Button>
            <Button variant="default" :disabled="saving" @click="handleSave">
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              {{ saving ? 'Menyimpan...' : (editingRT ? 'Simpan Perubahan' : 'Simpan') }}
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
            <span>Import RT (JSON)</span>
            <button class="close-btn" @click="showImportModal = false" title="Tutup">
              <X class="h-4 w-4" />
            </button>
          </div>
        </template>

        <div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">
            Tempel data JSON RT. Format: array of objects dengan field RW_Id, NomorRT, KetuaRT, NoHp, Alamat, Provinsi, KotaKab, Kecamatan, KelDesa, NamaKomplek, Keterangan.
          </p>

          <!-- Example payload -->
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
            placeholder='[{"RW_Id":1,"NomorRT":"01","KetuaRT":"Suparno","Alamat":"Jl. Melati No. 1"}]'
            style="width: 100%; resize: vertical; font-family: monospace; font-size: 12px;"
          ></textarea>

          <div v-if="importResult" style="margin-top: 12px; padding: 10px 14px; border-radius: 8px; font-size: 13px; background: var(--success-bg, #ecfdf5); color: var(--success-text, #065f46);">
            {{ importResult }}
          </div>
        </div>

        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
            <Button variant="outline" @click="showImportModal = false">Batal</Button>
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
      title="Hapus RT"
      :message="rtToDelete ? `Yakin ingin menghapus RT ${rtToDelete.NomorRT || rtToDelete.nomorRT}? Data yang dihapus tidak dapat dikembalikan.` : ''"
      confirm-text="Ya, Hapus"
      cancel-text="Tidak"
      @confirm="doDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
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
