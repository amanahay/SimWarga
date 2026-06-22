<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { pengaduanAPI, profilAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Input from '@/components/ui/input/Input.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { AlertCircle, CheckCircle2, ClipboardList, Loader2, MessageSquarePlus, Search, UserPlus } from 'lucide-vue-next'

const router = useRouter()
const app = useAppStore()
const auth = useAuthStore()
const { toast } = useToast()

const loading = ref(false)
const saving = ref(false)
const updatingId = ref(null)
const pengaduanList = ref([])
const showAdvancedFilter = ref(false)
const profileData = ref({ user: null, warga: null })

const query = reactive({
  search: '',
  status: 'Semua',
  kategori: '',
  sortBy: 'CreatedAt',
  sortDir: 'desc',
  page: 1,
  limit: 10,
})

const meta = reactive({
  total: 0,
  totalPages: 1,
})

const stats = reactive({
  total: 0,
  masuk: 0,
  diproses: 0,
  selesai: 0,
  ditolak: 0,
})

const form = reactive({
  Judul: '',
  Kategori: 'Kebersihan',
  NoHpPengadu: '',
  Isi: '',
})

const isWarga = computed(() => auth.userRole === 'Warga')
const isAdmin = computed(() => ['SuperAdmin', 'Admin'].includes(auth.userRole))
const pageTitle = computed(() => isWarga.value ? 'Ajukan Pengaduan' : 'Manajemen Pengaduan')
const pageSubtitle = computed(() => isWarga.value
  ? 'Kirim keluhan atau laporan lingkungan ke pengurus.'
  : 'Pantau, proses, dan selesaikan pengaduan warga berdasarkan data sebenarnya.'
)

const pageInfo = computed(() => {
  if (meta.total === 0) return '0 data'
  const start = (query.page - 1) * query.limit + 1
  const end = Math.min(query.page * query.limit, meta.total)
  return `${start}-${end} dari ${meta.total} data`
})

const wargaPhone = computed(() =>
  String(profileData.value.warga?.NoHp || profileData.value.user?.NoHp || '').trim(),
)
const wargaEmail = computed(() =>
  String(profileData.value.user?.Email || profileData.value.warga?.Email || '').trim(),
)

async function loadProfile() {
  if (!isWarga.value) return
  const res = await profilAPI.get()
  profileData.value = {
    user: res.data.user || null,
    warga: res.data.warga || null,
  }
  form.NoHpPengadu = wargaPhone.value
}

function ensureWargaProfileReady() {
  if (!isWarga.value) return true
  if (!profileData.value.warga?.Id) {
    toast({ title: 'Profil belum siap', description: 'Profil warga Anda belum terhubung ke tenant. Lengkapi atau hubungi admin.', variant: 'warning' })
    return false
  }
  if (!wargaEmail.value) {
    toast({ title: 'Lengkapi profil dulu', description: 'Email masih kosong. Lengkapi profil Anda terlebih dahulu.', variant: 'warning' })
    return false
  }
  if (!wargaPhone.value) {
    toast({ title: 'Lengkapi profil dulu', description: 'Nomor HP/WhatsApp masih kosong. Lengkapi profil Anda terlebih dahulu.', variant: 'warning' })
    return false
  }
  return true
}

async function fetchPengaduan() {
  loading.value = true
  try {
    const res = await pengaduanAPI.list({
      page: query.page,
      limit: query.limit,
      search: query.search.trim(),
      status: query.status,
      kategori: query.kategori.trim(),
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    })
    pengaduanList.value = res.data.data || []
    meta.total = res.data.total || 0
    meta.totalPages = res.data.totalPages || 1
    Object.assign(stats, {
      total: res.data.stats?.total || 0,
      masuk: res.data.stats?.masuk || 0,
      diproses: res.data.stats?.diproses || 0,
      selesai: res.data.stats?.selesai || 0,
      ditolak: res.data.stats?.ditolak || 0,
    })
  } catch (e) {
    toast({ title: 'Gagal memuat pengaduan', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

function applyFilter() {
  query.page = 1
  fetchPengaduan()
}

function resetForm() {
  form.Judul = ''
  form.Kategori = 'Kebersihan'
  form.NoHpPengadu = wargaPhone.value
  form.Isi = ''
}

async function submitPengaduan() {
  if (!ensureWargaProfileReady()) return
  if (!form.Judul.trim() || !form.Isi.trim()) {
    toast({ title: 'Validasi gagal', description: 'Judul dan isi pengaduan wajib diisi', variant: 'warning' })
    return
  }

  saving.value = true
  try {
    await pengaduanAPI.create({
      Judul: form.Judul.trim(),
      Kategori: form.Kategori,
      NoHpPengadu: form.NoHpPengadu.trim() || null,
      Isi: form.Isi.trim(),
    })
    toast({ title: 'Pengaduan berhasil dikirim', description: 'Pengurus dapat melihat laporan Anda di dashboard.', variant: 'success' })
    resetForm()
    query.page = 1
    await fetchPengaduan()
  } catch (e) {
    toast({ title: 'Gagal mengirim pengaduan', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    saving.value = false
  }
}

async function updateStatus(item, status) {
  updatingId.value = item.Id
  try {
    await pengaduanAPI.updateStatus(item.Id, {
      Status: status,
      CatatanAdmin: status === 'Selesai' ? 'Pengaduan ditandai selesai oleh pengurus.' : null,
    })
    toast({ title: `Status menjadi ${status}`, variant: 'success' })
    await fetchPengaduan()
  } catch (e) {
    toast({ title: 'Gagal mengubah status', description: e.response?.data?.error || e.message, variant: 'destructive' })
  } finally {
    updatingId.value = null
  }
}

function changePage(page) {
  if (page < 1 || page > meta.totalPages || page === query.page) return
  query.page = page
  fetchPengaduan()
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(String(value).replace(' ', 'T')))
}

function statusVariant(status) {
  if (status === 'Selesai') return 'success'
  if (status === 'Diproses') return 'warning'
  if (status === 'Ditolak') return 'destructive'
  return 'info'
}

onMounted(() => {
  app.setPage('pengaduan')
  ;(async () => {
    try {
      await loadProfile()
      if (isWarga.value) ensureWargaProfileReady()
      await fetchPengaduan()
    } catch (e) {
      toast({ title: 'Gagal memuat data awal', description: e.response?.data?.error || e.message, variant: 'destructive' })
    }
  })()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-3 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">{{ pageTitle }}</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">{{ pageSubtitle }}</p>
      </div>
      <Button v-if="isAdmin" variant="outline" size="sm" class="text-xs h-8" @click="router.push('/app/warga')">
        <UserPlus class="h-3.5 w-3.5" /> Daftar Warga
      </Button>
    </div>

    <div v-if="isWarga" class="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
      <div class="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div class="p-5 border-b border-slate-100">
          <h2 class="font-bold text-slate-900 flex items-center gap-2">
            <MessageSquarePlus class="h-5 w-5 text-indigo-600" /> Form Pengaduan Warga
          </h2>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="form-label-custom">Judul Pengaduan <span class="text-red-500">*</span></label>
            <Input v-model="form.Judul" placeholder="Contoh: Lampu jalan mati di depan blok C" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="form-label-custom">Kategori</label>
              <select v-model="form.Kategori" class="form-control-custom">
                <option>Kebersihan</option>
                <option>Infrastruktur</option>
                <option>Keamanan</option>
                <option>Administrasi</option>
                <option>Lainnya</option>
              </select>
            </div>
            <div>
              <label class="form-label-custom">No. HP Pengadu</label>
              <Input v-model="form.NoHpPengadu" :disabled="isWarga" placeholder="08xxxxxxxxxx" />
            </div>
          </div>
          <div>
            <label class="form-label-custom">Isi Pengaduan <span class="text-red-500">*</span></label>
            <textarea v-model="form.Isi" class="form-control-custom" rows="6" placeholder="Jelaskan lokasi, kronologi, dan detail yang perlu ditindaklanjuti."></textarea>
          </div>
          <div class="flex justify-end">
            <Button @click="submitPengaduan" :disabled="saving">
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              {{ saving ? 'Mengirim...' : 'Kirim Pengaduan' }}
            </Button>
          </div>
        </div>
      </div>

      <div class="bg-indigo-600 text-white rounded-xl p-5 shadow-sm">
        <AlertCircle class="h-7 w-7 mb-4 text-indigo-100" />
        <h2 class="text-lg font-black mb-2">Akun Warga Aktif</h2>
        <p class="text-sm text-indigo-100 leading-relaxed">Pengaduan yang dikirim dari akun ini otomatis tercatat atas nama {{ auth.userName }} dan hanya riwayat Anda yang ditampilkan di bawah.</p>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="text-xs font-bold text-slate-500 uppercase">Total</div>
        <div class="text-2xl font-black text-slate-900">{{ stats.total }}</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="text-xs font-bold text-slate-500 uppercase">Masuk</div>
        <div class="text-2xl font-black text-indigo-600">{{ stats.masuk }}</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="text-xs font-bold text-slate-500 uppercase">Diproses</div>
        <div class="text-2xl font-black text-amber-600">{{ stats.diproses }}</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="text-xs font-bold text-slate-500 uppercase">Selesai</div>
        <div class="text-2xl font-black text-emerald-600">{{ stats.selesai }}</div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-4 mb-5 shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div>
          <label class="form-label-custom">Cari</label>
          <Input v-model="query.search" placeholder="Judul, isi, nama pengadu..." @keyup.enter="applyFilter" />
        </div>
        <Button variant="default" size="sm" class="h-10 text-xs" @click="applyFilter">
          <Search class="h-3.5 w-3.5" /> Cari
        </Button>
        <Button variant="outline" size="sm" class="h-10 text-xs" @click="showAdvancedFilter = !showAdvancedFilter">
          {{ showAdvancedFilter ? 'Sembunyikan Filter' : 'Filter Lanjutan' }}
        </Button>
      </div>
      <div v-if="showAdvancedFilter" class="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
        <div>
          <label class="form-label-custom">Status</label>
          <select v-model="query.status" class="form-control-custom" @change="applyFilter">
            <option>Semua</option>
            <option>Masuk</option>
            <option>Diproses</option>
            <option>Selesai</option>
            <option>Ditolak</option>
          </select>
        </div>
        <div>
          <label class="form-label-custom">Kategori</label>
          <Input v-model="query.kategori" placeholder="Kebersihan" @keyup.enter="applyFilter" />
        </div>
        <div>
          <label class="form-label-custom">Sort</label>
          <select v-model="query.sortBy" class="form-control-custom" @change="applyFilter">
            <option value="CreatedAt">Tanggal</option>
            <option value="Judul">Judul</option>
            <option value="Kategori">Kategori</option>
            <option value="Status">Status</option>
            <option value="NamaPengadu">Pengadu</option>
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

    <div v-if="loading" class="flex justify-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
    </div>

    <div v-else-if="pengaduanList.length === 0" class="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
      <ClipboardList class="mx-auto h-10 w-10 text-slate-300 mb-3" />
      <p class="font-semibold text-slate-700">Belum ada pengaduan</p>
      <p class="text-sm text-slate-500 mt-1">{{ isWarga ? 'Kirim pengaduan pertama Anda lewat form di atas.' : 'Data pengaduan warga akan tampil di sini.' }}</p>
    </div>

    <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div v-for="item in pengaduanList" :key="item.Id" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-100">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap gap-2 mb-2">
                <Badge :variant="statusVariant(item.Status)">{{ item.Status }}</Badge>
                <Badge variant="outline">{{ item.Kategori || 'Lainnya' }}</Badge>
              </div>
              <h2 class="font-bold text-slate-900">{{ item.Judul }}</h2>
              <p class="text-xs text-slate-500 mt-1">{{ formatDate(item.CreatedAt) }} · {{ item.NamaPengadu || item.NamaUser || '-' }}</p>
            </div>
            <span class="chip">ADU{{ String(item.Id).padStart(4, '0') }}</span>
          </div>
        </div>
        <div class="p-5">
          <p class="text-sm text-slate-600 whitespace-pre-line">{{ item.Isi }}</p>
          <div v-if="item.NoHpPengadu || item.CatatanAdmin || item.NamaPenangan" class="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
            <div v-if="item.NoHpPengadu"><b>No. HP:</b> {{ item.NoHpPengadu }}</div>
            <div v-if="item.NamaPenangan"><b>Ditangani:</b> {{ item.NamaPenangan }}</div>
            <div v-if="item.CatatanAdmin"><b>Catatan:</b> {{ item.CatatanAdmin }}</div>
          </div>
          <div v-if="isAdmin" class="flex flex-wrap gap-2 mt-4">
            <Button v-if="item.Status === 'Masuk'" size="sm" variant="outline" class="text-xs h-8" :disabled="updatingId === item.Id" @click="updateStatus(item, 'Diproses')">
              <Loader2 v-if="updatingId === item.Id" class="h-3 w-3 animate-spin" /> Proses
            </Button>
            <Button v-if="item.Status !== 'Selesai'" size="sm" variant="success" class="text-xs h-8" :disabled="updatingId === item.Id" @click="updateStatus(item, 'Selesai')">
              <CheckCircle2 class="h-3.5 w-3.5" /> Selesai
            </Button>
            <Button v-if="item.Status !== 'Ditolak' && item.Status !== 'Selesai'" size="sm" variant="destructive" class="text-xs h-8" :disabled="updatingId === item.Id" @click="updateStatus(item, 'Ditolak')">
              Tolak
            </Button>
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
  </div>
</template>
