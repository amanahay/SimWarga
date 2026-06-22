<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { pengumumanAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Input from '@/components/ui/input/Input.vue'
import ConfirmDialog from '@/components/ui/confirm-dialog/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Megaphone, Plus, Pencil, Trash2, Loader2, Search, X } from 'lucide-vue-next'

const app = useAppStore()
const auth = useAuthStore()
const { toast } = useToast()

const items = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingItem = ref(null)
const showDeleteConfirm = ref(false)
const itemToDelete = ref(null)
const showAdvancedFilter = ref(false)

const query = reactive({
  search: '',
  status: 'Semua',
  kategori: '',
  sortBy: 'CreatedAt',
  sortDir: 'desc',
  page: 1,
  limit: 6,
})

const meta = reactive({
  total: 0,
  totalPages: 1,
})

const isWarga = computed(() => auth.userRole === 'Warga')
const isAdmin = computed(() => ['SuperAdmin', 'Admin'].includes(auth.userRole))
const pageSubtitle = computed(() => isWarga.value
  ? `Informasi resmi untuk akun ${auth.userName}.`
  : 'Kelola konten pengumuman yang tampil di halaman utama'
)

const form = reactive({
  Judul: '',
  Konten: '',
  Kategori: '',
  Status: 'Draft',
  TanggalTampil: '',
})

const pageInfo = computed(() => {
  if (meta.total === 0) return '0 data'
  const start = (query.page - 1) * query.limit + 1
  const end = Math.min(query.page * query.limit, meta.total)
  return `${start}-${end} dari ${meta.total} data`
})

async function fetchItems() {
  loading.value = true
  try {
    const res = await pengumumanAPI.list({
      page: query.page,
      limit: query.limit,
      search: query.search.trim(),
      status: isWarga.value ? 'Published' : query.status,
      kategori: query.kategori.trim(),
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    })
    items.value = res.data.data || []
    meta.total = res.data.total || 0
    meta.totalPages = res.data.totalPages || 1
  } catch (e) {
    toast({ title: 'Gagal memuat pengumuman', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

function applyFilter() {
  query.page = 1
  fetchItems()
}

function resetFilter() {
  query.search = ''
  query.status = isWarga.value ? 'Published' : 'Semua'
  query.kategori = ''
  query.sortBy = 'CreatedAt'
  query.sortDir = 'desc'
  query.page = 1
  fetchItems()
}

function resetForm() {
  form.Judul = ''
  form.Konten = ''
  form.Kategori = ''
  form.Status = 'Draft'
  form.TanggalTampil = new Date().toISOString().slice(0, 10)
}

function openCreate() {
  editingItem.value = null
  resetForm()
  showModal.value = true
}

function openEdit(item) {
  editingItem.value = item
  form.Judul = item.Judul || ''
  form.Konten = item.Konten || ''
  form.Kategori = item.Kategori || ''
  form.Status = item.Status || 'Draft'
  form.TanggalTampil = (item.TanggalTampil || item.CreatedAt || '').slice(0, 10)
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingItem.value = null
}

async function handleSave() {
  if (!form.Judul.trim() || !form.Konten.trim()) {
    toast({ title: 'Validasi gagal', description: 'Judul dan isi pengumuman wajib diisi', variant: 'warning' })
    return
  }

  saving.value = true
  try {
    const payload = {
      Judul: form.Judul.trim(),
      Konten: form.Konten.trim(),
      Kategori: form.Kategori.trim() || null,
      Status: form.Status,
      TanggalTampil: form.TanggalTampil || null,
    }

    if (editingItem.value) {
      await pengumumanAPI.update(editingItem.value.Id, payload)
      toast({ title: 'Pengumuman diperbarui', variant: 'success' })
    } else {
      await pengumumanAPI.create(payload)
      toast({ title: 'Pengumuman ditambahkan', variant: 'success' })
    }

    closeModal()
    fetchItems()
  } catch (e) {
    toast({ title: 'Gagal menyimpan', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(item) {
  itemToDelete.value = item
  showDeleteConfirm.value = true
}

async function doDelete() {
  const item = itemToDelete.value
  if (!item) return
  showDeleteConfirm.value = false
  try {
    await pengumumanAPI.delete(item.Id)
    toast({ title: 'Pengumuman dihapus', variant: 'success' })
    fetchItems()
  } catch (e) {
    toast({ title: 'Gagal menghapus', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    itemToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  itemToDelete.value = null
}

function changePage(nextPage) {
  if (nextPage < 1 || nextPage > meta.totalPages || nextPage === query.page) return
  query.page = nextPage
  fetchItems()
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(String(value).replace(' ', 'T')))
}

function statusVariant(status) {
  if (status === 'Published') return 'success'
  if (status === 'Archived') return 'warning'
  return 'default'
}

onMounted(() => {
  app.setPage('pengumuman')
  if (isWarga.value) {
    query.status = 'Published'
  }
  fetchItems()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-3 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Info & Pengumuman</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">{{ pageSubtitle }}</p>
      </div>
      <Button v-if="isAdmin" variant="default" size="sm" class="text-xs h-8 px-2.5" @click="openCreate">
        <Plus class="h-3.5 w-3.5" /> Tambah Pengumuman
      </Button>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-4 mb-5 shadow-sm">
      <div class="flex flex-col gap-3">
        <div class="flex flex-col md:flex-row gap-3 md:items-end">
          <div class="flex-1">
            <label class="form-label-custom">Cari</label>
            <Input v-model="query.search" placeholder="Judul, isi, kategori..." @keyup.enter="applyFilter" />
          </div>
          <div class="flex flex-wrap gap-2">
            <Button variant="default" size="sm" class="h-9 text-xs" @click="applyFilter">
              <Search class="h-3.5 w-3.5" /> Cari
            </Button>
            <Button variant="outline" size="sm" class="h-9 text-xs" @click="showAdvancedFilter = !showAdvancedFilter">
              <Search class="h-3.5 w-3.5" /> {{ showAdvancedFilter ? 'Sembunyikan Filter' : 'Tampilkan Filter' }}
            </Button>
            <Button variant="outline" size="sm" class="h-9 text-xs" @click="resetFilter">
              <X class="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <div v-if="showAdvancedFilter" class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div v-if="isAdmin">
            <label class="form-label-custom">Status</label>
            <select v-model="query.status" class="form-control-custom" @change="applyFilter">
              <option>Semua</option>
              <option>Draft</option>
              <option>Published</option>
              <option>Archived</option>
            </select>
          </div>
          <div>
            <label class="form-label-custom">Kategori</label>
            <Input v-model="query.kategori" placeholder="Umum" @keyup.enter="applyFilter" />
          </div>
          <div>
            <label class="form-label-custom">Sort</label>
            <select v-model="query.sortBy" class="form-control-custom" @change="applyFilter">
              <option value="CreatedAt">Tanggal dibuat</option>
              <option value="TanggalTampil">Tanggal tampil</option>
              <option value="Judul">Judul</option>
              <option value="Kategori">Kategori</option>
              <option value="Status">Status</option>
            </select>
          </div>
          <div>
            <label class="form-label-custom">Arah</label>
            <select v-model="query.sortDir" class="form-control-custom" @change="applyFilter">
              <option value="desc">Terbaru / Z-A</option>
              <option value="asc">Terlama / A-Z</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
    </div>

    <div v-else-if="items.length === 0" class="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
      <Megaphone class="mx-auto h-10 w-10 text-slate-300 mb-3" />
      <p class="font-semibold text-slate-700">Belum ada pengumuman</p>
      <p class="text-sm text-slate-500 mt-1">Tambah pengumuman baru untuk menampilkannya di halaman utama.</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div
        v-for="item in items"
        :key="item.Id"
        class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div class="p-5 border-b border-slate-100">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <Badge :variant="statusVariant(item.Status)">{{ item.Status || 'Draft' }}</Badge>
                <Badge variant="info">{{ item.Kategori || 'Umum' }}</Badge>
              </div>
              <h2 class="text-base font-bold text-slate-900 leading-snug">{{ item.Judul }}</h2>
            </div>
            <div class="flex gap-1.5 shrink-0">
              <Button v-if="isAdmin" variant="outline" size="sm" class="h-8 px-2" @click="openEdit(item)" title="Edit">
                <Pencil class="h-3.5 w-3.5" />
              </Button>
              <Button v-if="isAdmin" variant="outline" size="sm" class="h-8 px-2" @click="confirmDelete(item)" title="Hapus">
                <Trash2 class="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          </div>
        </div>
        <div class="p-5">
          <p class="text-sm text-slate-600 whitespace-pre-line line-clamp-4">{{ item.Konten }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-xs">
            <div class="rounded-lg bg-slate-50 p-3">
              <div class="font-bold text-slate-500 uppercase tracking-wide mb-1">Tanggal Tampil</div>
              <div class="font-semibold text-slate-800">{{ formatDate(item.TanggalTampil || item.CreatedAt) }}</div>
            </div>
            <div class="rounded-lg bg-slate-50 p-3">
              <div class="font-bold text-slate-500 uppercase tracking-wide mb-1">Dibuat</div>
              <div class="font-semibold text-slate-800">{{ formatDate(item.CreatedAt) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between flex-wrap gap-3 mt-5">
      <p class="text-xs font-semibold text-slate-500">{{ pageInfo }}</p>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" class="h-8 text-xs" :disabled="query.page <= 1" @click="changePage(query.page - 1)">Sebelumnya</Button>
        <span class="text-xs font-bold text-slate-600">Hal {{ query.page }} / {{ meta.totalPages }}</span>
        <Button variant="outline" size="sm" class="h-8 text-xs" :disabled="query.page >= meta.totalPages" @click="changePage(query.page + 1)">Berikutnya</Button>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background: rgba(0,0,0,0.5);">
      <div class="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl mx-4" style="max-height: 90vh; overflow-y: auto;">
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 class="text-lg font-semibold text-slate-900">{{ editingItem ? 'Edit Pengumuman' : 'Tambah Pengumuman' }}</h2>
          <button class="close-btn" @click="closeModal" title="Tutup">&times;</button>
        </div>
        <div class="px-6 py-4 space-y-4">
          <div>
            <label class="form-label-custom">Judul <span class="text-red-500">*</span></label>
            <Input v-model="form.Judul" placeholder="Contoh: Jadwal Kerja Bakti Minggu Ini" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="form-label-custom">Kategori</label>
              <Input v-model="form.Kategori" placeholder="Umum" />
            </div>
            <div>
              <label class="form-label-custom">Status</label>
              <select v-model="form.Status" class="form-control-custom">
                <option>Draft</option>
                <option>Published</option>
                <option>Archived</option>
              </select>
            </div>
            <div>
              <label class="form-label-custom">Tanggal Tampil</label>
              <input v-model="form.TanggalTampil" type="date" class="form-control-custom" />
            </div>
          </div>
          <div>
            <label class="form-label-custom">Isi Pengumuman <span class="text-red-500">*</span></label>
            <textarea v-model="form.Konten" rows="7" class="form-control-custom" placeholder="Tulis isi pengumuman yang akan tampil di halaman utama..."></textarea>
          </div>
        </div>
        <div class="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <Button variant="outline" @click="closeModal" :disabled="saving">Batal</Button>
          <Button @click="handleSave" :disabled="saving">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            {{ saving ? 'Menyimpan...' : 'Simpan' }}
          </Button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Hapus Pengumuman"
      :message="itemToDelete ? 'Yakin ingin menghapus pengumuman ' + itemToDelete.Judul + '?' : ''"
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
</style>
