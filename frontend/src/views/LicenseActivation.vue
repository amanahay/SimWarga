<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { saasAPI } from '@/services/api'

const app = useAppStore()

const loading = ref(false)
const activating = ref(false)
const licenseInfo = ref(null)
const tenantLicenses = ref([])
const form = ref({
  tenantId: '',
  kodeLisensi: '',
  tipeLisensi: 'Basic',
  durationMonths: 12,
  maksWarga: '',
})

const selectedTenant = computed(() =>
  tenantLicenses.value.find((item) => String(item.tenantId) === String(form.value.tenantId)),
)

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(String(value).replace(' ', 'T')))
}

async function fetchLicenses() {
  loading.value = true
  try {
    const res = await saasAPI.licenses()
    tenantLicenses.value = res.data.data || []
    if (!form.value.tenantId && tenantLicenses.value.length) {
      form.value.tenantId = String(tenantLicenses.value[0].tenantId)
    }
  } catch (e) {
    app.showToast(e.response?.data?.error || 'Gagal memuat lisensi tenant', 'danger', 'bi-exclamation-triangle')
  } finally {
    loading.value = false
  }
}

async function activateLicense() {
  if (!form.value.tenantId) {
    app.showToast('Pilih tenant terlebih dahulu', 'warning', 'bi-exclamation-triangle')
    return
  }
  activating.value = true
  try {
    const res = await saasAPI.activateLicense({
      tenantId: Number(form.value.tenantId),
      kodeLisensi: form.value.kodeLisensi,
      tipeLisensi: form.value.tipeLisensi,
      durationMonths: Number(form.value.durationMonths),
      maksWarga: form.value.maksWarga ? Number(form.value.maksWarga) : null,
    })
    licenseInfo.value = res.data.data
    app.showToast(`Lisensi ${licenseInfo.value.tenant} berhasil diaktifkan`, 'success', 'bi-check-circle')
    form.value.kodeLisensi = ''
    await fetchLicenses()
  } catch (e) {
    app.showToast(e.response?.data?.error || 'Gagal aktivasi lisensi', 'danger', 'bi-exclamation-triangle')
  } finally {
    activating.value = false
  }
}

onMounted(() => {
  app.setPage('license-activation')
  fetchLicenses()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Aktivasi Lisensi</h1>
      <p class="page-subtitle">Aktifkan lisensi tenant dan sinkronkan dengan tagihan sistem</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="card">
          <div class="card-header"><i class="bi bi-key-fill" style="color:var(--primary);"></i> Form Aktivasi</div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:14px;">
            <div>
              <label class="form-label-custom">Tenant</label>
              <select v-model="form.tenantId" class="form-control-custom">
                <option value="">Pilih tenant...</option>
                <option v-for="item in tenantLicenses" :key="item.tenantId" :value="String(item.tenantId)">{{ item.tenant }}</option>
              </select>
            </div>
            <div>
              <label class="form-label-custom">Kode Lisensi</label>
              <input v-model="form.kodeLisensi" type="text" class="form-control-custom text-mono" placeholder="Kosongkan untuk generate otomatis" />
            </div>
            <div>
              <label class="form-label-custom">Tipe Lisensi</label>
              <select v-model="form.tipeLisensi" class="form-control-custom">
                <option value="Basic">Basic</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label class="form-label-custom">Durasi (bulan)</label>
                <input v-model.number="form.durationMonths" type="number" min="1" class="form-control-custom" />
              </div>
              <div>
                <label class="form-label-custom">Maks. Warga</label>
                <input v-model="form.maksWarga" type="number" min="0" class="form-control-custom" placeholder="Opsional" />
              </div>
            </div>
            <div v-if="selectedTenant?.pendingBill" class="warn-banner">
              <i class="bi bi-exclamation-triangle-fill" style="font-size:18px;flex-shrink:0;"></i>
              <div>Tenant ini memiliki tagihan periode {{ selectedTenant.pendingBill.periode }} sebesar Rp {{ Number(selectedTenant.pendingBill.totalTagihan).toLocaleString('id-ID') }}. Saat aktivasi, tagihan akan ditandai dibayar.</div>
            </div>
            <button class="btn-primary-custom" :disabled="activating" @click="activateLicense">
              <i class="bi bi-check-lg"></i> {{ activating ? 'Memproses...' : 'Aktifkan Lisensi' }}
            </button>
          </div>
        </div>

        <div v-if="licenseInfo" class="activation-card" style="border:1px solid var(--secondary);background:var(--secondary-soft);">
          <div class="license-icon active" style="width:56px;height:56px;margin:0 auto 12px;">
            <i class="bi bi-shield-check" style="font-size:28px;"></i>
          </div>
          <div style="font-size:16px;font-weight:700;color:var(--secondary);margin-bottom:8px;">Lisensi Aktif</div>
          <div style="font-size:13px;color:var(--text-primary);margin-bottom:4px;">{{ licenseInfo.tenant }}</div>
          <div class="activation-code">{{ licenseInfo.kodeLisensi }}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:10px;">
            {{ formatDate(licenseInfo.tanggalMulai) }} - {{ formatDate(licenseInfo.tanggalExpiry) }}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><i class="bi bi-shield" style="color:var(--primary);"></i> Status Lisensi Tenant</div>
        <div v-if="loading" class="card-body" style="padding:48px;text-align:center;color:var(--text-muted);">Memuat status lisensi...</div>
        <div v-else class="card-body" style="display:flex;flex-direction:column;gap:12px;">
          <div v-for="item in tenantLicenses" :key="item.tenantId" class="license-card">
            <div :class="['license-icon', item.status === 'Aktif' ? 'active' : item.status === 'Menunggu Pembayaran' ? 'warning' : 'inactive']">
              <i :class="['bi', item.status === 'Aktif' ? 'bi-shield-check' : 'bi-shield-exclamation']"></i>
            </div>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:14px;color:var(--text-primary);">{{ item.tenant }}</div>
              <div style="font-size:12px;color:var(--text-muted);">
                {{ formatDate(item.tanggalMulai) }} - {{ formatDate(item.tanggalExpiry) }}
              </div>
            </div>
            <span :class="['badge-status', item.status === 'Aktif' ? 'lunas' : item.status === 'Menunggu Pembayaran' ? 'pending' : 'belum']">{{ item.status }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
