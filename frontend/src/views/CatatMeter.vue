<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { meteranAPI, pencatatanAPI, tarifAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Loader2, Search, MapPin, Camera, Gauge } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()

const allMeters = ref([])
const tarifList = ref([])
const loading = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const displayedCount = ref(10)
const selectedMeter = ref(null)
const bulan = ref(new Date().getMonth() + 1)
const tahun = ref(new Date().getFullYear())
const standBulanLalu = ref(0)
const standSekarang = ref('')
const catatan = ref('')
const fotoFile = ref(null)
const fotoPreview = ref(null)
const gpsCoords = ref('')
const selectedTarifId = ref(null)
const alreadyRecorded = ref(false)
const recordedStand = ref(0)
const hasUnpaidHistory = ref(false)
const tercatat = ref(0)
const riwayatHariIni = ref([])

const bulanNames = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const bulanOptions = computed(() => bulanNames.slice(1).map((label, i) => ({ label, value: i + 1 })))
const tahunOptions = Array.from({length:10},(_,i)=>new Date().getFullYear()+i)
const periode = computed(() => `${tahun.value}-${String(bulan.value).padStart(2,'0')}`)

const filteredMeters = computed(() => {
  if(!searchQuery.value.trim()) return allMeters.value
  const q = searchQuery.value.toLowerCase()
  return allMeters.value.filter(m => (m.NoMeteran||'').toLowerCase().includes(q) || (m.NamaWarga||m.NamaKepalaKK||'').toLowerCase().includes(q))
})
const displayedMeters = computed(() => filteredMeters.value.slice(0, displayedCount.value))
const hasMore = computed(() => displayedCount.value < filteredMeters.value.length)

const pemakaian = computed(() => Math.max(0, (parseFloat(standSekarang.value)||0) - (parseFloat(standBulanLalu.value)||0)))
const selectedTarif = computed(() => tarifList.value.find(t => t.Id == selectedTarifId.value))
const tagihan = computed(() => {
  if(!selectedTarif.value) return 0
  const t = selectedTarif.value; const p = pemakaian.value
  let biaya = t.BiayaAdmin || 0
  if(p <= (t.MinimumM3||0)) biaya += (t.BiayaMinimum || t.HargaPerM3 * (t.MinimumM3||0))
  else biaya += p * t.HargaPerM3
  return Math.round(biaya)
})

async function fetchData() {
  loading.value = true
  try {
    const [mRes, tRes, pRes] = await Promise.all([meteranAPI.list({limit:500}), tarifAPI.list(), pencatatanAPI.list({periode:periode.value,limit:500})])
    allMeters.value = (mRes.data.data || []).filter(m => (m.NamaWarga||m.NamaKepalaKK))
    tarifList.value = tRes.data.data || []
    if(tarifList.value.length) selectedTarifId.value = tarifList.value[0].Id
    const pencatatan = pRes.data.data || []
    tercatat.value = pencatatan.length
    riwayatHariIni.value = pencatatan.slice(0,5)
  } catch(e) { toast({title:'Gagal',description:e.message,variant:'destructive'}) }
  finally { loading.value = false }
}

function loadMore() { displayedCount.value += 10 }

async function selectMeter(m) {
  selectedMeter.value = m
  fotoFile.value = null; fotoPreview.value = null
  alreadyRecorded.value = false
  const meterId = Number(m.Id || m.id)
  const per = periode.value
  try {
    const allRes = await pencatatanAPI.list({})
    const data = allRes.data.data||[]
    // Filter for this meter
    const mine = data.filter(p => Number(p.MeteranId) === meterId)
    // Check current period
    const existing = mine.find(p => p.Periode === per)
    if(existing) {
      alreadyRecorded.value = true
      recordedStand.value = Number(existing.StandAkhir||0)
      // Meter Sebelum = stand akhir dari record ini (jadi basis berikutnya)
      standBulanLalu.value = Number(existing.StandAkhir||0)
      // Meter Berikutnya = kosong (siap input baru)
      standSekarang.value = null
    } else {
      const sorted = [...mine].sort((a,b) => (b.Id||0) - (a.Id||0))
      const last = sorted[0]
      standBulanLalu.value = last ? Number(last.StandAkhir||0) : Number(m.StandTerakhir||m.StandAwal||0)
      standSekarang.value = null
    }
    // Fallback: if no data at all, use meter's stored stand
    if(!standBulanLalu.value) standBulanLalu.value = Number(m.StandTerakhir||m.StandAwal||0)
    // Check if there are previous readings for this meter
    hasUnpaidHistory.value = mine.length > 0
  } catch(e) {
    standBulanLalu.value = Number(m.StandTerakhir||m.StandAwal||0)
    standSekarang.value = null
  }
}

function handleFoto(e) {
  const file = e.target.files[0]
  if(!file) return
  fotoFile.value = file
  const reader = new FileReader()
  reader.onload = (ev) => { fotoPreview.value = ev.target.result }
  reader.readAsDataURL(file)
}

function getGPS() {
  if(!navigator.geolocation) { toast({title:'GPS tidak didukung',variant:'destructive'}); return }
  navigator.geolocation.getCurrentPosition(
    pos => { gpsCoords.value = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`; toast({title:'Lokasi didapat',variant:'success'}) },
    () => { toast({title:'Gagal dapat lokasi',variant:'destructive'}) }
  )
}

async function simpanPencatatan() {
  if(!selectedMeter.value) { toast({title:'Pilih pelanggan',variant:'destructive'}); return }
  if(!standSekarang.value) { toast({title:'Stand meter wajib',variant:'destructive'}); return }
  saving.value = true
  try {
    const meterId = selectedMeter.value.Id || selectedMeter.value.id
    await pencatatanAPI.create({ MeteranId: meterId, Periode: periode.value, StandAkhir: Number(standSekarang.value), Keterangan: catatan.value })
    toast({title:'Pencatatan berhasil',description:`Pemakaian: ${pemakaian.value} m³ · Tagihan: Rp ${tagihan.value.toLocaleString('id-ID')}`,variant:'success'})
    standSekarang.value = ''; catatan.value = ''; fotoFile.value = null; fotoPreview.value = null
    standBulanLalu.value = Number(standSekarang.value) || standBulanLalu.value
    fetchData()
  } catch(e) { toast({title:'Gagal',description:e.response?.data?.error||e.message,variant:'destructive'}) }
  finally { saving.value = false }
}

watch([bulan, tahun], () => { if(!loading.value) fetchData() })
onMounted(() => { app.setPage('pencatatan'); fetchData() })
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div><h1 class="page-heading text-lg sm:text-xl font-bold">Catat Meteran</h1><p class="page-subheading text-xs sm:text-sm mt-0.5">Catat stand meter air pelanggan</p></div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Loader2 class="h-8 w-8 animate-spin text-indigo-600" /></div>

    <div v-else style="display:grid;grid-template-columns:280px 1fr 280px;gap:16px">
      <!-- LEFT -->
      <div class="rounded-xl border shadow-sm flex flex-col" style="background:#ffffff;border-color:#e2e8f0;max-height:calc(100vh - 140px)">
        <div class="p-3" style="border-bottom:1px solid #f1f5f9">
          <div class="relative"><Search class="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><input v-model="searchQuery" class="form-control-custom" style="padding-left:28px;font-size:12px" placeholder="Cari No. Meter / Nama..." /></div>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div v-for="m in displayedMeters" :key="m.Id" @click="selectMeter(m)" :style="{padding:'10px 12px',cursor:'pointer',borderBottom:'1px solid #f1f5f9',background:selectedMeter&&(selectedMeter.Id||selectedMeter.id)===(m.Id||m.id)?'#e3f2fd':'transparent'}">
            <div class="text-xs font-semibold truncate" style="color:#1e293b">{{ m.NamaWarga||m.NamaKepalaKK }}</div>
            <div class="text-xs font-mono" style="color:#64748b">{{ m.NoMeteran }}</div>
          </div>
        </div>
        <div v-if="hasMore" class="p-2 text-center"><button class="text-xs" style="color:#2563eb" @click="loadMore">Load more ({{ filteredMeters.length - displayedCount }} remaining)</button></div>
      </div>

      <!-- MIDDLE -->
      <div class="rounded-xl border shadow-sm p-5 space-y-4" style="background:#ffffff;border-color:#e2e8f0;max-height:calc(100vh - 140px);overflow-y:auto">
        <!-- Periode -->
        <div class="grid grid-cols-2 gap-3 pb-3" style="border-bottom:1px solid #f1f5f9">
          <div><label class="form-label-custom">Bulan</label><select v-model="bulan" class="form-control-custom" style="font-size:12px"><option v-for="b in bulanOptions" :key="b.value" :value="b.value">{{ b.label }}</option></select></div>
          <div><label class="form-label-custom">Tahun</label><select v-model="tahun" class="form-control-custom" style="font-size:12px"><option v-for="y in tahunOptions" :key="y" :value="y">{{ y }}</option></select></div>
        </div>

        <div v-if="!selectedMeter" class="text-center py-12" style="color:#94a3b8"><Gauge class="h-10 w-10 mx-auto mb-2 opacity-30" /><p class="text-sm">Pilih pelanggan dari daftar di kiri</p></div>
        <template v-else>
          <div :key="(selectedMeter.Id||selectedMeter.id)+'_'+periode">
          <!-- Alert -->
          <div v-if="alreadyRecorded" class="p-3 rounded-lg text-xs flex items-start gap-2 mb-3" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d">
            <span style="font-size:16px">⚠️</span>
            <div><strong>Sudah tercatat!</strong> Meteran ini sudah dicatat untuk {{ bulanNames[bulan] }} {{ tahun }} dengan stand {{ recordedStand }}. Anda masih bisa mengubahnya jika perlu. Data di bawah diambil dari pencatatan terakhir.</div>
          </div>
          <div v-else-if="hasUnpaidHistory" class="p-3 rounded-lg text-xs flex items-start gap-2 mb-3" style="background:#dbeafe;color:#1e40af;border:1px solid #93c5fd">
            <span style="font-size:16px">ℹ️</span>
            <div>Meteran ini memiliki riwayat pencatatan sebelumnya. Meter Sebelum diambil dari pencatatan terakhir.</div>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-lg" style="background:#e3f2fd">
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold" style="background:#bbdefb;color:#1565c0">{{ (selectedMeter.NamaWarga||selectedMeter.NamaKepalaKK||'?').charAt(0) }}</div>
            <div><div class="font-semibold" style="color:#1e293b">{{ selectedMeter.NamaWarga||selectedMeter.NamaKepalaKK }}</div><div class="text-xs font-mono" style="color:#64748b">{{ selectedMeter.NoMeteran }}</div></div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label-custom">Meter Sebelum</label><input v-model.number="standBulanLalu" type="number" class="form-control-custom" placeholder="0" /></div>
            <div><label class="form-label-custom">Meter Berikutnya</label><input v-model.number="standSekarang" type="number" class="form-control-custom" placeholder="Isi stand..." @focus="$event.target.select()" /></div>
          </div>

          <div class="p-3 rounded-lg flex justify-between items-center mt-2" style="background:#ecfdf5"><span class="font-semibold text-sm">Pemakaian</span><span class="text-xl font-bold" style="color:#059669">{{ pemakaian }} m³</span></div>

          <div><label class="form-label-custom">Tarif</label><select v-model="selectedTarifId" class="form-control-custom" style="font-size:12px"><option v-for="t in tarifList" :key="t.Id" :value="t.Id">{{ t.NamaTarif }} - Rp {{ (t.HargaPerM3||0).toLocaleString('id-ID') }}/m³</option></select></div>

          <div class="p-3 rounded-lg flex justify-between items-center mt-2" style="background:#eff6ff"><span class="font-semibold text-sm">Estimasi Tagihan</span><span class="text-xl font-bold" style="color:#1e40af">Rp {{ tagihan.toLocaleString('id-ID') }}</span></div>

          <div>
            <label class="form-label-custom">Foto Meteran</label>
            <label style="display:flex;align-items:center;gap:10px;padding:12px;border:2px dashed #dde3ec;border-radius:8px;cursor:pointer">
              <Camera class="h-5 w-5 text-slate-400" /><span class="text-xs" style="color:#64748b">{{ fotoFile ? fotoFile.name : 'Klik untuk unggah foto' }}</span>
              <input type="file" accept="image/*" capture="environment" hidden @change="handleFoto" />
            </label>
            <img v-if="fotoPreview" :src="fotoPreview" style="max-width:100%;max-height:160px;border-radius:8px;margin-top:8px" />
          </div>

          <div>
            <label class="form-label-custom">Lokasi GPS</label>
            <div class="flex gap-2"><input :value="gpsCoords" class="form-control-custom" style="font-size:12px" placeholder="Klik ikon maps..." disabled /><Button variant="outline" size="sm" class="text-xs h-9 px-2 shrink-0" @click="getGPS"><MapPin class="h-3.5 w-3.5" /></Button></div>
          </div>

          <div><label class="form-label-custom">Catatan</label><textarea v-model="catatan" class="form-control-custom" rows="2" placeholder="Opsional..."></textarea></div>

          <Button variant="default" class="w-full" :disabled="saving" @click="simpanPencatatan"><Loader2 v-if="saving" class="h-4 w-4 animate-spin" />{{ saving?'Menyimpan...':'Simpan Pencatatan' }}</Button>
          </div>
        </template>
      </div>

      <!-- RIGHT -->
      <div class="rounded-xl border shadow-sm p-5 space-y-4" style="background:#ffffff;border-color:#e2e8f0;max-height:calc(100vh - 140px);overflow-y:auto">
        <h3 class="font-bold text-sm" style="color:#0f172a">Status {{ bulanNames[bulan] }} {{ tahun }}</h3>
        <div class="p-3 rounded-lg" style="background:#ecfdf5"><div class="text-xs" style="color:#64748b">Total Pelanggan</div><div class="text-lg font-bold" style="color:#065f46">{{ allMeters.length }}</div></div>
        <div class="p-3 rounded-lg" style="background:#eff6ff"><div class="text-xs" style="color:#64748b">Tercatat</div><div class="text-lg font-bold" style="color:#1e40af">{{ tercatat }}</div></div>
        <div class="p-3 rounded-lg" style="background:#fef2f2"><div class="text-xs" style="color:#64748b">Belum Tercatat</div><div class="text-lg font-bold" style="color:#991b1b">{{ Math.max(0, allMeters.length - tercatat) }}</div></div>

        <h3 class="font-bold text-sm mt-4" style="color:#0f172a">Riwayat Hari Ini</h3>
        <div v-if="riwayatHariIni.length===0" class="text-xs text-center py-4" style="color:#94a3b8">Belum ada pencatatan</div>
        <div v-else class="space-y-2">
          <div v-for="r in riwayatHariIni" :key="r.Id" class="text-xs p-2 rounded" style="background:#f8fafc">
            <div class="font-semibold truncate" style="color:#1e293b">{{ r.NamaKepalaKK||r.NamaWarga }}</div>
            <div style="color:#64748b">{{ r.StandAkhir||0 }} · {{ r.Periode||'-' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
