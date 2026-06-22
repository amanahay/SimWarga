<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { iuranAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Input from '@/components/ui/input/Input.vue'
import ConfirmDialog from '@/components/ui/confirm-dialog/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Plus, Pencil, Trash2, Loader2, Heart, ShieldCheck, PiggyBank, Building2, Trash, Landmark } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()

const iuranList = ref([])
const loading = ref(false)
const showModal = ref(false)
const saving = ref(false)
const editingIuran = ref(null)

// Delete confirmation
const showDeleteConfirm = ref(false)
const iuranToDelete = ref(null)

const form = reactive({
  NamaIuran: '',
  Nominal: 0,
  Periode: 'Bulanan',
  IsWajib: true,
  Keterangan: '',
})

const cardIcons = [Heart, ShieldCheck, PiggyBank, Building2, Landmark, Trash]
const cardColors = ['blue', 'green', 'orange', 'cyan', 'purple', 'red']

function getCardIcon(index) {
  return cardIcons[index % cardIcons.length]
}

function getCardColor(index) {
  return cardColors[index % cardColors.length]
}

function getCardColorClass(color) {
  const map = {
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300',
    green: 'text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-300',
    orange: 'text-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300',
    cyan: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40 dark:text-cyan-300',
    purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300',
  }
  return map[color] || 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300'
}

function selectAllText(e) {
  e.target.select()
}

async function fetchIuran() {
  loading.value = true
  try {
    const res = await iuranAPI.list()
    iuranList.value = res.data.data || []
  } catch (e) {
    toast({ title: 'Gagal memuat data', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingIuran.value = null
  form.NamaIuran = ''
  form.Nominal = 0
  form.Periode = 'Bulanan'
  form.IsWajib = true
  form.Keterangan = ''
  showModal.value = true
}

function openEdit(item) {
  editingIuran.value = item
  form.NamaIuran = item.NamaIuran
  form.Nominal = item.Nominal
  form.Periode = item.Periode || 'Bulanan'
  form.IsWajib = Boolean(item.IsWajib)
  form.Keterangan = item.Keterangan || ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingIuran.value = null
}

async function handleSave() {
  if (!form.NamaIuran.trim()) {
    toast({ title: 'Validasi gagal', description: 'Nama Iuran wajib diisi', variant: 'destructive' })
    return
  }
  if (!form.Nominal && form.Nominal !== 0) {
    toast({ title: 'Validasi gagal', description: 'Nominal iuran wajib diisi', variant: 'destructive' })
    return
  }

  saving.value = true
  try {
    const payload = {
      NamaIuran: form.NamaIuran.trim(),
      Nominal: Number(form.Nominal),
      Periode: form.Periode,
      IsWajib: form.IsWajib,
      Keterangan: form.Keterangan.trim(),
    }

    if (editingIuran.value) {
      await iuranAPI.update(editingIuran.value.Id, payload)
      toast({ title: 'Iuran berhasil diperbarui', variant: 'success' })
    } else {
      await iuranAPI.create(payload)
      toast({ title: 'Iuran berhasil ditambahkan', variant: 'success' })
    }

    closeModal()
    await fetchIuran()
  } catch (e) {
    toast({ title: 'Gagal menyimpan', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(item) {
  iuranToDelete.value = item
  showDeleteConfirm.value = true
}

async function doDelete() {
  const item = iuranToDelete.value
  if (!item) return
  showDeleteConfirm.value = false
  try {
    await iuranAPI.delete(item.Id)
    iuranList.value = iuranList.value.filter(i => i.Id !== item.Id)
    toast({ title: 'Iuran berhasil dihapus', variant: 'success' })
  } catch (e) {
    iuranList.value = iuranList.value.filter(i => i.Id !== item.Id)
    toast({ title: 'Iuran dihapus dari tampilan', description: e.response?.data?.error || e.message, variant: 'warning' })
  } finally {
    iuranToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  iuranToDelete.value = null
}

function formatRp(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

onMounted(() => {
  app.setPage('iuran')
  fetchIuran()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Jenis Iuran</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Kelola jenis iuran warga di lingkungan Anda</p>
      </div>
      <Button variant="default" size="sm" class="text-xs h-8 px-2.5" @click="openCreate">
        <Plus class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Tambah Iuran</span>
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
    </div>

    <!-- Empty State -->
    <div v-else-if="iuranList.length === 0" class="card" style="margin-bottom: 16px;">
      <div class="card-body text-center py-12 text-slate-500">
        <PiggyBank class="mx-auto h-10 w-10 mb-3 text-slate-300" />
        <p class="text-base font-medium">Belum ada jenis iuran</p>
        <p class="text-sm">Klik "Tambah Iuran" untuk menambahkan jenis iuran baru.</p>
      </div>
    </div>

    <!-- Iuran Cards Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="(item, index) in iuranList"
        :key="item.Id"
        class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col"
      >
        <!-- Card Header -->
        <div class="flex items-center gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div :class="['rounded-xl p-3 shrink-0', getCardColorClass(getCardColor(index))]">
            <component :is="getCardIcon(index)" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <div class="font-semibold text-slate-900 dark:text-slate-50 truncate">{{ item.NamaIuran }}</div>
            <div v-if="item.Keterangan" class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ item.Keterangan }}</div>
          </div>
        </div>

        <!-- Card Body -->
        <div class="flex-1 px-5 py-4 space-y-3">
          <div>
            <div class="text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">Nominal</div>
            <div class="text-2xl font-bold text-slate-900 dark:text-slate-50">{{ formatRp(item.Nominal) }}</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Badge variant="info">{{ item.Periode || 'Bulanan' }}</Badge>
            <Badge :variant="item.IsWajib ? 'success' : 'default'">
              {{ item.IsWajib ? 'Wajib' : 'Opsional' }}
            </Badge>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="flex gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" class="flex-1 text-xs h-8" @click="openEdit(item)">
            <Pencil class="h-3 w-3" /> Edit
          </Button>
          <Button variant="destructive" size="sm" class="flex-1 text-xs h-8" @click="confirmDelete(item)">
            <Trash2 class="h-3 w-3" /> Hapus
          </Button>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background: rgba(0,0,0,0.5);">
      <div class="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 mx-4" style="max-height: 90vh; overflow-y: auto;">
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {{ editingIuran ? 'Edit Iuran' : 'Tambah Iuran' }}
          </h2>
          <button class="close-btn" @click="closeModal" title="Tutup">&times;</button>
        </div>

        <div class="px-6 py-4 space-y-4">
          <div>
            <label class="form-label-custom">Nama Iuran <span class="text-red-500">*</span></label>
            <Input v-model="form.NamaIuran" placeholder="Contoh: Kebersihan, Keamanan, Kas RT" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label-custom">Nominal <span class="text-red-500">*</span></label>
              <input
                v-model="form.Nominal"
                type="number"
                placeholder="0"
                class="form-control-custom"
                @focus="selectAllText"
              />
            </div>
            <div>
              <label class="form-label-custom">Periode</label>
              <select v-model="form.Periode" class="form-control-custom">
                <option value="Bulanan">Bulanan</option>
                <option value="Tahunan">Tahunan</option>
                <option value="Insidentil">Insidentil</option>
              </select>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <input
              id="is-wajib"
              v-model="form.IsWajib"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
            />
            <label for="is-wajib" class="form-label-custom mb-0 cursor-pointer">Iuran Wajib</label>
          </div>
          <div>
            <label class="form-label-custom">Keterangan</label>
            <textarea v-model="form.Keterangan" rows="3" placeholder="Deskripsi atau keterangan tambahan..." class="form-control-custom"></textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <Button variant="outline" @click="closeModal" :disabled="saving">Tutup</Button>
          <Button @click="handleSave" :disabled="saving">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            {{ saving ? 'Menyimpan...' : 'Simpan' }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Hapus Iuran"
      :message="iuranToDelete ? 'Yakin ingin menghapus iuran ' + iuranToDelete.NamaIuran + '?' : ''"
      confirm-text="Ya, Hapus"
      cancel-text="Tidak"
      @confirm="doDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
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
