<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { publicAPI } from '@/services/api'
import { useToast } from '@/components/ui/toast/use-toast'
import Toaster from '@/components/ui/toast/Toaster.vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import { Loader2, UserPlus, Eye, EyeOff } from 'lucide-vue-next'

const router = useRouter()
const { toast } = useToast()
const saving = ref(false)
const showPassword = ref(false)
const tenants = ref([])
const form = reactive({
  TenantId: '',
  Username: '',
  NamaLengkap: '',
  Password: '',
  NoHp: '',
  Alamat: '',
})

async function fetchTenants(){
  try {
    const res = await publicAPI.tenants()
    tenants.value = res.data?.data || res.data || []
  } catch(e){
    toast({ title: 'Gagal memuat tenant', description: e.message, variant: 'destructive' })
  }
}

async function handleRegister() {
  const usernameVal = form.Username.trim()
  const namaVal = form.NamaLengkap.trim()
  const passwordVal = form.Password
  const alamatVal = form.Alamat.trim()
  const tenantIdVal = form.TenantId

  // 1. Mandatory TenantId
  if (!tenantIdVal) {
    toast({ title: 'Validasi gagal', description: 'Perumahan / Tenant wajib dipilih', variant: 'destructive' })
    return
  }

  // 2. Required Core Fields
  if (!usernameVal || !namaVal || !passwordVal) {
    toast({ title: 'Validasi gagal', description: 'Username, nama lengkap, dan password wajib diisi', variant: 'destructive' })
    return
  }

  // 3. Username Validation: letters & numbers only, max 15 chars
  if (usernameVal.length > 15) {
    toast({ title: 'Validasi gagal', description: 'Username maksimal 15 karakter', variant: 'destructive' })
    return
  }
  if (!/^[a-zA-Z0-9]+$/.test(usernameVal)) {
    toast({ title: 'Validasi gagal', description: 'Username hanya boleh berupa huruf dan angka tanpa spasi', variant: 'destructive' })
    return
  }

  // 4. Nama Lengkap: max 50 chars
  if (namaVal.length > 50) {
    toast({ title: 'Validasi gagal', description: 'Nama lengkap maksimal 50 karakter', variant: 'destructive' })
    return
  }

  // 5. Password Validation: prevent space, min 3 chars
  if (/\s/.test(passwordVal)) {
    toast({ title: 'Validasi gagal', description: 'Password tidak boleh mengandung spasi', variant: 'destructive' })
    return
  }
  if (passwordVal.length < 3) {
    toast({ title: 'Validasi gagal', description: 'Password minimal 3 karakter', variant: 'destructive' })
    return
  }

  // 6. Alamat: max 150 chars
  if (alamatVal.length > 150) {
    toast({ title: 'Validasi gagal', description: 'Alamat maksimal 150 karakter', variant: 'destructive' })
    return
  }

  // 7. No HP: only digits if filled
  if (form.NoHp.trim() && !/^[0-9]+$/.test(form.NoHp.trim())) {
    toast({ title: 'Validasi gagal', description: 'No. HP hanya boleh berisi angka', variant: 'destructive' })
    return
  }

  saving.value = true
  try {
    await publicAPI.register({
      TenantId: Number(tenantIdVal),
      Username: usernameVal,
      NamaLengkap: namaVal,
      Password: passwordVal,
      NoHp: form.NoHp.trim() || null,
      Alamat: alamatVal || null,
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
          <label class="form-label-custom">Tenant / Perumahan <span class="text-red-500">*</span></label>
          <select v-model="form.TenantId" class="form-control-custom">
            <option value="">-- Pilih Perumahan / Tenant --</option>
            <option v-for="t in tenants" :key="t.Id" :value="t.Id">{{ t.NamaTenant || t.Nama }}</option>
          </select>
        </div>
        <div>
          <label class="form-label-custom">Username <span class="text-red-500">*</span> (Maks. 15 karakter, huruf & angka)</label>
          <Input v-model="form.Username" placeholder="contoh: budi01" maxlength="15" />
        </div>
        <div>
          <label class="form-label-custom">Nama Lengkap <span class="text-red-500">*</span> (Maks. 50 karakter)</label>
          <Input v-model="form.NamaLengkap" placeholder="Nama sesuai KTP" maxlength="50" />
        </div>
        <div>
          <label class="form-label-custom">Password <span class="text-red-500">*</span></label>
          <div class="relative">
            <Input 
              v-model="form.Password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="Minimal 3 karakter, tanpa spasi" 
              style="padding-right: 42px"
            />
            <button 
              type="button" 
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              style="border: none; background: transparent; padding: 0;"
              @click="showPassword = !showPassword"
            >
              <Eye class="h-4 w-4" v-if="showPassword" />
              <EyeOff class="h-4 w-4" v-else />
            </button>
          </div>
        </div>
        <div>
          <label class="form-label-custom">No. HP</label>
          <Input v-model="form.NoHp" placeholder="08xxxxxxxxxx" />
        </div>
        <div>
          <label class="form-label-custom">Alamat (Maks. 150 karakter)</label>
          <textarea v-model="form.Alamat" class="form-control-custom" rows="3" placeholder="Alamat rumah" maxlength="150"></textarea>
        </div>
        <Button class="w-full h-11" :disabled="saving">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin mr-1" />
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
