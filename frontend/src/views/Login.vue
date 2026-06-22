<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="flex justify-center mb-6">
        <router-link to="/" class="flex items-center gap-2">
          <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </router-link>
      </div>
      <h2 class="text-center text-3xl font-black text-slate-900 tracking-tight">Masuk ke SimWarga</h2>
      <p class="mt-2 text-center text-sm text-slate-600">
        Gunakan akun SuperAdmin atau Admin Tenant
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow-2xl shadow-slate-200 sm:rounded-[2rem] sm:px-10 border border-slate-100">
        <form class="space-y-6" @submit.prevent="handleLogin">
          <div>
            <label for="username" class="block text-sm font-bold text-slate-700 uppercase tracking-wide">Username</label>
            <div class="mt-1">
              <input v-model="form.username" id="username" name="username" type="text" required
                     class="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all" />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-bold text-slate-700 uppercase tracking-wide">Password</label>
            <div class="mt-1 relative">
              <input v-model="form.password" id="password" name="password" :type="showPassword ? 'text' : 'password'" required
                     class="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all pr-12" />
              <button type="button" @click="showPassword = !showPassword"
                      class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors">
                <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input id="remember-me" name="remember-me" type="checkbox" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
              <label for="remember-me" class="ml-2 block text-sm text-slate-700 font-medium"> Ingat saya </label>
            </div>

            <div class="text-sm">
              <a href="#" @click.prevent="handleForgotPassword" class="font-bold text-indigo-600 hover:text-indigo-500"> Lupa password? </a>
            </div>
          </div>

          <div>
            <button type="submit"
                    class="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95">
              MASUK SEKARANG
            </button>
          </div>

          <div class="mt-4 text-center text-sm" style="color:var(--text-muted)">
            Ingin jadi pengguna sebagai warga? <router-link to="/daftar-portal" class="font-semibold text-indigo-600 hover:text-indigo-500">Daftar</router-link> untuk mengisi formulir pendaftaran.
          </div>

        </form>

        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-slate-400 font-medium"> Kembali ke </span>
            </div>
          </div>

          <div class="mt-6">
            <router-link to="/" class="w-full flex justify-center py-3 px-4 border border-slate-200 rounded-2xl shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all">
              Halaman Utama
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
    <Toaster />
  </template>

<script setup>
import { reactive, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/components/ui/toast/use-toast'
import Toaster from '@/components/ui/toast/Toaster.vue'

const showPassword = ref(false)
const app = useAppStore()
const { toast } = useToast()
const form = reactive({
  username: '',
  password: ''
})

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

const handleLogin = () => {
  alert(`Login attempt for: ${form.username}\n(Backend logic implementation coming soon)`)
}
</script>
