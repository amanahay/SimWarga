<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { tarifAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Input from '@/components/ui/input/Input.vue'
import ConfirmDialog from '@/components/ui/confirm-dialog/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Plus, Pencil, Trash2, Loader2, DollarSign, Hash } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()

const tarifList = ref([])
const loading = ref(false)
const showModal = ref(false)
const saving = ref(false)
const editingTarif = ref(null)

// Delete confirmation
const showDeleteConfirm = ref(false)
const tarifToDelete = ref(null)

const form = reactive({
  NamaTarif: '',
  HargaPerM3: 0,
  BiayaAdmin: 0,
  BiayaMinimum: 0,
  MinimumM3: 0,
})

async function fetchTarif() {
  loading.value = true
  try {
    const res = await tarifAPI.list()
    tarifList.value = res.data.data || []
  } catch (e) {
    toast({ title: 'Gagal memuat data', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingTarif.value = null
  form.NamaTarif = ''
  form.HargaPerM3 = 0
  form.BiayaAdmin = 0
  form.BiayaMinimum = 0
  form.MinimumM3 = 0
  showModal.value = true
}

function openEdit(item) {
  editingTarif.value = item
  form.NamaTarif = item.NamaTarif
  form.HargaPerM3 = item.HargaPerM3
  form.BiayaAdmin = item.BiayaAdmin || 0
  form.BiayaMinimum = item.BiayaMinimum || 0
  form.MinimumM3 = item.MinimumM3 || 0
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingTarif.value = null
}

async function handleSave() {
  if (!form.NamaTarif.trim()) {
    toast({ title: 'Validasi gagal', description: 'Nama Tarif wajib diisi', variant: 'destructive' })
    return
  }
  if (!form.HargaPerM3 && form.HargaPerM3 !== 0) {
    toast({ title: 'Validasi gagal', description: 'Harga per M³ wajib diisi', variant: 'destructive' })
    return
  }

  saving.value = true
  try {
    const payload = {
      NamaTarif: form.NamaTarif.trim(),
      HargaPerM3: Number(form.HargaPerM3),
      BiayaAdmin: Number(form.BiayaAdmin),
      BiayaMinimum: Number(form.BiayaMinimum),
      MinimumM3: Number(form.MinimumM3),
    }

    if (editingTarif.value) {
      await tarifAPI.update(editingTarif.value.Id, payload)
      toast({ title: 'Tarif berhasil diperbarui', variant: 'success' })
    } else {
      await tarifAPI.create(payload)
      toast({ title: 'Tarif berhasil ditambahkan', variant: 'success' })
    }

    closeModal()
    await fetchTarif()
  } catch (e) {
    toast({ title: 'Gagal menyimpan', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(item) {
  tarifToDelete.value = item
  showDeleteConfirm.value = true
}

async function doDelete() {
  const item = tarifToDelete.value
  if (!item) return
  showDeleteConfirm.value = false
  try {
    await tarifAPI.delete(item.Id)
    tarifList.value = tarifList.value.filter(t => t.Id !== item.Id)
    toast({ title: 'Tarif berhasil dihapus', variant: 'success' })
  } catch (e) {
    tarifList.value = tarifList.value.filter(t => t.Id !== item.Id)
    toast({ title: 'Tarif dihapus dari tampilan', description: e.response?.data?.error || e.message, variant: 'warning' })
  } finally {
    tarifToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  tarifToDelete.value = null
}

function formatRp(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

onMounted(() => {
  app.setPage('tarif')
  fetchTarif()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Tarif Air</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Kelola tarif pemakaian air</p>
      </div>
      <Button variant="default" size="sm" class="text-xs h-8 px-2.5" @click="openCreate">
        <Plus class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Tambah Tarif</span>
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
    </div>

    <!-- Empty State -->
    <div v-else-if="tarifList.length === 0" class="col-span-full text-center py-20 text-slate-400 dark:text-slate-500">
      <DollarSign class="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p class="text-lg font-medium">Belum ada data</p>
      <p class="text-sm">Klik tombol tambah untuk menambahkan data baru</p>
    </div>

    <!-- Card Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="t in tarifList"
        :key="t.Id"
        class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all p-5 flex flex-col gap-3"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
              <DollarSign class="h-6 w-6" />
            </div>
            <div>
              <h3 class="font-bold text-slate-900 dark:text-slate-100 text-lg">{{ t.NamaTarif || t.namaTarif }}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Kode: {{ t.Id }}</p>
            </div>
          </div>
          <Badge variant="success">Aktif</Badge>
        </div>

        <div class="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 dark:border-slate-800">
          <div class="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p class="text-xs text-slate-400">Harga/m³</p>
            <p class="font-bold text-indigo-600 dark:text-indigo-400 text-lg">Rp {{ (t.HargaPerM3 || t.hargaPerM3 || 0).toLocaleString('id-ID') }}</p>
          </div>
          <div class="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p class="text-xs text-slate-400">Biaya Admin</p>
            <p class="font-bold text-slate-700 dark:text-slate-300 text-lg">Rp {{ (t.BiayaAdmin || t.biayaAdmin || 0).toLocaleString('id-ID') }}</p>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Hash class="h-4 w-4" />
            <span>Min {{ t.MinimumM3 || t.minimumM3 || 0 }} m³</span>
          </div>
          <div class="flex gap-1">
            <Button variant="outline" size="sm" class="text-xs h-7 px-2" @click="openEdit(t)">
              <Pencil class="h-3 w-3" /> Edit
            </Button>
            <Button variant="outline" size="sm" class="text-xs h-7 px-2" @click="confirmDelete(t)">
              <Trash2 class="h-3 w-3 text-red-500" /> Hapus
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background: rgba(0,0,0,0.5);">
      <div class="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 mx-4" style="max-height: 90vh; overflow-y: auto;">
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {{ editingTarif ? 'Edit Tarif' : 'Tambah Tarif' }}
          </h2>
          <button class="close-btn" @click="closeModal" title="Tutup">&times;</button>
        </div>

        <div class="px-6 py-4 space-y-4">
          <div>
            <label class="form-label-custom">Nama Tarif <span class="text-red-500">*</span></label>
            <Input v-model="form.NamaTarif" placeholder="Contoh: Rumah Tangga, Sosial, Komersial" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label-custom">Harga per M³ <span class="text-red-500">*</span></label>
              <Input v-model="form.HargaPerM3" type="number" placeholder="0" />
            </div>
            <div>
              <label class="form-label-custom">Biaya Admin</label>
              <Input v-model="form.BiayaAdmin" type="number" placeholder="0" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label-custom">Biaya Minimum</label>
              <Input v-model="form.BiayaMinimum" type="number" placeholder="0" />
            </div>
            <div>
              <label class="form-label-custom">Minimum M³</label>
              <Input v-model="form.MinimumM3" type="number" placeholder="0" />
            </div>
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
      title="Hapus Tarif"
      :message="tarifToDelete ? 'Yakin ingin menghapus tarif ' + tarifToDelete.NamaTarif + '?' : ''"
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
