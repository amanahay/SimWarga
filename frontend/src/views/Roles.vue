<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { rolesAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Input from '@/components/ui/input/Input.vue'
import ConfirmDialog from '@/components/ui/confirm-dialog/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Plus, Pencil, Trash2, Loader2, X, Shield, Users } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()

const roles = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingRole = ref(null)

const showDeleteConfirm = ref(false)
const roleToDelete = ref(null)

const form = reactive({ NamaRole: '', Deskripsi: '' })

async function fetchRoles() {
  loading.value = true
  try {
    const res = await rolesAPI.list()
    roles.value = res.data.data || []
  } catch (e) {
    toast({ title: 'Gagal memuat data', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally { loading.value = false }
}

function openCreate() {
  editingRole.value = null
  form.NamaRole = ''
  form.Deskripsi = ''
  showModal.value = true
}

function openEdit(role) {
  editingRole.value = role
  form.NamaRole = role.NamaRole
  form.Deskripsi = role.Deskripsi || ''
  showModal.value = true
}

async function handleSave() {
  if (!form.NamaRole.trim()) {
    toast({ title: 'Validasi gagal', description: 'Nama role wajib diisi', variant: 'destructive' })
    return
  }
  saving.value = true
  try {
    if (editingRole.value) {
      await rolesAPI.update(editingRole.value.Id, form)
      toast({ title: 'Role berhasil diperbarui', variant: 'success' })
    } else {
      await rolesAPI.create(form)
      toast({ title: 'Role berhasil ditambahkan', variant: 'success' })
    }
    showModal.value = false
    fetchRoles()
  } catch (e) {
    toast({ title: 'Gagal menyimpan', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally { saving.value = false }
}

function confirmDelete(role) {
  roleToDelete.value = role
  showDeleteConfirm.value = true
}

async function doDelete() {
  if (!roleToDelete.value) return
  showDeleteConfirm.value = false
  try {
    await rolesAPI.delete(roleToDelete.value.Id)
    toast({ title: 'Role berhasil dihapus', variant: 'success' })
    fetchRoles()
  } catch (e) {
    toast({ title: 'Gagal menghapus', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally { roleToDelete.value = null }
}

onMounted(() => { app.setPage('roles'); fetchRoles() })
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Roles</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Kelola role dan hak akses pengguna</p>
      </div>
      <Button variant="default" size="sm" class="text-xs h-8 px-2.5" @click="openCreate">
        <Plus class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Tambah Role</span>
      </Button>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Loader2 class="h-8 w-8 animate-spin text-indigo-600" /></div>
    <div v-else-if="roles.length === 0" class="text-center py-20 text-slate-400">
      <Shield class="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Belum ada role</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="(role, i) in roles" :key="role.Id" class="rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col bg-blue-200 dark:bg-blue-950 border-blue-300 dark:border-blue-800">
        <div class="flex items-center gap-3 px-5 py-4 border-b border-white/40 dark:border-white/10">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-300 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            <Shield class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-semibold text-slate-900 dark:text-slate-100">{{ role.NamaRole }}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ role.Deskripsi || '-' }}</div>
          </div>
          <Badge variant="info" class="shrink-0">
            <Users class="h-3 w-3 mr-1" />{{ role.UserCount || 0 }}
          </Badge>
        </div>
        <div class="flex gap-2 px-5 py-3 border-t border-white/30 dark:border-white/10">
          <Button variant="outline" size="sm" class="flex-1 text-xs h-8" @click="openEdit(role)"><Pencil class="h-3 w-3" /> Edit</Button>
          <Button v-if="role.NamaRole !== 'SuperAdmin'" variant="outline" size="sm" class="flex-1 text-xs h-8" @click="confirmDelete(role)"><Trash2 class="h-3 w-3 text-red-500" /> Hapus</Button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background: rgba(0,0,0,0.5);">
      <div class="w-full max-w-md rounded-xl border border-slate-200 shadow-2xl dark:border-slate-800 mx-4 modal-form" style="max-height: 90vh; overflow-y: auto;">
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">{{ editingRole ? 'Edit Role' : 'Tambah Role' }}</h2>
          <button class="close-btn" @click="showModal = false" title="Tutup">&times;</button>
        </div>
        <div class="px-6 py-4 space-y-4">
          <div><label class="form-label-custom">Nama Role <span class="text-red-500">*</span></label><Input v-model="form.NamaRole" placeholder="Contoh: SuperAdmin" /></div>
          <div><label class="form-label-custom">Deskripsi</label><Input v-model="form.Deskripsi" placeholder="Deskripsi role" /></div>
        </div>
        <div class="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <Button variant="outline" @click="showModal = false" :disabled="saving">Tutup</Button>
          <Button @click="handleSave" :disabled="saving"><Loader2 v-if="saving" class="h-4 w-4 animate-spin" />{{ saving ? 'Menyimpan...' : 'Simpan' }}</Button>
        </div>
      </div>
    </div>

    <ConfirmDialog :open="showDeleteConfirm" title="Hapus Role" :message="roleToDelete ? 'Yakin ingin menghapus role ' + roleToDelete.NamaRole + '?' : ''" confirm-text="Ya, Hapus" cancel-text="Tidak" @confirm="doDelete" @cancel="showDeleteConfirm = false" />
  </div>
</template>

<style scoped>
.modal-form { background: #ffffff !important; }
.dark .modal-form { background: #020617 !important; }
.close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border, #dde3ec); background: var(--surface-2, #f5f7fa); color: var(--text-secondary, #5a6a85); cursor: pointer; font-size: 18px; line-height: 1; transition: all 0.15s ease; flex-shrink: 0; }
.close-btn:hover { background: #ef4444; border-color: #ef4444; color: #fff; }
.dark .close-btn { background: #1e293b; border-color: #334155; color: #cbd5e1; }
.dark .close-btn:hover { background: #ef4444; border-color: #ef4444; color: #fff; }
</style>
