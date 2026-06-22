<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { publicAPI } from '@/services/api'
import axios from 'axios'
import { useToast } from '@/components/ui/toast/use-toast'
import Toaster from '@/components/ui/toast/Toaster.vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import { Loader2, UserPlus } from 'lucide-vue-next'

const router = useRouter()
const { toast } = useToast()
const saving = ref(false)
const tenants = ref([])
const form = reactive({
  TenantId: null,
  Username: '',
  NamaLengkap: '',
  Password: '',
  NoHp: '',
  Alamat: '',
})

function isAlphanumericNoSpace(val) {
  return /^[A-Za-z0-9]+$/.test(val)
}
function isAlphanumericSpace(val) {
  return /^[A-Za-z0-9\s]+$/.test(val)
}
function isDigits(val){
  return /^[0-9]+$/.test(val)
}

async function fetchTenants(){
  try {
    const base = import.meta.env.VITE_API_URL || '/api'
    const res = await axios.get(`${base}/tenants`)
    tenants.value = res.data.data || res.data || []
  } catch(e){
    // ignore
  }
}

async function handleRegister() {
  if (!form.Username.trim() || !form.NamaLengkap.trim() || !form.Password) {
    toast({ title: 'Validasi gagal', description: 'Username, nama lengkap, dan password wajib diisi', variant: 'destructive' })
    return
  }

  if (/\s/.test(form.Username) || /\s/.test(form.Password)) {
    toast({ title: 'Validasi gagal', description: 'Username dan password tidak boleh mengandung spasi', variant: 'destructive' })
    return
  }

  if (!isAlphanumericNoSpace(form.Username) || !isAlphanumericNoSpace(form.Password)) {
    toast({ title: 'Validasi gagal', description: 'Username dan password hanya boleh berisi huruf dan angka', variant: 'destructive' })
    return
  }

  if (!isAlphanumericSpace(form.NamaLengkap)) {
    toast({ title: 'Validasi gagal', description: 'Nama lengkap hanya boleh berisi huruf, angka, dan spasi', variant: 'destructive' })
    return
  }

  if (form.NoHp && !isDigits(form.NoHp.trim())) {
    toast({ title: 'Validasi gagal', description: 'No. HP hanya boleh berisi angka', variant: 'destructive' })
    return
  }

  saving.value = true
  try {
    await publicAPI.register({
      TenantId: form.TenantId || undefined,
      Username: form.Username.trim(),
      NamaLengkap: form.NamaLengkap.trim(),
      Password: form.Password,
      NoHp: form.NoHp.trim() || null,
      Alamat: form.Alamat.trim() || null,
    })
    toast({ title: 'Pendaftaran berhasil', description: 'Silakan masuk memakai akun yang baru dibuat.', variant: 'success' })
    setTimeout(() => router.push('/login'), 700)
  } catch (e) {
    toast({ title: 'Pendaftaran gagal', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    saving.value = false
  }
}

onMounted(fetchTenants)
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center py-12 px-4 bg-slate-50">
    <div class="mx-auto w-full max-w-lg">
      <div class="text-center mb-8">
        <div class="mx-auto w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 mb-4">
          <UserPlus class="h-7 w-7" />
        </div>
        <h1 class="text-3xl font-black text-slate-900">Daftar Portal Warga</h1>
        <p class="text-sm text-slate-500 mt-2">Buat akun warga untuk mengakses pengaduan dan E-Surat.</p>
      </div>

      <form class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4" @submit.prevent="handleRegister">
        <div>
          <label class="form-label-custom">Username <span class="text-red-500">*</span></label>
          <Input v-model="form.Username" placeholder="contoh: budi01" />
        </div>
        <div>
          <label class="form-label-custom">Nama Lengkap <span class="text-red-500">*</span></label>
          <Input v-model="form.NamaLengkap" placeholder="Nama sesuai data warga" />
        </div>
        <div>
          <label class="form-label-custom">Password <span class="text-red-500">*</span></label>
          <Input v-model="form.Password" type="password" placeholder="Minimal 3 karakter" />
        </div>
        <div>
          <label class="form-label-custom">No. HP</label>
          <Input v-model="form.NoHp" placeholder="08xxxxxxxxxx" />
        </div>
        <div>
          <label class="form-label-custom">Alamat</label>
          <textarea v-model="form.Alamat" class="form-control-custom" rows="3" placeholder="Alamat rumah"></textarea>
        </div>
        <div>
          <label class="form-label-custom">Tenant (Pilih jika terdaftar)</label>
          <select v-model="form.TenantId" class="form-control-custom">
            <option value="">-- Pilih Tenant --</option>
            <option v-for="t in tenants" :key="t.Id" :value="t.Id">{{ t.NamaTenant || t.name || t.Nama }}</option>
          </select>
        </div>
        <Button class="w-full h-11" :disabled="saving">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          {{ saving ? 'Mendaftarkan...' : 'Daftar Portal' }}
        </Button>
        <router-link to="/login" class="block text-center text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          Sudah punya akun? Masuk
        </router-link>
      </form>
    </div>
    <Toaster />
  </div>
</template>
