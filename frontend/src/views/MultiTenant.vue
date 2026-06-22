<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { tenantsAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Input from '@/components/ui/input/Input.vue'
import ConfirmDialog from '@/components/ui/confirm-dialog/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Plus, Pencil, Trash2, Loader2, X, Building2, Users, MapPin, Hash } from 'lucide-vue-next'

const app = useAppStore()
const router = useRouter()
const { toast } = useToast()

const tenants = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingTenant = ref(null)

const showDeleteConfirm = ref(false)
const tenantToDelete = ref(null)

const form = reactive({ NamaTenant: '', KodeTenant: '', Kota: '', Alamat: '' })

const cardColors = ['indigo','emerald','amber','rose','cyan','violet']

function getCardBg(i) {
  const c = cardColors[i % cardColors.length]
  return `bg-${c}-100 dark:bg-${c}-950 border-${c}-200 dark:border-${c}-800`
}

async function fetchTenants() {
  loading.value = true
  try {
    const res = await tenantsAPI.list()
    tenants.value = res.data.data || []
  } catch(e) {
    toast({ title:'Gagal memuat data', description:e.response?.data?.error||e.message, variant:'destructive' })
  } finally { loading.value = false }
}

function openCreate() {
  editingTenant.value = null
  form.NamaTenant = ''; form.KodeTenant = ''; form.Kota = ''; form.Alamat = ''
  showModal.value = true
}

function openEdit(t) {
  editingTenant.value = t
  form.NamaTenant = t.NamaTenant||''; form.KodeTenant = t.KodeTenant||''
  form.Kota = t.Kota||''; form.Alamat = t.Alamat||''
  showModal.value = true
}

async function handleSave() {
  if(!form.NamaTenant.trim()||!form.KodeTenant.trim()) {
    toast({ title:'Validasi gagal', description:'Nama dan Kode Tenant wajib', variant:'destructive' })
    return
  }
  saving.value = true
  try {
    if(editingTenant.value) {
      await tenantsAPI.update(editingTenant.value.Id, form)
      toast({ title:'Tenant berhasil diperbarui', variant:'success' })
    } else {
      await tenantsAPI.create(form)
      toast({ title:'Tenant berhasil ditambahkan', variant:'success' })
    }
    showModal.value = false
    fetchTenants()
  } catch(e) {
    toast({ title:'Gagal menyimpan', description:e.response?.data?.error||e.message, variant:'destructive' })
  } finally { saving.value = false }
}

function confirmDelete(t) { tenantToDelete.value = t; showDeleteConfirm.value = true }

async function doDelete() {
  if(!tenantToDelete.value) return
  showDeleteConfirm.value = false
  try {
    await tenantsAPI.delete(tenantToDelete.value.Id)
    toast({ title:'Tenant berhasil dihapus', variant:'success' })
    fetchTenants()
  } catch(e) {
    toast({ title:'Gagal menghapus', description:e.response?.data?.error||e.message, variant:'destructive' })
  } finally { tenantToDelete.value = null }
}

onMounted(()=>{ app.setPage('tenant'); fetchTenants() })
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Multi Tenant</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Kelola seluruh tenant yang terdaftar di platform SimWarga</p>
      </div>
      <Button variant="default" size="sm" class="text-xs h-8 px-2.5" @click="openCreate">
        <Plus class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Tambah Tenant</span>
      </Button>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Loader2 class="h-8 w-8 animate-spin text-indigo-600" /></div>
    <div v-else-if="tenants.length===0" class="text-center py-20 text-slate-400">
      <Building2 class="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Belum ada tenant</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="(t,i) in tenants" :key="t.Id" :class="['rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col', getCardBg(i)]">
        <div class="flex items-start justify-between px-5 py-4 border-b border-white/30 dark:border-white/10">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-white/60 dark:bg-white/10 flex items-center justify-center shrink-0">
              <Building2 class="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-slate-900 dark:text-slate-100 truncate">{{ t.NamaTenant }}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400 font-mono">{{ t.KodeTenant }}</div>
            </div>
          </div>
          <Badge :variant="t.IsAktif?'success':'destructive'">{{ t.IsAktif?'Aktif':'Nonaktif' }}</Badge>
        </div>
        <div class="flex-1 px-5 py-4 space-y-2">
          <div v-if="t.Alamat||t.Kota" class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
            <MapPin class="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
            <span>{{ [t.Alamat,t.Kota].filter(Boolean).join(', ') }}</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Users class="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span class="font-bold">{{ t.TotalWarga||0 }} warga</span>
          </div>
        </div>
        <div class="flex gap-2 px-5 py-3 border-t border-white/30 dark:border-white/10">
          <Button variant="outline" size="sm" class="flex-1 text-xs h-8" @click="openEdit(t)"><Pencil class="h-3 w-3" /> Edit</Button>
          <Button variant="outline" size="sm" class="flex-1 text-xs h-8" @click="confirmDelete(t)"><Trash2 class="h-3 w-3 text-red-500" /> Hapus</Button>
        </div>
        <div class="px-5 pb-3">
          <Button variant="default" size="sm" class="w-full text-xs h-8" @click="app.impersonateTenant(t.Id, t.NamaTenant); router.push('/app/warga')">
            🔑 Masuk sebagai Tenant ini
          </Button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background:rgba(0,0,0,0.5)">
      <div class="w-full max-w-md rounded-xl border border-slate-200 shadow-2xl dark:border-slate-800 mx-4 modal-form" style="max-height:90vh;overflow-y:auto">
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">{{ editingTenant?'Edit Tenant':'Tambah Tenant' }}</h2>
          <button class="close-btn" @click="showModal=false" title="Tutup">&times;</button>
        </div>
        <div class="px-6 py-4 space-y-4">
          <div><label class="form-label-custom">Nama Tenant <span class="text-red-500">*</span></label><Input v-model="form.NamaTenant" placeholder="Contoh: Perumahan Griya Asri" /></div>
          <div><label class="form-label-custom">Kode Tenant <span class="text-red-500">*</span></label><Input v-model="form.KodeTenant" placeholder="Contoh: GRYA-001" /></div>
          <div><label class="form-label-custom">Kota</label><Input v-model="form.Kota" placeholder="Kota" /></div>
          <div><label class="form-label-custom">Alamat</label><Input v-model="form.Alamat" placeholder="Alamat lengkap" /></div>
        </div>
        <div class="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <Button variant="outline" @click="showModal=false" :disabled="saving">Tutup</Button>
          <Button @click="handleSave" :disabled="saving"><Loader2 v-if="saving" class="h-4 w-4 animate-spin" />{{ saving?'Menyimpan...':'Simpan' }}</Button>
        </div>
      </div>
    </div>

    <ConfirmDialog :open="showDeleteConfirm" title="Hapus Tenant" :message="tenantToDelete?'Yakin ingin menghapus tenant '+tenantToDelete.NamaTenant+'?':''" confirm-text="Ya, Hapus" cancel-text="Tidak" @confirm="doDelete" @cancel="showDeleteConfirm=false" />
  </div>
</template>

<style scoped>
.modal-form{background:#ffffff!important}.dark .modal-form{background:#020617!important}
.close-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--border,#dde3ec);background:var(--surface-2,#f5f7fa);color:var(--text-secondary,#5a6a85);cursor:pointer;font-size:18px;line-height:1;transition:all .15s ease;flex-shrink:0}
.close-btn:hover{background:#ef4444;border-color:#ef4444;color:#fff}
.dark .close-btn{background:#1e293b;border-color:#334155;color:#cbd5e1}
.dark .close-btn:hover{background:#ef4444;border-color:#ef4444;color:#fff}
</style>
