<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { saasAPI } from '@/services/api'

const app = useAppStore()
const auth = useAuthStore()

const loading = ref(true)
const dashboard = ref({})

const saasGrid = ref([])

onMounted(async () => {
  app.setPage('superadmin-dashboard')
  try {
    const res = await saasAPI.dashboard()
    const d = res.data
    dashboard.value = d
    saasGrid.value = [
      { label: 'Total Tenant', value: d.totalTenant||0, icon: 'bi-buildings', color: 'blue' },
      { label: 'Tenant Aktif', value: d.tenantAktif||0, icon: 'bi-check-circle', color: 'green' },
      { label: 'Tenant Menunggak', value: d.tenantMenunggak||0, icon: 'bi-exclamation-triangle', color: 'orange' },
      { label: 'Pendapatan Bulan Ini', value: formatRp(d.pendapatanBulanIni||0), icon: 'bi-cash', color: 'blue' },
      { label: 'Pendapatan Tahun Ini', value: formatRp(d.pendapatanTahunIni||0), icon: 'bi-bar-chart', color: 'green' },
      { label: 'Total Tagihan', value: formatRp(d.totalTagihan||0), icon: 'bi-receipt', color: 'orange' },
      { label: 'Lisensi Aktif', value: d.lisensiAktif||0, icon: 'bi-shield-check', color: 'green' },
      { label: 'Lisensi Kadaluarsa', value: d.lisensiKadaluarsa||0, icon: 'bi-shield-exclamation', color: 'red' },
    ]
  } catch(e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function formatRp(n) { return 'Rp ' + Number(n).toLocaleString('id-ID') }
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
      <div>
        <h1 class="page-heading text-lg sm:text-xl font-bold">Dashboard Super Admin</h1>
        <p class="page-subheading text-xs sm:text-sm mt-0.5">Pantau seluruh tenant dan pendapatan platform SimWarga</p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><span class="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full inline-block"></span></div>

    <template v-else>
      <!-- Hero Banner -->
      <div class="saas-hero-banner" style="margin-bottom: 20px; display: flex; align-items: center; gap: 16px;">
        <i class="bi bi-graph-up-arrow saas-hero-icon" style="font-size: 56px; opacity: .2; position: static;"></i>
        <div style="flex: 1;">
          <div style="font-size: 22px; font-weight: 800; margin-bottom: 4px;">Pendapatan Platform <span style="color: #26C6DA;">{{ formatRp(dashboard.pendapatanBulanIni||0) }}</span></div>
          <div style="font-size: 13px; opacity: .85;">
            <span style="background: rgba(38,198,218,.2); padding: 2px 10px; border-radius: 20px; font-weight: 600;">{{ dashboard.tenantAktif||0 }}/{{ dashboard.totalTenant||0 }} tenant aktif</span>
          </div>
        </div>
      </div>

      <div class="saas-dashboard-grid" style="margin-bottom: 20px;">
        <div class="saas-dash-item" v-for="(item, i) in saasGrid" :key="i">
          <i :class="['bi', item.icon]" :style="{ fontSize: '20px', color: `var(--${item.color==='red'?'danger':item.color==='orange'?'warning':item.color==='green'?'secondary':'primary'})`, marginBottom: '8px', display: 'block' }"></i>
          <div class="saas-dash-val">{{ item.value }}</div>
          <div class="saas-dash-lbl">{{ item.label }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
