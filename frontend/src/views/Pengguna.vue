<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { usersAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Input from '@/components/ui/input/Input.vue'
import ConfirmDialog from '@/components/ui/confirm-dialog/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Plus, Pencil, Trash2, Loader2, X, Shield, Mail, Clock } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()

const users = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingUser = ref(null)

const showDeleteConfirm = ref(false)
const userToDelete = ref(null)

const form = reactive({
  Username: '',
  Email: '',
  NamaLengkap: '',
  Password: '',
  Role: 'Warga',
})

const roleOptions = ['SuperAdmin', 'Admin', 'Bendahara', 'Kasir', 'Petugas', 'Warga']
const cardColors = ['indigo', 'emerald', 'amber', 'rose', 'cyan', 'violet']

function getCardBg(index) {
  const c = cardColors[index % cardColors.length]
  return `bg-${c}-100 dark:bg-${c}-950 border-${c}-200 dark:border-${c}-800`
}

function getAvatarBg(role) {
  const m = {
    SuperAdmin: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300',
    Admin: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
    Bendahara: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300',
    Kasir: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-300',
    Petugas: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300',
    Warga: 'bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300',
  }
  return m[role] || 'bg-slate-100 text-slate-600'
}

function getRoleColor(role) {
  const m = {
    SuperAdmin: 'bg-purple-600',
    Admin: 'bg-blue-600',
    Bendahara: 'bg-emerald-600',
    Kasir: 'bg-cyan-600',
    Petugas: 'bg-amber-600',
    Warga: 'bg-slate-600',
  }
  return m[role] || 'bg-slate-600'
}

async function fetchUsers() {
  loading.value = true
  try {
    const res = await usersAPI.list()
    users.value = res.data.data || []
  } catch (e) {
    toast({ title: 'Gagal memuat data', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingUser.value = null
  form.Username = ''
  form.Email = ''
  form.NamaLengkap = ''
  form.Password = ''
  form.Role = 'Warga'
  showModal.value = true
}

function openEdit(user) {
  editingUser.value = user
  form.Username = user.Username
  form.Email = user.Email || ''
  form.NamaLengkap = user.NamaLengkap
  form.Password = ''
  form.Role = user.Role || 'Warga'
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function handleSave() {
  if (!form.Username.trim() || !form.NamaLengkap.trim()) {
    toast({ title: 'Validasi gagal', description: 'Username dan Nama Lengkap wajib diisi', variant: 'destructive' })
    return
  }
  if (!editingUser.value && !form.Password) {
    toast({ title: 'Validasi gagal', description: 'Password wajib diisi untuk pengguna baru', variant: 'destructive' })
    return
  }
  saving.value = true
  try {
    const payload = {
      Username: form.Username.trim(),
      Email: form.Email.trim() || null,
      NamaLengkap: form.NamaLengkap.trim(),
      Password: form.Password || undefined,
      Role: form.Role,
    }
    if (editingUser.value) {
      await usersAPI.update(editingUser.value.Id, payload)
      toast({ title: 'Pengguna berhasil diperbarui', variant: 'success' })
    } else {
      await usersAPI.create(payload)
      toast({ title: 'Pengguna berhasil ditambahkan', variant: 'success' })
    }
    closeModal()
    fetchUsers()
  } catch (e) {
    toast({ title: 'Gagal menyimpan', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(user) {
  userToDelete.value = user
  showDeleteConfirm.value = true
}

async function doDelete() {
  const user = userToDelete.value
  if (!user) return
  showDeleteConfirm.value = false
  try {
    await usersAPI.delete(user.Id)
    toast({ title: 'Pengguna berhasil dihapus', variant: 'success' })
    fetchUsers()
  } catch (e) {
    toast({ title: 'Gagal menghapus', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    userToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  userToDelete.value = null
}

function nameDisplay(u) {
  return u.NamaLengkap || u.nama || '-'
}

function avatar(u) {
  const name = nameDisplay(u)
  const parts = name.split(' ')
  return parts.length > 1 ? parts[0][0] + parts[1][0] : name.substring(0, 2).toUpperCase()
}

function lastLogin(u) {
  return u.LastLoginAt || u.lastLogin || '-'
}

onMounted(() => {
  app.setPage('users')
  fetchUsers()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Pengguna</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Manajemen pengguna dan hak akses aplikasi</p>
      </div>
      <Button variant="default" size="sm" class="text-xs h-8 px-2.5" @click="openCreate">
        <Plus class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Tambah User</span>
      </Button>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
    </div>

    <div v-else-if="users.length === 0" class="text-center py-20 text-slate-400">
      <Shield class="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>Belum ada pengguna</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="(user, i) in users"
        :key="user.Id"
        :class="['rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col', getCardBg(i)]"
      >
        <div class="flex items-center justify-between px-5 py-4 border-b border-white/30 dark:border-white/10">
          <div class="flex items-center gap-3 min-w-0">
            <div :class="['w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0', getAvatarBg(user.Role)]">
              {{ avatar(user) }}
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-slate-900 dark:text-slate-100 truncate">{{ nameDisplay(user) }}</div>
              <span :class="['inline-block text-xs text-white px-2 py-0.5 rounded-full mt-1', getRoleColor(user.Role)]">{{ user.Role || '-' }}</span>
            </div>
          </div>
          <Badge :variant="user.IsAktif ? 'success' : 'destructive'">{{ user.IsAktif ? 'Aktif' : 'Nonaktif' }}</Badge>
        </div>

        <div class="flex-1 px-5 py-4 space-y-2">
          <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Mail class="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span class="truncate">{{ user.Email || user.Username || '-' }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
            <Clock class="h-3 w-3 shrink-0" />
            <span>Login: {{ lastLogin(user) }}</span>
          </div>
        </div>

        <div class="flex gap-2 px-5 py-3 border-t border-white/30 dark:border-white/10">
          <Button variant="outline" size="sm" class="flex-1 text-xs h-8" @click="openEdit(user)">
            <Pencil class="h-3 w-3" /> Edit
          </Button>
          <Button v-if="user.Role !== 'SuperAdmin'" variant="outline" size="sm" class="flex-1 text-xs h-8" @click="confirmDelete(user)">
            <Trash2 class="h-3 w-3 text-red-500" /> Hapus
          </Button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background: rgba(0,0,0,0.5);">
      <div class="w-full max-w-lg rounded-xl border border-slate-200 shadow-2xl dark:border-slate-800 mx-4 modal-form" style="max-height: 90vh; overflow-y: auto;">
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">{{ editingUser ? 'Edit Pengguna' : 'Tambah Pengguna' }}</h2>
          <button class="close-btn" @click="closeModal" title="Tutup">&times;</button>
        </div>
        <div class="px-6 py-4 space-y-4">
          <div>
            <label class="form-label-custom">Username <span class="text-red-500">*</span></label>
            <Input v-model="form.Username" placeholder="Username" :disabled="!!editingUser" />
          </div>
          <div>
            <label class="form-label-custom">Nama Lengkap <span class="text-red-500">*</span></label>
            <Input v-model="form.NamaLengkap" placeholder="Nama lengkap" />
          </div>
          <div>
            <label class="form-label-custom">Email</label>
            <Input v-model="form.Email" type="email" placeholder="Email (opsional)" />
          </div>
          <div>
            <label class="form-label-custom">Password <span v-if="!editingUser" class="text-red-500">*</span></label>
            <Input v-model="form.Password" type="password" :placeholder="editingUser ? 'Kosongkan jika tidak diubah' : 'Password'" />
          </div>
          <div>
            <label class="form-label-custom">Role</label>
            <select v-model="form.Role" class="form-control-custom">
              <option v-for="r in roleOptions" :key="r" :value="r">{{ r }}</option>
            </select>
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

    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Hapus Pengguna"
      :message="userToDelete ? 'Yakin ingin menghapus pengguna ' + nameDisplay(userToDelete) + '?' : ''"
      confirm-text="Ya, Hapus"
      cancel-text="Tidak"
      @confirm="doDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.modal-form {
  background: #ffffff !important;
}
.dark .modal-form {
  background: #020617 !important;
}
.close-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid var(--border, #dde3ec);
  background: var(--surface-2, #f5f7fa);
  color: var(--text-secondary, #5a6a85);
  cursor: pointer; font-size: 18px; line-height: 1;
  transition: all 0.15s ease; flex-shrink: 0;
}
.close-btn:hover { background: #ef4444; border-color: #ef4444; color: #fff; }
.dark .close-btn { background: #1e293b; border-color: #334155; color: #cbd5e1; }
.dark .close-btn:hover { background: #ef4444; border-color: #ef4444; color: #fff; }
</style>
