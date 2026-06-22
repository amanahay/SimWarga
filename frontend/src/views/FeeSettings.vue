<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { saasAPI } from '@/services/api'

const app = useAppStore()

const loading = ref(false)
const savingId = ref(null)
const search = ref('')
const filterFee = ref('')
const feeData = ref([])

const filteredFeeData = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return feeData.value.filter((item) => {
    if (filterFee.value && item.jenis !== filterFee.value) return false
    if (!keyword) return true
    return [item.tenant, item.kodeTenant, item.jenis]
      .some((value) => String(value || '').toLowerCase().includes(keyword))
  })
})

function formatRp(value) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`
}

function chipColor(jenis) {
  if (jenis === 'Persentase') return 'var(--primary)'
  if (jenis === 'Hybrid') return 'var(--accent)'
  return 'var(--secondary)'
}

function chipBg(jenis) {
  if (jenis === 'Persentase') return 'var(--primary-soft)'
  if (jenis === 'Hybrid') return 'var(--accent-soft)'
  return 'var(--secondary-soft)'
}

async function fetchFeeSettings() {
  loading.value = true
  try {
    const res = await saasAPI.feeSettings()
    feeData.value = res.data.data || []
  } catch (e) {
    app.showToast(e.response?.data?.error || 'Gagal memuat pengaturan fee', 'danger', 'bi-exclamation-triangle')
  } finally {
    loading.value = false
  }
}

async function saveItem(item) {
  savingId.value = item.tenantId
  try {
    await saasAPI.updateFeeSetting(item.tenantId, {
      jenis: item.jenis,
      persentase: item.persentase,
      minFee: item.minFee,
      maxFee: item.maxFee,
      nominalFlat: item.nominalFlat,
      isAktif: item.isAktif ? 1 : 0,
    })
    app.showToast(`Fee tenant ${item.tenant} berhasil disimpan`, 'success', 'bi-check-circle')
    await fetchFeeSettings()
  } catch (e) {
    app.showToast(e.response?.data?.error || 'Gagal menyimpan fee tenant', 'danger', 'bi-exclamation-triangle')
  } finally {
    savingId.value = null
  }
}

onMounted(() => {
  app.setPage('fee-settings')
  fetchFeeSettings()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Pengaturan Fee Aplikasi</h1>
      <p class="page-subtitle">Kelola fee sistem per tenant dengan data yang tersimpan di backend</p>
    </div>

    <div class="card" style="margin-bottom: 16px;">
      <div class="card-body" style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;">
          <label class="form-label-custom">Cari Tenant</label>
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input v-model="search" type="text" class="form-control-custom search-input" placeholder="Nama tenant atau kode..." />
          </div>
        </div>
        <div style="min-width:160px;">
          <label class="form-label-custom">Jenis Fee</label>
          <select v-model="filterFee" class="form-control-custom">
            <option value="">Semua Jenis</option>
            <option value="Persentase">Persentase</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Nominal Tetap">Nominal Tetap</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="card-body" style="padding:48px;text-align:center;color:var(--text-muted);">
        Memuat pengaturan fee...
      </div>
      <div v-else-if="filteredFeeData.length === 0" class="card-body" style="padding:48px;text-align:center;color:var(--text-muted);">
        Belum ada data fee tenant.
      </div>
      <div v-else class="table-responsive" style="padding:0;">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Jenis</th>
              <th style="width:110px;">Persen</th>
              <th style="width:140px;">Min Fee</th>
              <th style="width:140px;">Max Fee</th>
              <th style="width:140px;">Nominal Tetap</th>
              <th style="text-align:center;">Aktif</th>
              <th style="text-align:center;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredFeeData" :key="item.tenantId">
              <td>
                <div style="font-weight:700;">{{ item.tenant }}</div>
                <div style="font-size:12px;color:var(--text-muted);">{{ item.kodeTenant }}</div>
              </td>
              <td>
                <select v-model="item.jenis" class="form-control-custom">
                  <option value="Persentase">Persentase</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Nominal Tetap">Nominal Tetap</option>
                </select>
                <div style="margin-top:6px;">
                  <span class="chip" :style="{ background: chipBg(item.jenis), color: chipColor(item.jenis), borderColor: chipColor(item.jenis) }">{{ item.jenis }}</span>
                </div>
              </td>
              <td><input v-model.number="item.persentase" type="number" min="0" class="form-control-custom" /></td>
              <td><input v-model.number="item.minFee" type="number" min="0" class="form-control-custom" /></td>
              <td><input v-model.number="item.maxFee" type="number" min="0" class="form-control-custom" /></td>
              <td><input v-model.number="item.nominalFlat" type="number" min="0" class="form-control-custom" /></td>
              <td style="text-align:center;">
                <input v-model="item.isAktif" type="checkbox" />
              </td>
              <td style="text-align:center;">
                <button class="btn-outline-custom" :disabled="savingId === item.tenantId" @click="saveItem(item)">
                  <i class="bi bi-save"></i> {{ savingId === item.tenantId ? 'Menyimpan...' : 'Simpan' }}
                </button>
                <div style="margin-top:6px;font-size:11px;color:var(--text-muted);">
                  {{ item.jenis === 'Nominal Tetap' ? formatRp(item.nominalFlat) : `${item.persentase}%` }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
