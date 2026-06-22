<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { pembayaranIuranAPI, tagihanIuranAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Loader2, Calendar, Banknote, CreditCard, MapPin, Hash, Search } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()

const allUnpaid = ref([])
const allData = ref([])
const riwayat = ref([])
const loading = ref(false)
const searchQuery = ref('')
const filterStatus = ref('Belum')
const page = ref(1)
const perPage = 12
const paying = ref(false)
const metodeBayar = ref('Tunai')
const selectAll = ref(false)

function formatRp(n) { return 'Rp ' + Number(n).toLocaleString('id-ID') }

const filtered = computed(() => {
  let data = [...allData.value]
  if (filterStatus.value === 'Belum') data = data.filter(t => t.StatusTagihan === 'Belum')
  else if (filterStatus.value === 'Lunas') data = data.filter(t => t.StatusTagihan === 'Lunas')
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    data = data.filter(t => (t.NamaKepalaKK||'').toLowerCase().includes(q) || (t.NamaIuran||'').toLowerCase().includes(q))
  }
  return data
})

const totalPages = computed(() => Math.ceil(filtered.value.length / perPage))
const displayed = computed(() => {
  const start = (page.value - 1) * perPage
  return filtered.value.slice(start, start + perPage)
})

const checkedItems = computed(() => allData.value.filter(t => t.checked && t.StatusTagihan === 'Belum'))
const checkedTotal = computed(() => checkedItems.value.reduce((s, t) => s + (t.Nominal||0), 0))
const checkedCount = computed(() => checkedItems.value.length)

function toggleSelectAll() {
  const val = !selectAll.value
  selectAll.value = val
  displayed.value.forEach(t => { t.checked = val })
}

async function fetchData() {
  loading.value = true
  try {
    const [allRes, riwayatRes] = await Promise.all([
      tagihanIuranAPI.list({ limit: 500 }),
      pembayaranIuranAPI.list()
    ])
    allData.value = (allRes.data.data || []).map(t => ({ ...t, checked: false }))
    allUnpaid.value = allData.value.filter(t => t.StatusTagihan === 'Belum')
    riwayat.value = riwayatRes.data.data || []
    page.value = 1
  } catch(e) {
    toast({ title:'Gagal', description:e.message, variant:'destructive' })
  } finally { loading.value = false }
}

function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  selectAll.value = false
}

async function bulkBayar() {
  if (!checkedCount.value) { toast({ title:'Pilih tagihan', description:'Centang minimal satu tagihan', variant:'destructive' }); return }
  paying.value = true
  try {
    let count = 0
    for (const t of checkedItems.value) {
      await pembayaranIuranAPI.create({ TagihanIuranId: t.Id, JumlahBayar: t.Nominal, MetodeBayar: metodeBayar.value })
      count++
    }
    toast({ title:'Pembayaran berhasil', description:`${count} tagihan lunas, total ${formatRp(checkedTotal.value)}`, variant:'success' })
    selectAll.value = false
    fetchData()
  } catch(e) {
    toast({ title:'Gagal', description:e.response?.data?.error||e.message, variant:'destructive' })
  } finally { paying.value = false }
}

onMounted(() => { app.setPage('pembayaran-iuran'); fetchData() })
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Pembayaran Iuran</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Bayar tagihan iuran secara bulk</p>
      </div>
    </div>

    <div class="flex gap-3 items-end mb-4 flex-wrap">
      <div style="flex:1; min-width:200px">
        <label class="form-label-custom">Cari</label>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input v-model="searchQuery" class="form-control-custom" style="padding-left:32px" placeholder="Nama warga atau jenis iuran..." @input="page=1" />
        </div>
      </div>
      <div style="min-width:120px">
        <label class="form-label-custom">Status</label>
        <select v-model="filterStatus" class="form-control-custom" style="font-size:12px" @change="page=1"><option value="">Semua</option><option value="Belum">Belum Lunas</option><option value="Lunas">Lunas</option></select>
      </div>
      <div style="min-width:110px">
        <label class="form-label-custom">Metode</label>
        <select v-model="metodeBayar" class="form-control-custom" style="font-size:12px"><option>Tunai</option><option>Transfer</option><option>QRIS</option></select>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Loader2 class="h-8 w-8 animate-spin text-indigo-600" /></div>
    <div v-else-if="filtered.length===0" class="text-center py-20 text-slate-400"><Banknote class="h-12 w-12 mx-auto mb-3 opacity-30" /><p>{{ filterStatus==='Belum'?'Semua tagihan sudah lunas 🎉':'Tidak ada tagihan' }}</p></div>

    <div v-else>
      <!-- Bulk header -->
      <div class="flex items-center gap-3 px-4 py-2 mb-2 text-sm flex-wrap">
        <template v-if="filterStatus !== 'Lunas'">
          <label class="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
            <input type="checkbox" :checked="selectAll" @change="toggleSelectAll" class="w-4 h-4 accent-indigo-600" />
            Pilih Semua
          </label>
          <span class="text-slate-400">|</span>
        </template>
        <span class="text-slate-500">{{ filtered.length }} tagihan</span>
        <Button v-if="checkedCount" variant="default" size="sm" class="text-xs h-8 px-3 ml-auto" :disabled="paying" @click="bulkBayar">
          <CreditCard class="h-3.5 w-3.5" /> Bayar {{ checkedCount }} ({{ formatRp(checkedTotal) }})
        </Button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="t in displayed" :key="t.Id" :class="['rounded-xl border shadow-sm transition-all flex flex-col', t.checked ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900']">
          <div class="flex items-start gap-3 px-5 py-4">
            <input v-if="t.StatusTagihan==='Belum'" type="checkbox" v-model="t.checked" class="w-4 h-4 accent-indigo-600 mt-1 shrink-0" />
            <div v-else class="w-4 shrink-0 mt-1"></div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="font-semibold text-slate-900 dark:text-slate-100 truncate">{{ t.NamaKepalaKK }}</div>
                  <div class="text-xs font-medium text-slate-600 dark:text-slate-300">{{ t.NamaIuran }}</div>
                </div>
                <Badge :variant="t.StatusTagihan==='Lunas'?'success':'destructive'">{{ t.StatusTagihan==='Lunas'?'Lunas':'Belum' }}</Badge>
              </div>
              <div class="mt-2 space-y-1">
                <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Calendar class="h-3.5 w-3.5 text-slate-400 shrink-0" /><span>{{ t.Periode }}</span></div>
                <div v-if="t.Alamat" class="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-500"><MapPin class="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" /><span class="line-clamp-1">{{ t.Alamat }}</span></div>
                <div class="text-base font-bold text-slate-900 dark:text-slate-100 pt-1">{{ formatRp(t.Nominal) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6 text-sm">
        <button class="page-btn" :disabled="page<=1" @click="goToPage(page-1)">‹</button>
        <span class="text-slate-500">{{ page }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="page>=totalPages" @click="goToPage(page+1)">›</button>
      </div>
    </div>

    <!-- Riwayat -->
    <div class="mt-8">
      <h3 class="text-base font-bold mb-3" style="color:#0f172a">Riwayat Pembayaran Terbaru</h3>
      <div v-if="riwayat.length===0" class="text-center py-6 text-slate-400 text-sm">Belum ada riwayat</div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="p in riwayat.slice(0,8)" :key="p.Id" class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
          <div class="font-semibold text-xs truncate">{{ p.NamaKepalaKK }}</div>
          <div class="text-xs text-slate-500">{{ p.NamaIuran }} · {{ p.Periode }}</div>
          <div class="flex justify-between items-center mt-1">
            <span class="text-xs text-slate-400">{{ p.MetodeBayar||'Tunai' }}</span>
            <span class="font-bold text-sm text-slate-900 dark:text-slate-100">{{ formatRp(p.JumlahBayar) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--border,#dde3ec);background:var(--surface,#fff);color:var(--text-secondary,#5a6a85);cursor:pointer;font-size:14px;transition:all .15s ease}
.page-btn:hover:not(:disabled){background:var(--primary-soft,#e3f2fd);color:var(--primary,#1565c0)}
.page-btn:disabled{opacity:.4;cursor:default}
</style>
