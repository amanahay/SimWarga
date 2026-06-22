<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { rwAPI, rwBulkAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Card from '@/components/ui/card/Card.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Input from '@/components/ui/input/Input.vue'
import ConfirmDialog from '@/components/ui/confirm-dialog/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Plus, Pencil, Trash2, Loader2, X, Upload, Copy, Check, Phone, User, Hash } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()

// --- State ---
const rwList = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingRW = ref(null)
const deletingId = ref(null)

// Delete confirmation
const showDeleteConfirm = ref(false)
const rwToDelete = ref(null)

const form = reactive({
  NomorRW: '',
  KetuaRW: '',
  NoHp: '',
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
    NomorRW: "007",
    KetuaRW: "H. Ahmad Suherman",
    NoHp: "0812-1111-2222",
    Keterangan: "RW 07 Kelurahan Sukajadi"
  },
  {
    NomorRW: "008",
    KetuaRW: "Drs. Budi Hartono",
    NoHp: "0813-2222-3333",
    Keterangan: "RW 08 Kelurahan Sukajadi"
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
async function fetchRW() {
  loading.value = true
  try {
    const response = await rwAPI.list()
    const result = response.data
    rwList.value = Array.isArray(result) ? result : (result.data || [])
  } catch (err) {
    toast({ title: 'Gagal memuat data', description: err.response?.data?.error || err.message || 'Terjadi kesalahan', variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

// --- Modal helpers ---
function resetForm() {
  form.NomorRW = ''
  form.KetuaRW = ''
  form.NoHp = ''
  form.Keterangan = ''
}

function openCreate() {
  resetForm()
  editingRW.value = null
  showModal.value = true
}

function openEdit(rw) {
  editingRW.value = rw
  form.NomorRW = rw.NomorRW || rw.nomorRW || ''
  form.KetuaRW = rw.KetuaRW || rw.ketuaRW || ''
  form.NoHp = rw.NoHp || rw.noHp || ''
  form.Keterangan = rw.Keterangan || rw.keterangan || ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

// --- CRUD ---
async function handleSave() {
  if (!form.NomorRW.trim()) {
    toast({ title: 'Validasi gagal', description: 'Nomor RW wajib diisi', variant: 'warning' })
    return
  }
  saving.value = true
  try {
    if (editingRW.value) {
      const id = editingRW.value.Id || editingRW.value.id
      await rwAPI.update(id, form)
      toast({ title: 'RW berhasil diperbarui', description: `Data RW ${form.NomorRW} telah disimpan`, variant: 'success' })
    } else {
      await rwAPI.create(form)
      toast({ title: 'RW berhasil ditambahkan', description: `Data RW ${form.NomorRW} telah ditambahkan`, variant: 'success' })
    }
    closeModal()
    fetchRW()
  } catch (err) {
    toast({ title: 'Gagal menyimpan data', description: err.response?.data?.error || err.message || 'Terjadi kesalahan', variant: 'destructive' })
  } finally {
    saving.value = false
  }
}

async function confirmDelete(rw) {
  rwToDelete.value = rw
  showDeleteConfirm.value = true
}

async function doDelete() {
  const rw = rwToDelete.value
  if (!rw) return
  const id = rw.Id || rw.id
  deletingId.value = id
  showDeleteConfirm.value = false
  try {
    await rwAPI.delete(id)
    toast({ title: 'RW berhasil dihapus', description: `Data RW telah dihapus dari sistem`, variant: 'success' })
    fetchRW()
  } catch (err) {
    toast({ title: 'Gagal menghapus data', description: err.response?.data?.error || err.message || 'Terjadi kesalahan', variant: 'destructive' })
  } finally {
    deletingId.value = null
    rwToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  rwToDelete.value = null
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
    const response = await rwBulkAPI.import(parsed)
    const result = response.data
    const imported = result.imported || result.success || 0
    const skipped = result.skipped || result.failed || 0
    const total = parsed.length
    importResult.value = `Berhasil import ${imported} dari ${total} data${skipped > 0 ? `, ${skipped} dilewati` : ''}`
    toast({ title: 'Import selesai', description: importResult.value, variant: 'success' })
    fetchRW()
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
function nomorDisplay(rw) {
  return rw.NomorRW || rw.nomorRW || '-'
}

function ketuaDisplay(rw) {
  return rw.KetuaRW || rw.ketuaRW || '-'
}

function noHpDisplay(rw) {
  return rw.NoHp || rw.noHp || '-'
}

function keteranganDisplay(rw) {
  return rw.Keterangan || rw.keterangan || '-'
}

function statusDisplay(rw) {
  return rw.Status || rw.status || 'Aktif'
}

function badgeVariant(status) {
  const s = (status || '').toLowerCase()
  if (s === 'aktif') return 'success'
  if (s === 'nonaktif') return 'destructive'
  return 'default'
}

const rwCardColors = [
  'bg-indigo-100 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800',
  'bg-emerald-100 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
  'bg-amber-100 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
  'bg-rose-100 dark:bg-rose-950 border-rose-200 dark:border-rose-800',
  'bg-cyan-100 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800',
  'bg-violet-100 dark:bg-violet-950 border-violet-200 dark:border-violet-800',
]
function getRWCardColor(item) {
  const id = item.Id || item.id || 0
  return rwCardColors[Number(id) % rwCardColors.length]
}

// --- Init ---
onMounted(() => {
  app.setPage('rw')
  fetchRW()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Data RW</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Kelola data Rukun Warga di lingkungan Anda</p>
      </div>
      <div class="flex gap-1.5 flex-wrap">
        <Button variant="outline" size="sm" class="text-xs h-8 px-2.5" @click="openImport">
          <Upload class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Import JSON</span>
        </Button>
        <Button variant="default" size="sm" class="text-xs h-8 px-2.5" @click="openCreate">
          <Plus class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Tambah RW</span>
        </Button>
      </div>
    </div>

    <!-- Table -->
    <Card style="margin-bottom: 16px;">
      <!-- Loading -->
      <div v-if="loading" style="display: flex; justify-content: center; align-items: center; padding: 48px 0;">
        <Loader2 class="h-6 w-6 animate-spin text-slate-400" />
      </div>

      <!-- Empty -->
      <div v-else-if="rwList.length === 0" style="text-align: center; padding: 48px 0; color: var(--text-muted);">
        <Plus class="h-8 w-8 mx-auto mb-2 text-slate-300" />
        <p style="font-size: 14px;">Belum ada data RW</p>
        <Button variant="outline" size="sm" style="margin-top: 12px;" @click="openCreate">
          <Plus class="h-4 w-4" /> Tambah RW Pertama
        </Button>
      </div>

      <!-- Table Body -->
      <!-- Card Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style="padding: 0;">
        <div
          v-for="(item, i) in rwList"
          :key="item.Id || item.id || i"
          :class="['rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col', getRWCardColor(item)]"
        >
          <!-- Card Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-white/30 dark:border-white/10">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm shrink-0">
                <Hash class="h-4 w-4" />
              </div>
              <div class="min-w-0">
                <span class="chip text-xs">RW {{ nomorDisplay(item) }}</span>
                <div class="font-semibold text-slate-900 dark:text-slate-100 truncate mt-1">{{ ketuaDisplay(item) }}</div>
              </div>
            </div>
            <Badge :variant="badgeVariant(statusDisplay(item))">{{ statusDisplay(item) }}</Badge>
          </div>

          <!-- Card Body -->
          <div class="flex-1 px-5 py-4 space-y-2">
            <div v-if="noHpDisplay(item) !== '-'" class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Phone class="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{{ noHpDisplay(item) }}</span>
            </div>
            <div v-if="keteranganDisplay(item) !== '-'" class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
              <User class="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
              <span class="line-clamp-2">{{ keteranganDisplay(item) }}</span>
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
    </Card>

    <!-- Modal: Create / Edit -->
    <div v-if="showModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background: rgba(0,0,0,0.5);">
      <Card class-name="w-full max-w-lg mx-4 rounded-xl shadow-2xl" style="max-height: 90vh; overflow-y: auto;">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <span>{{ editingRW ? 'Edit RW' : 'Tambah RW' }}</span>
            <button class="close-btn" @click="closeModal" title="Tutup">
              <X class="h-4 w-4" />
            </button>
          </div>
        </template>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <!-- Nomor RW -->
          <div>
            <label class="form-label-custom">Nomor RW <span style="color: red;">*</span></label>
            <Input v-model="form.NomorRW" type="text" placeholder="Contoh: 007" />
          </div>

          <!-- Ketua RW -->
          <div>
            <label class="form-label-custom">Ketua RW</label>
            <Input v-model="form.KetuaRW" type="text" placeholder="Nama ketua RW" />
          </div>

          <!-- No HP -->
          <div>
            <label class="form-label-custom">No. HP</label>
            <Input v-model="form.NoHp" type="text" placeholder="08xxxxxxxxxx" />
          </div>

          <!-- Keterangan -->
          <div>
            <label class="form-label-custom">Keterangan</label>
            <textarea
              v-model="form.Keterangan"
              class="form-control-custom"
              rows="3"
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
              {{ saving ? 'Menyimpan...' : (editingRW ? 'Simpan Perubahan' : 'Simpan') }}
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
            <span>Import RW (JSON)</span>
            <button class="close-btn" @click="showImportModal = false" title="Tutup">
              <X class="h-4 w-4" />
            </button>
          </div>
        </template>

        <div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">
            Tempel data JSON RW. Format: array of objects dengan field NomorRW, KetuaRW, NoHp, Keterangan.
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
            placeholder='[{"NomorRW":"007","KetuaRW":"H. Ahmad","NoHp":"0812-...","Keterangan":"RW 07"}]'
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
      title="Hapus RW"
      :message="rwToDelete ? `Yakin ingin menghapus RW ${rwToDelete.NomorRW || rwToDelete.nomorRW}? Data yang dihapus tidak dapat dikembalikan.` : ''"
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
