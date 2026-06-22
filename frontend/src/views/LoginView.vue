<template>
  <div class="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8" :style="{ background: 'var(--surface-2)' }">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="flex justify-center mb-6">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style="background:linear-gradient(135deg,var(--primary),var(--secondary))">
          <span style="font-size:24px;font-weight:800;color:#fff">S</span>
        </div>
      </div>
      <h2 class="text-center text-3xl font-black tracking-tight" style="color:var(--text-primary)">Masuk ke SimWarga</h2>
      <p class="mt-2 text-center text-sm" style="color:var(--text-muted)">
        Gunakan username dan password yang sudah tersedia.
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="py-8 px-4 shadow-2xl sm:rounded-[2rem] sm:px-10 border" style="background:var(--surface);border-color:var(--border)">
        <form class="space-y-5" @submit.prevent="handleLogin">
          <!-- Username -->
          <div>
            <label class="form-label-custom">Username</label>
            <div class="mt-1 relative">
              <input
                v-model="form.username"
                type="text"
                required
                :disabled="auth.isLoggingIn"
                class="form-control-custom"
                style="padding-left: 38px"
                placeholder="superadmin"
                :class="{ 'border-red-400 focus:border-red-500 focus:ring-red-200': errors.username }"
              />
              <User class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
            <p v-if="errors.username" class="mt-1 text-xs font-medium text-red-500">{{ errors.username }}</p>
          </div>

          <!-- Password -->
          <div>
            <label class="form-label-custom">Password</label>
            <div class="mt-1 relative">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                :disabled="auth.isLoggingIn"
                class="form-control-custom"
                style="padding-left: 38px; padding-right: 38px"
                placeholder="••••••••"
                :class="{ 'border-red-400 focus:border-red-500 focus:ring-red-200': errors.password }"
              />
              <Lock class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <button type="button" @click="showPassword = !showPassword" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <EyeOff v-if="showPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
            <p v-if="errors.password" class="mt-1 text-xs font-medium text-red-500">{{ errors.password }}</p>
          </div>

          <!-- Remember + Forgot -->
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 cursor-pointer select-none" style="font-size:13px;color:var(--text-secondary)">
              <input type="checkbox" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              Ingat saya
            </label>
            <a href="#" @click.prevent="handleForgotPassword" class="text-sm font-semibold text-indigo-600 hover:text-indigo-500">Lupa password?</a>
          </div>

          <!-- Submit -->
          <div>
            <button
              type="submit"
              :disabled="auth.isLoggingIn"
              class="btn-primary-custom w-full justify-center py-3.5 text-sm font-bold tracking-wide transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style="width:100%"
            >
              <Loader2 v-if="auth.isLoggingIn" class="h-4 w-4 animate-spin" />
              <template v-else>MASUK SEKARANG</template>
            </button>
          </div>

          <div class="mt-4 text-center text-sm" style="color:var(--text-muted)">
            Ingin jadi pengguna sebagai warga? <router-link to="/daftar-portal" class="font-semibold text-indigo-600 hover:text-indigo-500">Daftar</router-link> untuk mengisi formulir pendaftaran.
          </div>

        </form>

        <!-- Divider -->
        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t" style="border-color:var(--border)"></div></div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2" style="background:var(--surface);color:var(--text-muted)">Kembali ke</span>
            </div>
          </div>
          <div class="mt-6">
            <router-link to="/" class="btn-outline-custom w-full justify-center py-3 text-sm font-bold" style="width:100%">
              Halaman Utama
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Shadcn Toast Container -->
  <Toaster />
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/components/ui/toast/use-toast'
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import Toaster from '@/components/ui/toast/Toaster.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const app = useAppStore()
const { toast } = useToast()

const showPassword = ref(false)
const errors = reactive({ username: '', password: '' })
const form = reactive({ username: 'superadmin', password: 'admin123' })

function validate() {
  errors.username = ''
  errors.password = ''
  let valid = true

  if (!form.username.trim()) {
    errors.username = 'Username wajib diisi'
    toast({ title: 'Validasi Gagal', description: 'Username tidak boleh kosong.', variant: 'destructive' })
    valid = false
  }
  if (!form.password) {
    errors.password = 'Password wajib diisi'
    if (valid) toast({ title: 'Validasi Gagal', description: 'Password tidak boleh kosong.', variant: 'destructive' })
    valid = false
  } else if (form.password.length < 3) {
    errors.password = 'Password minimal 3 karakter'
    if (valid) toast({ title: 'Validasi Gagal', description: 'Password minimal 3 karakter.', variant: 'destructive' })
    valid = false
  }
  return valid
}

function handleForgotPassword() {
  if (!form.username || !form.username.trim()) {
    toast({ title: 'Username wajib di isi dahulu.', variant: 'destructive' })
    return
  }
  const phone = '6283164970454'
  const message = `Hallo, saya lupa password di simwarga, tolong kasih tau cara nya, username saya ${form.username}, mohon bantuannya. terimakasih.`
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

async function handleLogin() {
  if (!validate()) return

  const result = await auth.login(form.username, form.password)

  if (result.success) {
    toast({ title: 'Login Berhasil', description: `Selamat datang, ${result.user.name}!`, variant: 'success', duration: 3000 })
    const isWarga = (result.user.role || result.user.Role) === 'Warga'
    app.setPage(isWarga ? 'pengaduan' : 'dashboard')
    setTimeout(() => {
      const fallback = isWarga ? '/app/pengaduan' : '/app/dashboard'
      const redirect = route.query.redirect || fallback
      router.push(redirect)
    }, 400)
  } else {
    errors.password = result.message
    toast({
      title: 'Login Gagal',
      description: result.message || 'Username atau password salah. Silakan coba lagi.',
      variant: 'destructive',
      duration: 6000,
    })
  }
}
</script>
