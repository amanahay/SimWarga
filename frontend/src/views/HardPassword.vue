<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { publicAPI } from '@/services/api'
import { useToast } from '@/components/ui/toast/use-toast'
import Toaster from '@/components/ui/toast/Toaster.vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import { Loader2, KeyRound, Eye, EyeOff, ShieldAlert } from 'lucide-vue-next'

const router = useRouter()
const { toast } = useToast()
const saving = ref(false)
const showPassword = ref(false)

const form = reactive({
  PIN: '',
  NewPassword: '',
  ConfirmPassword: '',
})

function onPinInput(e) {
  form.PIN = e.target.value.replace(/\D/g, '')
}

async function handleReset() {
  const pinVal = form.PIN.trim()
  const passwordVal = form.NewPassword
  const confirmVal = form.ConfirmPassword

  // 1. Core check
  if (!pinVal || !passwordVal || !confirmVal) {
    toast({ title: 'Validasi gagal', description: 'PIN, Password Baru, dan Konfirmasi Password wajib diisi', variant: 'destructive' })
    return
  }

  // 2. PIN validation: numbers only
  if (!/^[0-9]+$/.test(pinVal)) {
    toast({ title: 'Validasi gagal', description: 'PIN hanya boleh berisi angka', variant: 'destructive' })
    return
  }

  // 3. Password matching
  if (passwordVal !== confirmVal) {
    toast({ title: 'Validasi gagal', description: 'Password baru dan konfirmasi tidak cocok', variant: 'destructive' })
    return
  }

  // 4. Space checking
  if (/\s/.test(passwordVal)) {
    toast({ title: 'Validasi gagal', description: 'Password baru tidak boleh mengandung spasi', variant: 'destructive' })
    return
  }

  if (passwordVal.length < 3) {
    toast({ title: 'Validasi gagal', description: 'Password baru minimal 3 karakter', variant: 'destructive' })
    return
  }

  saving.value = true
  try {
    const res = await publicAPI.hardResetPassword({
      PIN: pinVal,
      NewPassword: passwordVal
    })
    
    toast({ title: 'Berhasil', description: res.data?.message || 'Password SuperAdmin berhasil direset.', variant: 'success' })
    
    form.PIN = ''
    form.NewPassword = ''
    form.ConfirmPassword = ''
    
    setTimeout(() => {
      router.push('/login')
    }, 1500)
  } catch (e) {
    const errorMsg = e.response?.data?.error || e.message
    toast({ title: 'Gagal mereset password', description: errorMsg, variant: 'destructive' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center py-12 px-4 bg-slate-900 text-slate-100" style="background: linear-gradient(135deg, #0f172a, #1e293b);">
    <div class="mx-auto w-full max-w-md">
      <div class="text-center mb-8">
        <div class="mx-auto w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4 animate-pulse">
          <KeyRound class="h-7 w-7" />
        </div>
        <h1 class="text-2xl sm:text-3xl font-black text-slate-50">Hard Recovery Password</h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-2">Mekanisme pemulihan darurat kata sandi akun SuperAdmin.</p>
      </div>

      <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl shadow-xl p-6 backdrop-blur-md space-y-5">
        
        <div class="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <ShieldAlert class="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span class="font-semibold block">Peringatan Keamanan</span>
            Tindakan ini akan langsung merubah password utama SuperAdmin. Seluruh percobaan dan detail IP akan terekam dalam log audit sistem.
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="handleReset">
          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Security PIN <span class="text-red-500">*</span></label>
            <Input 
              :value="form.PIN"
              type="text" 
              placeholder="Masukkan PIN Angka" 
              class="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500"
              @input="onPinInput"
              maxlength="20"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Password Baru <span class="text-red-500">*</span></label>
            <div class="relative">
              <Input 
                v-model="form.NewPassword" 
                :type="showPassword ? 'text' : 'password'" 
                placeholder="Password minimal 3 karakter" 
                class="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500"
                style="padding-right: 42px"
              />
              <button 
                type="button" 
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                style="border: none; background: transparent; padding: 0;"
                @click="showPassword = !showPassword"
              >
                <Eye v-if="showPassword" class="h-4 w-4" />
                <EyeOff v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Konfirmasi Password Baru <span class="text-red-500">*</span></label>
            <Input 
              v-model="form.ConfirmPassword" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="Ketik ulang password baru" 
              class="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500"
            />
          </div>

          <Button class="w-full h-11 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-none transition-all shadow-md shadow-amber-500/10" :disabled="saving">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin mr-1 text-slate-950" />
            {{ saving ? 'Mereset Password...' : 'Reset Password SuperAdmin' }}
          </Button>

          <router-link to="/login" class="block text-center text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors">
            Kembali ke Login
          </router-link>
        </form>
      </div>
    </div>
    <Toaster />
  </div>
</template>
