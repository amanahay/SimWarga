<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { tenantsAPI, wargaAPI } from '@/services/api'
import 'leaflet/dist/leaflet.css'

const app = useAppStore()
const auth = useAuthStore()

const loading = ref(false)
const geocoding = ref(false)
const tenantMap = ref(new Map())
const wargaList = ref([])
const mapReady = ref(false)
const markerCount = computed(() => wargaList.value.filter((item) => isValidCoordinate(item.latitude, item.longitude)).length)

let L
let map
let markersLayer

function normalizeText(value) {
  return String(value || '').trim()
}

function isValidCoordinate(lat, lng) {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
}

function formatAddress(item) {
  return [
    normalizeText(item.alamat),
    item.noRumah ? `No. ${item.noRumah}` : '',
    item.rt ? `RT ${item.rt}` : '',
    item.rw ? `RW ${item.rw}` : '',
    normalizeText(item.kota),
  ]
    .filter(Boolean)
    .join(', ')
}

function buildSearchQuery(item) {
  return [
    normalizeText(item.alamat),
    item.noRumah ? `No ${item.noRumah}` : '',
    item.rt ? `RT ${item.rt}` : '',
    item.rw ? `RW ${item.rw}` : '',
    normalizeText(item.tenantNama),
    normalizeText(item.tenantAlamat),
    normalizeText(item.kota),
    'Indonesia',
  ]
    .filter(Boolean)
    .join(', ')
}

async function geocodeAddress(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'id')
  url.searchParams.set('q', query)
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })
  if (!response.ok) {
    throw new Error('Gagal mengambil koordinat dari OpenStreetMap')
  }
  const rows = await response.json()
  if (!Array.isArray(rows) || rows.length === 0) return null
  return {
    latitude: Number(rows[0].lat),
    longitude: Number(rows[0].lon),
  }
}

function mapWargaRow(item) {
  const tenant = tenantMap.value.get(item.TenantId) || {}
  return {
    id: item.Id,
    tenantId: item.TenantId,
    tenantNama: tenant.NamaTenant || '-',
    tenantAlamat: tenant.Alamat || '',
    kota: tenant.Kota || '',
    pemilik: item.NamaKepalaKK || '-',
    alamat: item.Alamat || '-',
    noRumah: item.NoRumah || '',
    rt: item.RT || '-',
    rw: item.RW || '-',
    noHp: item.NoHp || '-',
    latitude: item.Latitude != null ? Number(item.Latitude) : null,
    longitude: item.Longitude != null ? Number(item.Longitude) : null,
    statusHuni: item.StatusHuni || '-',
  }
}

async function ensureLeaflet() {
  if (L) return
  const leaflet = await import('leaflet')
  L = leaflet.default || leaflet
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

async function initMap() {
  await ensureLeaflet()
  await nextTick()
  if (map) return
  map = L.map('warga-map', {
    center: [-6.9175, 107.6191],
    zoom: 12,
    scrollWheelZoom: true,
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)
  markersLayer = L.layerGroup().addTo(map)
  mapReady.value = true
}

function renderMarkers() {
  if (!map || !markersLayer) return
  markersLayer.clearLayers()
  const points = wargaList.value.filter((item) => isValidCoordinate(item.latitude, item.longitude))
  if (points.length === 0) {
    map.setView([-6.9175, 107.6191], 11)
    return
  }

  const bounds = []
  for (const item of points) {
    const marker = L.marker([item.latitude, item.longitude]).bindPopup(`
      <div style="min-width:180px;">
        <div style="font-weight:700;margin-bottom:4px;">${item.pemilik}</div>
        <div style="font-size:12px;color:#475569;">${formatAddress(item)}</div>
        <div style="font-size:12px;margin-top:6px;">${item.tenantNama}</div>
      </div>
    `)
    marker.addTo(markersLayer)
    bounds.push([item.latitude, item.longitude])
  }

  if (bounds.length === 1) {
    map.setView(bounds[0], 16)
  } else {
    map.fitBounds(bounds, { padding: [32, 32] })
  }
}

async function hydrateCoordinates() {
  const missing = wargaList.value.filter((item) => !isValidCoordinate(item.latitude, item.longitude) && normalizeText(item.alamat))
  if (missing.length === 0) return
  geocoding.value = true
  try {
    for (const item of missing.slice(0, 12)) {
      const coords = await geocodeAddress(buildSearchQuery(item))
      if (coords) {
        item.latitude = coords.latitude
        item.longitude = coords.longitude
        renderMarkers()
      }
      await new Promise((resolve) => setTimeout(resolve, 1100))
    }
  } catch (e) {
    app.showToast(e.message || 'Gagal memuat koordinat peta', 'warning', 'bi-geo-alt')
  } finally {
    geocoding.value = false
  }
}

async function fetchPetaData() {
  loading.value = true
  try {
    const [tenantRes, wargaRes] = await Promise.all([
      tenantsAPI.list(),
      wargaAPI.list({ limit: 500, page: 1 }),
    ])
    tenantMap.value = new Map((tenantRes.data.data || []).map((item) => [item.Id, item]))
    wargaList.value = (wargaRes.data.data || []).map(mapWargaRow)
    await initMap()
    renderMarkers()
    await hydrateCoordinates()
    renderMarkers()
  } catch (e) {
    app.showToast(e.response?.data?.error || e.message || 'Gagal memuat data peta warga', 'danger', 'bi-exclamation-triangle')
  } finally {
    loading.value = false
  }
}

function bukaPetaPenuh() {
  if (!map) return
  map.invalidateSize()
  window.open('https://www.openstreetmap.org', '_blank', 'noopener')
}

function lihatDetail(item) {
  app.showToast(`${item.pemilik} - ${formatAddress(item)}`, 'info', 'bi-geo-alt')
}

onMounted(async () => {
  app.setPage('peta')
  await fetchPetaData()
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
    markersLayer = null
  }
})
</script>

<template>
  <div>
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <span><i class="bi bi-geo-alt" style="color:var(--primary);"></i> Peta Warga</span>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <span class="chip">{{ markerCount }} titik tampil</span>
          <span v-if="geocoding" class="chip">Sinkron alamat OSM...</span>
          <button class="btn-primary-custom" style="padding:6px 14px;font-size:12px;" @click="bukaPetaPenuh">
            <i class="bi bi-box-arrow-up-right"></i> OpenStreetMap
          </button>
        </div>
      </div>
      <div class="card-body" style="padding:0;">
        <div style="position:relative;">
          <div id="warga-map" style="height:420px;width:100%;"></div>
          <div
            v-if="loading"
            style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text-muted);background:rgba(255,255,255,0.7);z-index:500;"
          >
            Memuat peta warga...
          </div>
          <div v-if="markerCount === 0" style="padding:14px 16px;font-size:12px;color:var(--text-muted);border-top:1px solid var(--border);">
            Belum ada koordinat tersimpan. Sistem mencoba membaca alamat warga dari data yang ada melalui OpenStreetMap/Nominatim.
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <i class="bi bi-house" style="color:var(--primary);"></i> Daftar Rumah Warga
      </div>
      <div v-if="loading" class="card-body" style="padding:32px;text-align:center;color:var(--text-muted);">
        Memuat data rumah warga...
      </div>
      <div v-else-if="wargaList.length === 0" class="card-body" style="padding:32px;text-align:center;color:var(--text-muted);">
        Belum ada data warga.
      </div>
      <div v-else class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
          <div
            v-for="item in wargaList"
            :key="item.id"
            style="border:1px solid var(--border);border-radius:10px;overflow:hidden;cursor:pointer;background:var(--surface);"
            @click="lihatDetail(item)"
          >
            <div style="height:120px;background:linear-gradient(135deg,#e0f2fe,#bae6fd);display:flex;align-items:center;justify-content:center;">
              <i class="bi bi-house-fill" style="font-size:40px;color:var(--primary);"></i>
            </div>
            <div style="padding:10px;">
              <div style="font-weight:700;font-size:13px;">{{ item.pemilik }}</div>
              <div style="font-size:11px;color:var(--text-muted);">{{ item.alamat }}</div>
              <div style="font-size:10px;color:var(--text-muted);">RT {{ item.rt }} / RW {{ item.rw }}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">{{ item.tenantNama }}</div>
              <div style="margin-top:8px;">
                <span class="chip" :style="{ background: isValidCoordinate(item.latitude, item.longitude) ? 'var(--secondary-soft)' : 'var(--warning-soft)', color: isValidCoordinate(item.latitude, item.longitude) ? 'var(--secondary)' : 'var(--warning)' }">
                  {{ isValidCoordinate(item.latitude, item.longitude) ? 'Koordinat siap' : 'Dari geocode/alamat' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
