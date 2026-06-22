<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { tagihanIuranAPI, pembayaranIuranAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Loader2, Calendar, Hash, Banknote, RefreshCw, MapPin, CreditCard, X, Search } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()

const tagihanList = ref([])
const allTagihan = ref([])
const loading = ref(false)
const filterStatus = ref('Belum')
const searchWarga = ref('')
const genTahun = ref(new Date().getFullYear())
const genBulan = ref('')
const currentPage = ref(1)
const perPage = 12
const totalPages = ref(1)
const displayedTagihan = ref([])

// Payment modal
const showPayModal = ref(false)
const payingItem = ref(null)
const paying = ref(false)
const metodeBayar = ref('Tunai')

const tahunOptions = Array.from({ length: 11 }, (_, i) => 2025 + i)
const bulanOptions = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function formatRp(n) { return 'Rp ' + Number(n).toLocaleString('id-ID') }
function badgeVariant(s) { if (s==='Lunas') return 'success'; if (s==='Belum') return 'destructive'; return 'default' }

async function fetchTagihan() {
  loading.value = true
  try {
    const res = await tagihanIuranAPI.list()
    allTagihan.value = res.data.data || []
    applyFilters()
  } catch(e) {
    toast({ title:'Gagal memuat data', description:e.response?.data?.error||e.message, variant:'destructive' })
  } finally { loading.value = false }
}

function applyFilters() {
  let data = [...allTagihan.value]
  if (filterStatus.value) data = data.filter(t => t.StatusTagihan === filterStatus.value)
  if (searchWarga.value.trim()) {
    const q = searchWarga.value.toLowerCase()
    data = data.filter(t => (t.NamaKepalaKK||'').toLowerCase().includes(q) || (t.NamaIuran||'').toLowerCase().includes(q))
  }
  totalPages.value = Math.ceil(data.length / perPage)
  currentPage.value = 1
  tagihanList.value = data
  paginate()
}

function paginate() {
  const start = (currentPage.value - 1) * perPage
  displayedTagihan.value = tagihanList.value.slice(start, start + perPage)
}

function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  paginate()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function generateTagihan() {
  if (!genBulan.value) { toast({ title:'Validasi', description:'Pilih bulan terlebih dahulu', variant:'destructive' }); return }
  try {
    const res = await tagihanIuranAPI.generate({ Tahun: genTahun.value, Bulan: genBulan.value })
    toast({ title:'Berhasil', description:`${res.data.generated} tagihan dibuat`, variant:'success' })
    fetchTagihan()
  } catch(e) {
    toast({ title:'Gagal', description:e.response?.data?.error||e.message, variant:'destructive' })
  }
}

function openBayar(item) {
  payingItem.value = item
  metodeBayar.value = 'Tunai'
  showPayModal.value = true
}

async function prosesBayar() {
  if (!payingItem.value) return
  paying.value = true
  try {
    await pembayaranIuranAPI.create({
      TagihanIuranId: payingItem.value.Id,
      JumlahBayar: payingItem.value.Nominal,
      MetodeBayar: metodeBayar.value
    })
    toast({ title:'Pembayaran berhasil', description:`${payingItem.value.NamaIuran} - ${formatRp(payingItem.value.Nominal)}`, variant:'success' })
    showPayModal.value = false
    fetchTagihan()
  } catch(e) {
    toast({ title:'Gagal', description:e.response?.data?.error||e.message, variant:'destructive' })
  } finally { paying.value = false }
}

onMounted(() => { app.setPage('tagihan-iuran'); fetchTagihan() })
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Tagihan Iuran</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Generate, kelola & bayar tagihan iuran warga</p>
      </div>
      <div class="flex gap-2 items-end flex-wrap">
        <div style="min-width:90px"><label class="form-label-custom">Tahun</label><select v-model="genTahun" class="form-control-custom" style="font-size:12px"><option v-for="y in tahunOptions" :key="y" :value="y">{{ y }}</option></select></div>
        <div style="min-width:110px"><label class="form-label-custom">Bulan</label><select v-model="genBulan" class="form-control-custom" style="font-size:12px"><option value="">-- Pilih --</option><option v-for="b in bulanOptions" :key="b" :value="b">{{ b }}</option></select></div>
        <Button variant="default" size="sm" class="text-xs h-9 px-3" @click="generateTagihan"><RefreshCw class="h-3.5 w-3.5" /> Generate</Button>
      </div>
    </div>

    <div class="flex gap-3 items-end mb-4 flex-wrap">
      <div style="min-width:130px"><label class="form-label-custom">Status</label><select v-model="filterStatus" class="form-control-custom" @change="applyFilters"><option value="">Semua</option><option value="Lunas">Lunas</option><option value="Belum">Belum</option></select></div>
      <div style="flex:1; min-width:200px"><label class="form-label-custom">Cari</label><div class="relative"><Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input v-model="searchWarga" class="form-control-custom" style="padding-left:32px" placeholder="Nama warga atau jenis iuran..." @input="applyFilters" /></div></div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Loader2 class="h-8 w-8 animate-spin text-indigo-600" /></div>
    <div v-else-if="tagihanList.length===0" class="text-center py-20 text-slate-400"><Banknote class="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Belum ada tagihan iuran</p></div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="(t,i) in displayedTagihan" :key="t.Id" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col">
        <div class="flex items-start justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 font-bold text-sm text-indigo-600 dark:text-indigo-400">{{ (t.NamaKepalaKK||'?').charAt(0) }}</div>
            <div class="min-w-0">
              <div class="font-semibold text-slate-900 dark:text-slate-100 truncate">{{ t.NamaKepalaKK }}</div>
              <div class="text-xs font-medium text-slate-600 dark:text-slate-300">{{ t.NamaIuran }}</div>
            </div>
          </div>
          <Badge :variant="badgeVariant(t.StatusTagihan)">{{ t.StatusTagihan }}</Badge>
        </div>
        <div class="flex-1 px-5 py-3 space-y-2">
          <div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><Calendar class="h-3.5 w-3.5 text-slate-400 shrink-0" /><span class="font-medium">{{ t.Periode }}</span></div>
          <div v-if="t.Alamat" class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"><MapPin class="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" /><span class="line-clamp-1">{{ t.Alamat }}</span></div>
          <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Hash class="h-3.5 w-3.5 text-slate-400 shrink-0" /><span>RT {{ t.RT||'-' }} / RW {{ t.RW||'-' }}</span></div>
          <div class="text-lg font-bold text-slate-900 dark:text-slate-100 pt-1">{{ formatRp(t.Nominal) }}</div>
        </div>
        <div v-if="t.StatusTagihan==='Belum'" class="px-5 pb-4">
          <Button variant="default" size="sm" class="w-full text-xs h-8" @click="openBayar(t)"><CreditCard class="h-3.5 w-3.5" /> Bayar Sekarang</Button>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6 text-sm">
      <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹</button>
      <span class="text-slate-500">{{ currentPage }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">›</button>
    </div>

    <!-- Payment Modal -->
    <div v-if="showPayModal && payingItem" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background:rgba(0,0,0,0.5)">
      <div class="w-full max-w-sm rounded-xl border border-slate-200 shadow-2xl dark:border-slate-800 mx-4 p-6 modal-form">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Konfirmasi Pembayaran</h3>
          <button class="close-btn" @click="showPayModal=false">&times;</button>
        </div>
        <div class="space-y-3 mb-5">
          <div class="flex justify-between text-sm"><span class="text-slate-500">Warga</span><span class="font-semibold">{{ payingItem.NamaKepalaKK }}</span></div>
          <div class="flex justify-between text-sm"><span class="text-slate-500">Iuran</span><span>{{ payingItem.NamaIuran }}</span></div>
          <div class="flex justify-between text-sm"><span class="text-slate-500">Periode</span><span>{{ payingItem.Periode }}</span></div>
          <div class="flex justify-between text-base font-bold pt-2 border-t border-slate-200 dark:border-slate-800"><span>Nominal</span><span>{{ formatRp(payingItem.Nominal) }}</span></div>
          <div><label class="form-label-custom">Metode Bayar</label><select v-model="metodeBayar" class="form-control-custom" style="font-size:13px"><option>Tunai</option><option>Transfer</option><option>QRIS</option></select></div>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" @click="showPayModal=false">Batal</Button>
          <Button variant="default" class="flex-1" :disabled="paying" @click="prosesBayar"><Loader2 v-if="paying" class="h-4 w-4 animate-spin" />{{ paying?'Memproses...':'Bayar' }}</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-form{background:#ffffff!important}.dark .modal-form{background:#020617!important}
.close-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--border,#dde3ec);background:var(--surface-2,#f5f7fa);color:var(--text-secondary,#5a6a85);cursor:pointer;font-size:18px;line-height:1;transition:all .15s ease}
.close-btn:hover{background:#ef4444;border-color:#ef4444;color:#fff}
.dark .close-btn{background:#1e293b;border-color:#334155;color:#cbd5e1}
.page-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--border,#dde3ec);background:var(--surface,#fff);color:var(--text-secondary,#5a6a85);cursor:pointer;font-size:14px;transition:all .15s ease}
.page-btn:hover:not(:disabled){background:var(--primary-soft,#e3f2fd);color:var(--primary,#1565c0)}
.page-btn:disabled{opacity:.4;cursor:default}
</style>
