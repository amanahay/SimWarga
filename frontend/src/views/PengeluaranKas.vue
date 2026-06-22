<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { pengeluaranAPI } from '@/services/api'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Input from '@/components/ui/input/Input.vue'
import ConfirmDialog from '@/components/ui/confirm-dialog/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { Loader2, Plus, Pencil, Trash2, X, TrendingDown, Calendar } from 'lucide-vue-next'

const app = useAppStore()
const { toast } = useToast()

const list = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editing = ref(null)
const showDeleteConfirm = ref(false)
const toDelete = ref(null)

const form = reactive({ Tanggal:new Date().toISOString().slice(0,10), Keterangan:'', Nominal:0 })

function formatRp(n) { return 'Rp '+Number(n||0).toLocaleString('id-ID') }
function formatNominal(n) { return n ? Number(n).toLocaleString('id-ID') : '' }
function onNominalInput(e) { form.Nominal = Number(e.target.value.replace(/\D/g,'')) }

const stats = computed(() => {
  const total = list.value.reduce((s,i)=>s+(i.Nominal||0),0)
  return { total, count: list.value.length }
})

async function fetchData() {
  loading.value = true
  try { const r = await pengeluaranAPI.list(); list.value = r.data.data||[] }
  catch(e) { toast({title:'Gagal',description:e.message,variant:'destructive'}) }
  finally { loading.value = false }
}

function openCreate() { editing.value=null; form.Tanggal=new Date().toISOString().slice(0,10); form.Keterangan=''; form.Nominal=0; showModal.value=true }
function openEdit(item) { editing.value=item; form.Tanggal=item.Tanggal||''; form.Keterangan=item.Keterangan||''; form.Nominal=item.Nominal||0; showModal.value=true }

async function handleSave() {
  if(!form.Keterangan.trim()||!form.Nominal) { toast({title:'Validasi',description:'Keterangan dan Nominal wajib',variant:'destructive'}); return }
  saving.value = true
  try {
    if(editing.value) { await pengeluaranAPI.update(editing.value.Id, form); toast({title:'Berhasil diperbarui',variant:'success'}) }
    else { await pengeluaranAPI.create(form); toast({title:'Berhasil ditambahkan',variant:'success'}) }
    showModal.value=false; fetchData()
  } catch(e) { toast({title:'Gagal',description:e.response?.data?.error||e.message,variant:'destructive'}) }
  finally { saving.value=false }
}

function confirmDelete(item) { toDelete.value=item; showDeleteConfirm.value=true }
async function doDelete() { if(!toDelete.value) return; showDeleteConfirm.value=false; try { await pengeluaranAPI.delete(toDelete.value.Id); toast({title:'Berhasil dihapus',variant:'success'}); fetchData() } catch(e) { toast({title:'Gagal',variant:'destructive'}) } finally { toDelete.value=null } }

onMounted(()=>{ app.setPage('pengeluaran'); fetchData() })
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div><h1 class="page-heading text-lg sm:text-xl font-bold">Pengeluaran Kas</h1><p class="page-subheading text-xs sm:text-sm mt-0.5">Catat dan pantau pengeluaran</p></div>
      <Button variant="default" size="sm" class="text-xs h-8 px-2.5" @click="openCreate"><Plus class="h-3.5 w-3.5" /> Catat Pengeluaran</Button>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="rounded-xl border p-4 shadow-sm" style="background:#fef2f2;border-color:#fecaca"><div class="text-xs font-medium" style="color:#991b1b">Total Pengeluaran</div><div class="text-lg font-bold mt-1" style="color:#991b1b">{{ formatRp(stats.total) }}</div></div>
      <div class="rounded-xl border p-4 shadow-sm" style="background:#eff6ff;border-color:#bfdbfe"><div class="text-xs font-medium" style="color:#1e40af">Total Transaksi</div><div class="text-lg font-bold mt-1" style="color:#1e40af">{{ stats.count }}</div></div>
      <div class="rounded-xl border p-4 shadow-sm" style="background:#ecfeff;border-color:#a5f3fc"><div class="text-xs font-medium" style="color:#155e75">Rata-rata</div><div class="text-lg font-bold mt-1" style="color:#155e75">{{ stats.count ? formatRp(Math.round(stats.total/stats.count)) : '-' }}</div></div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Loader2 class="h-8 w-8 animate-spin text-indigo-600" /></div>
    <div v-else-if="list.length===0" class="text-center py-20 text-slate-400"><TrendingDown class="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Belum ada pengeluaran</p></div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="item in list" :key="item.Id" class="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
        <div class="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div class="min-w-0 flex-1"><div class="font-semibold text-slate-900 truncate">{{ item.Keterangan }}</div><div class="text-xs text-slate-500 mt-1 flex items-center gap-1"><Calendar class="h-3 w-3" />{{ item.Tanggal||'-' }}</div></div>
          <Badge variant="destructive" class="shrink-0">Keluar</Badge>
        </div>
        <div class="flex-1 px-5 py-3"><div class="text-lg font-bold" style="color:#dc2626">{{ formatRp(item.Nominal) }}</div></div>
        <div class="flex gap-2 px-5 py-3 border-t border-slate-100">
          <Button variant="outline" size="sm" class="flex-1 text-xs h-8" @click="openEdit(item)"><Pencil class="h-3 w-3" /> Edit</Button>
          <Button variant="outline" size="sm" class="flex-1 text-xs h-8" @click="confirmDelete(item)"><Trash2 class="h-3 w-3 text-red-500" /> Hapus</Button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background:rgba(0,0,0,.5)">
      <div class="w-full max-w-md rounded-xl border border-slate-200 shadow-2xl mx-4 modal-form" style="max-height:90vh;overflow-y:auto">
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4"><h2 class="text-lg font-semibold text-slate-900">{{ editing?'Edit':'Catat' }} Pengeluaran</h2><button class="close-btn" @click="showModal=false">&times;</button></div>
        <div class="px-6 py-4 space-y-4">
          <div><label class="form-label-custom">Tanggal</label><Input v-model="form.Tanggal" type="date" /></div>
          <div><label class="form-label-custom">Keterangan <span class="text-red-500">*</span></label><Input v-model="form.Keterangan" placeholder="Contoh: Beli alat kebersihan" /></div>
          <div><label class="form-label-custom">Nominal <span class="text-red-500">*</span></label><input :value="formatNominal(form.Nominal)" type="text" class="form-control-custom" placeholder="0" @focus="$event.target.select()" @input="onNominalInput" /></div>
        </div>
        <div class="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <Button variant="outline" @click="showModal=false">Tutup</Button>
          <Button variant="default" :disabled="saving" @click="handleSave"><Loader2 v-if="saving" class="h-4 w-4 animate-spin" />{{ saving?'Menyimpan...':'Simpan' }}</Button>
        </div>
      </div>
    </div>

    <ConfirmDialog :open="showDeleteConfirm" title="Hapus Pengeluaran" :message="toDelete?'Yakin hapus '+toDelete.Keterangan+'?':''" confirm-text="Ya, Hapus" cancel-text="Tidak" @confirm="doDelete" @cancel="showDeleteConfirm=false" />
  </div>
</template>

<style scoped>
.modal-form{background:#ffffff!important}.dark .modal-form{background:#020617!important}
.close-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--border,#dde3ec);background:var(--surface-2,#f5f7fa);color:var(--text-secondary,#5a6a85);cursor:pointer;font-size:18px;line-height:1;transition:all .15s ease}.close-btn:hover{background:#ef4444;border-color:#ef4444;color:#fff}
</style>
