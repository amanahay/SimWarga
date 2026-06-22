<script setup>
import { ref, onMounted } from 'vue'
import { publicAPI } from '@/services/api'

const stats = ref({
  totalWarga: 0,
  totalComplaints: 0,
  activeComplaints: 0,
  totalTenants: 0
})

const announcements = ref([])
const loading = ref(true)
const announcementPage = ref(1)
const announcementTotalPages = ref(1)
const announcementLoading = ref(false)

const fetchStats = async () => {
  try {
    const response = await publicAPI.stats()
    stats.value = response.data
  } catch (error) {
    console.error('Error fetching stats:', error)
  }
}

const fetchAnnouncements = async () => {
  announcementLoading.value = true
  try {
    const response = await publicAPI.pengumuman({ page: announcementPage.value, limit: 5 })
    announcements.value = response.data.data || []
    announcementTotalPages.value = response.data.totalPages || 1
  } catch (error) {
    console.error('Error fetching announcements:', error)
  } finally {
    announcementLoading.value = false
  }
}

const changeAnnouncementPage = async (page) => {
  if (page < 1 || page > announcementTotalPages.value || page === announcementPage.value) return
  announcementPage.value = page
  await fetchAnnouncements()
}

const scrollToSection = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const formatDate = (value) => {
  if (!value) return { day: '--', month: '---', year: '----', full: '-' }
  const date = new Date(String(value).replace(' ', 'T'))
  return {
    day: new Intl.DateTimeFormat('id-ID', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date),
    year: new Intl.DateTimeFormat('id-ID', { year: 'numeric' }).format(date),
    full: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date),
  }
}

onMounted(async () => {
  await Promise.all([fetchStats(), fetchAnnouncements()])
  loading.value = false
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Top Navigation -->
    <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span class="text-xl font-extrabold tracking-tight text-slate-800">Sim<span class="text-indigo-600">Warga</span></span>
          </div>

          <div class="hidden md:flex items-center space-x-8">
            <a href="#beranda" class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition">Beranda</a>
            <a href="#layanan" class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition">Layanan</a>
            <a href="#pengumuman" class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition">Pengumuman</a>
            <a href="#kontak" class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition">Bantuan</a>
          </div>

          <div class="flex items-center gap-4">
            <router-link to="/login" class="text-sm font-semibold text-slate-700 hover:text-indigo-600">Masuk</router-link>
            <router-link to="/daftar-portal" class="bg-indigo-600 !text-white hover:!text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all duration-200">
              Daftar Portal
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section id="beranda" class="relative pt-20 pb-32 overflow-hidden">
      <div class="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(99,102,241,0.05)_0%,rgba(255,255,255,0)_100%)]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-8 animate-bounce">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Sistem Digital Terpadu
        </div>
        <h1 class="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-6 tracking-tight">
          Kelola Lingkungan <br/>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Lebih Profesional.</span>
        </h1>
        <p class="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Platform terintegrasi untuk pengelolaan data warga, keuangan RT/RW, dan transparansi layanan publik dalam satu genggaman.
        </p>
        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <button class="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition shadow-xl" @click="scrollToSection('layanan')">
            Eksplorasi Layanan
          </button>
          <router-link to="/login" class="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-2xl font-bold hover:bg-slate-50 transition shadow-sm">
            Lihat Demo
          </router-link>
        </div>
      </div>
    </section>

    <!-- Quick Stats -->
    <section id="fitur" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 mb-24 relative z-10 scroll-mt-24">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white p-8 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 group hover:border-indigo-200 transition-colors">
          <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p class="text-slate-500 text-sm font-semibold mb-1">Total Warga</p>
          <h3 class="text-3xl font-black text-slate-800">{{ stats.totalWarga }}</h3>
        </div>

        <div class="bg-white p-8 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 group hover:border-indigo-200 transition-colors">
          <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p class="text-slate-500 text-sm font-semibold mb-1">Unit RT/RW</p>
          <h3 class="text-3xl font-black text-slate-800">{{ stats.totalTenants }}</h3>
        </div>

        <div class="bg-white p-8 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 group hover:border-indigo-200 transition-colors">
          <div class="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p class="text-slate-500 text-sm font-semibold mb-1">Laporan Aktif</p>
          <h3 class="text-3xl font-black text-slate-800">{{ stats.activeComplaints }}</h3>
        </div>

        <div class="bg-indigo-600 p-8 rounded-3xl shadow-2xl shadow-indigo-200/50 border border-indigo-500 group overflow-hidden relative">
          <div class="relative z-10">
            <p class="text-indigo-100 text-sm font-semibold mb-1 uppercase tracking-wider">Status Sistem</p>
            <h3 class="text-3xl font-black text-white">Online</h3>
            <div class="mt-4 flex gap-1">
              <div class="h-1 w-8 bg-white/40 rounded-full"></div>
              <div class="h-1 w-12 bg-white rounded-full"></div>
              <div class="h-1 w-6 bg-white/40 rounded-full"></div>
            </div>
          </div>
          <svg class="absolute -right-4 -bottom-4 w-32 h-32 text-indigo-500 opacity-50 transform rotate-12" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path>
          </svg>
        </div>
      </div>
    </section>

    <!-- Content Area -->
    <section id="layanan" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 scroll-mt-24">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h2 class="text-lg font-black text-slate-800 mb-2">Administrasi Warga</h2>
          <p class="text-sm text-slate-500 leading-relaxed">Data warga, RT/RW, surat, dan profil lingkungan dikelola dari satu dashboard.</p>
        </div>
        <div class="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h2 class="text-lg font-black text-slate-800 mb-2">Keuangan Transparan</h2>
          <p class="text-sm text-slate-500 leading-relaxed">Tagihan air, iuran, pembayaran, dan laporan kas dapat dipantau lebih rapi.</p>
        </div>
        <div class="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h2 class="text-lg font-black text-slate-800 mb-2">Layanan Mandiri</h2>
          <p class="text-sm text-slate-500 leading-relaxed">Warga bisa mengirim pengaduan dan memantau informasi resmi tanpa antre manual.</p>
        </div>
      </div>
    </section>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 flex-grow w-full">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <!-- Announcements (Left) -->
        <div id="pengumuman" class="lg:col-span-8 scroll-mt-24">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-3xl font-black text-slate-800 flex items-center gap-3">
              <div class="w-2 h-8 bg-indigo-600 rounded-full"></div>
              Info & Pengumuman
            </h2>
            <router-link to="/login" class="text-sm font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-4">Kelola di Dashboard</router-link>
          </div>

          <div v-if="loading" class="space-y-6">
            <div v-for="i in 3" :key="i" class="bg-white h-32 rounded-3xl animate-pulse border border-slate-100"></div>
          </div>

          <div v-else class="space-y-6">
            <div v-for="(ann, index) in announcements" :key="index"
                 class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div class="flex items-start gap-6">
                <div class="hidden sm:flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-50 text-indigo-700 min-w-[70px]">
                  <span class="text-2xl font-black leading-none">{{ formatDate(ann.TanggalTampil || ann.CreatedAt).day }}</span>
                  <span class="text-[10px] font-black uppercase tracking-tighter">{{ formatDate(ann.TanggalTampil || ann.CreatedAt).month }}</span>
                  <span class="text-[10px] font-bold text-indigo-500">{{ formatDate(ann.TanggalTampil || ann.CreatedAt).year }}</span>
                </div>
                <div class="flex-grow">
                  <div class="flex items-center gap-3 mb-2">
                    <span class="px-2 py-1 rounded bg-indigo-50 text-[10px] font-bold text-indigo-600 uppercase">{{ ann.Kategori || 'Informasi' }}</span>
                    <span class="text-xs text-slate-400 font-medium">{{ formatDate(ann.TanggalTampil || ann.CreatedAt).full }}</span>
                  </div>
                  <h3 class="text-xl font-extrabold text-slate-800 mb-2">{{ ann.Judul }}</h3>
                  <p class="text-slate-600 leading-relaxed whitespace-pre-line">{{ ann.Konten }}</p>
                </div>
              </div>
            </div>

            <div v-if="announcements.length === 0" class="bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <p class="text-slate-500 font-bold italic">Belum ada pengumuman hari ini.</p>
            </div>

            <div v-if="announcementTotalPages > 1" class="flex items-center justify-between gap-3 pt-2">
              <button class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50" :disabled="announcementPage <= 1 || announcementLoading" @click="changeAnnouncementPage(announcementPage - 1)">Sebelumnya</button>
              <span class="text-xs font-bold text-slate-400">Halaman {{ announcementPage }} / {{ announcementTotalPages }}</span>
              <button class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50" :disabled="announcementPage >= announcementTotalPages || announcementLoading" @click="changeAnnouncementPage(announcementPage + 1)">Berikutnya</button>
            </div>
          </div>
        </div>

        <!-- Call to Action Panels (Right) -->
        <div class="lg:col-span-4 space-y-8">
          <div class="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
            <div class="relative z-10">
              <h3 class="text-2xl font-black mb-4 leading-tight">Ajukan Layanan Secara Mandiri</h3>
              <p class="text-slate-400 text-sm mb-8">Urus surat domisili, lapor gangguan, atau cek iuran tanpa harus ke kantor RT.</p>
              <router-link to="/app/pengaduan" class="block text-center w-full bg-white text-slate-900 font-black py-4 rounded-2xl hover:bg-slate-100 transition shadow-lg group">
                Mulai Sekarang
                <span class="inline-block group-hover:translate-x-1 transition-transform ml-1">→</span>
              </router-link>
            </div>
            <!-- Decorative circle -->
            <div class="absolute -right-12 -top-12 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl"></div>
          </div>

          <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl">
            <h3 class="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              Kontak Darurat
            </h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition">
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Keamanan</p>
                  <p class="text-sm font-black text-slate-700">0812-3456-7890</p>
                </div>
                <button class="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-green-600">📞</button>
              </div>
              <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition">
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sekretariat RT</p>
                  <p class="text-sm font-black text-slate-700">0813-9876-5432</p>
                </div>
                <button class="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-green-600">📞</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <section id="privasi" class="bg-slate-50 border-t border-slate-100 py-16 scroll-mt-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white rounded-2xl p-6 border border-slate-100">
          <h2 class="text-lg font-black text-slate-800 mb-2">Privasi</h2>
          <p class="text-sm text-slate-500 leading-relaxed">Akses data warga dibatasi berdasarkan login dan tenant lingkungan masing-masing.</p>
        </div>
        <div id="keamanan" class="bg-white rounded-2xl p-6 border border-slate-100 scroll-mt-24">
          <h2 class="text-lg font-black text-slate-800 mb-2">Keamanan</h2>
          <p class="text-sm text-slate-500 leading-relaxed">Setiap request dashboard menggunakan token dan pembatasan role admin, super admin, atau warga.</p>
        </div>
        <div id="kontak" class="bg-white rounded-2xl p-6 border border-slate-100 scroll-mt-24">
          <h2 class="text-lg font-black text-slate-800 mb-2">Kontak</h2>
          <p class="text-sm text-slate-500 leading-relaxed">Masuk ke portal untuk menghubungi pengurus, mengirim pengaduan, atau melihat kontak darurat resmi.</p>
        </div>
      </div>
    </section>

    <footer class="bg-white border-t border-slate-200 pt-20 pb-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span class="text-lg font-bold text-slate-800">SimWarga</span>
          </div>
          <div class="flex gap-8 text-sm font-semibold text-slate-500">
            <a href="#fitur" class="hover:text-indigo-600">Fitur</a>
            <a href="#privasi" class="hover:text-indigo-600">Privasi</a>
            <a href="#keamanan" class="hover:text-indigo-600">Keamanan</a>
            <a href="#kontak" class="hover:text-indigo-600">Kontak</a>
          </div>
        </div>
        <div class="text-center text-slate-400 text-xs font-medium">
          &copy; 2026 SimWarga. Built with ❤️ for the community.
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
/* Custom animations if needed, mostly handled by Tailwind v4 */
</style>
