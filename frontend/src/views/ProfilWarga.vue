<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { profilAPI } from '@/services/api'
import { Loader2 } from 'lucide-vue-next'

const app = useAppStore()
const auth = useAuthStore()

const activeTab = ref('meteran')
const loading = ref(false)
const savingProfile = ref(false)
const showEditModal = ref(false)
const error = ref('')
const profileData = ref({
  user: null,
  warga: null,
  meteran: [],
  tagihanAir: [],
  tagihanIuran: [],
  pembayaran: [],
  totalTunggakan: 0,
})
const editForm = reactive({
  NamaLengkap: '',
  Email: '',
  NIK: '',
  NoHp: '',
  Alamat: '',
  NoRumah: '',
  RT: '',
  RW: '',
})

const profil = computed(() => {
  const user = profileData.value.user || auth.user || {}
  const warga = profileData.value.warga
  const nama = warga?.NamaKepalaKK || user.NamaLengkap || user.name || auth.userName
  return {
    nama,
    username: user.Username || user.username || auth.user?.username || '-',
    role: user.Role || user.role || auth.userRole || '-',
    tenant: user.NamaTenant || auth.user?.NamaTenant || '-',
    nik: warga?.NIK || '-',
    alamat: warga ? `${warga.Alamat || '-'}${warga.RT || warga.RW ? `, RT ${warga.RT || '-'} / RW ${warga.RW || '-'}` : ''}` : '-',
    telp: warga?.NoHp || user.NoHp || '-',
    status: warga ? (warga.IsAktif ? 'Aktif' : 'Nonaktif') : 'Akun Aktif',
    avatar: getInitials(nama),
    tunggakan: formatRp(profileData.value.totalTunggakan || 0),
    tunggakanLabel: profileData.value.totalTunggakan > 0 ? 'Masih ada tagihan belum lunas' : 'Tidak ada tunggakan aktif',
  }
})

const meteranData = computed(() => profileData.value.meteran || [])
const tagihanAirData = computed(() => profileData.value.tagihanAir || [])
const iuranData = computed(() => profileData.value.tagihanIuran || [])
const pembayaranData = computed(() => profileData.value.pembayaran || [])

async function fetchProfil() {
  loading.value = true
  error.value = ''
  try {
    const res = await profilAPI.get()
    profileData.value = {
      user: res.data.user || null,
      warga: res.data.warga || null,
      meteran: res.data.meteran || [],
      tagihanAir: res.data.tagihanAir || [],
      tagihanIuran: res.data.tagihanIuran || [],
      pembayaran: res.data.pembayaran || [],
      totalTunggakan: res.data.totalTunggakan || 0,
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Gagal memuat profil'
    app.showToast(error.value, 'danger', 'bi-exclamation-triangle')
  } finally {
    loading.value = false
  }
}

function getInitials(name) {
  return String(name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

function formatRp(n) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0))
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(String(value).replace(' ', 'T')))
}

function formatPeriode(value) {
  return value || '-'
}

function badgeBayar(status) {
  if (status === 'Lunas' || status === 'Sukses') return 'lunas'
  if (status === 'Belum' || status === 'Belum Bayar') return 'belum-bayar'
  return 'pending'
}

function chatWA() {
  if (!profil.value.telp || profil.value.telp === '-') {
    app.showToast('Nomor WhatsApp belum tersedia', 'warning', 'bi-whatsapp')
    return
  }
  const phone = String(profil.value.telp).replace(/\D/g, '').replace(/^0/, '62')
  window.open(`https://wa.me/${phone}`, '_blank')
}

function openEditProfile() {
  const user = profileData.value.user || auth.user || {}
  const warga = profileData.value.warga || {}
  editForm.NamaLengkap = warga.NamaKepalaKK || user.NamaLengkap || user.name || ''
  editForm.Email = warga.Email || user.Email || user.email || ''
  editForm.NIK = warga.NIK || ''
  editForm.NoHp = warga.NoHp || user.NoHp || ''
  editForm.Alamat = warga.Alamat || ''
  editForm.NoRumah = warga.NoRumah || ''
  editForm.RT = warga.RT || ''
  editForm.RW = warga.RW || ''
  showEditModal.value = true
}

function closeEditProfile() {
  if (savingProfile.value) return
  showEditModal.value = false
}

function onlyDigits(value, maxLength) {
  return String(value || '').replace(/\D/g, '').slice(0, maxLength)
}

function onNoHpInput() {
  editForm.NoHp = onlyDigits(editForm.NoHp, 15)
}

function onNikInput() {
  editForm.NIK = onlyDigits(editForm.NIK, 20)
}

async function saveProfile() {
  if (!editForm.NamaLengkap.trim()) {
    app.showToast('Nama lengkap wajib diisi', 'warning', 'bi-person')
    return
  }
  editForm.NoHp = onlyDigits(editForm.NoHp, 15)
  editForm.NIK = onlyDigits(editForm.NIK, 20)

  if (editForm.NoHp && editForm.NoHp.length > 15) {
    app.showToast('Nomor HP maksimal 15 angka', 'warning', 'bi-telephone')
    return
  }
  if (editForm.NIK && editForm.NIK.length > 20) {
    app.showToast('NIK maksimal 20 angka', 'warning', 'bi-person-vcard')
    return
  }

  savingProfile.value = true
  try {
    await profilAPI.update({
      NamaLengkap: editForm.NamaLengkap.trim(),
      Email: editForm.Email || null,
      NIK: editForm.NIK || null,
      NoHp: editForm.NoHp || null,
      Alamat: editForm.Alamat || null,
      NoRumah: editForm.NoRumah || null,
      RT: editForm.RT || null,
      RW: editForm.RW || null,
    })
    await fetchProfil()
    await auth.fetchMe()
    showEditModal.value = false
    app.showToast('Profil berhasil diperbarui', 'success', 'bi-check-circle')
  } catch (e) {
    app.showToast(e.response?.data?.error || e.message || 'Gagal menyimpan profil', 'danger', 'bi-exclamation-triangle')
  } finally {
    savingProfile.value = false
  }
}

onMounted(() => {
  app.setPage('profil')
  fetchProfil()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Profil Warga</h1>
      <p class="page-subtitle">Data profil dan riwayat sesuai akun login: {{ auth.userName }}</p>
    </div>

    <div v-if="loading" class="card">
      <div class="card-body" style="display:flex;align-items:center;justify-content:center;padding:48px;">
        <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    </div>

    <template v-else>
      <div v-if="error" class="card" style="margin-bottom:16px;">
        <div class="card-body" style="color:#b91c1c;">{{ error }}</div>
      </div>

      <div v-if="!profileData.warga" class="card" style="margin-bottom:16px;border-color:#f59e0b;background:#fffbeb;">
        <div class="card-body" style="color:#92400e;">
          Akun ini belum terhubung ke data warga. Admin dapat menautkan akun melalui halaman Data Warga.
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div class="card">
          <div class="card-body" style="display:flex;gap:16px;align-items:flex-start;">
            <div class="user-avatar" style="width:64px;height:64px;font-size:22px;border-radius:16px;flex-shrink:0;">{{ profil.avatar }}</div>
            <div style="flex:1;">
              <h2 style="font-size:20px;font-weight:700;margin:0 0 4px 0;">{{ profil.nama }}</h2>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                <span :class="['badge-status', profil.status === 'Aktif' || profil.status === 'Akun Aktif' ? 'aktif' : 'nonaktif']">{{ profil.status }}</span>
                <span class="chip">{{ profil.role }}</span>
                <span class="chip">@{{ profil.username }}</span>
              </div>
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">
                <i class="bi bi-person-vcard" style="margin-right:4px;"></i>NIK: {{ profil.nik }}
              </div>
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">
                <i class="bi bi-geo-alt" style="margin-right:4px;"></i>{{ profil.alamat }}
              </div>
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">
                <i class="bi bi-building" style="margin-right:4px;"></i>{{ profil.tenant }}
              </div>
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
                <i class="bi bi-telephone" style="margin-right:4px;"></i>{{ profil.telp }}
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn-primary-custom" style="font-size:12px;padding:6px 14px;" @click="openEditProfile">
                  <i class="bi bi-pencil-square"></i> Edit Profil
                </button>
                <button class="btn-outline-custom" style="font-size:12px;padding:6px 14px;color:#25D366;border-color:#25D366;" @click="chatWA">
                  <i class="bi bi-whatsapp"></i> WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="background:linear-gradient(135deg,#fef3c7,#fef9c3);border-color:#f59e0b;">
          <div class="card-body" style="display:flex;align-items:center;gap:14px;">
            <div style="width:48px;height:48px;background:#f59e0b;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0;">
              <i class="bi bi-exclamation-triangle-fill"></i>
            </div>
            <div>
              <div style="font-size:12px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Total Tunggakan</div>
              <div style="font-size:28px;font-weight:800;color:#92400e;">{{ profil.tunggakan }}</div>
              <div style="font-size:11px;color:#a16207;">{{ profil.tunggakanLabel }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="tab-nav" style="margin-bottom:16px;">
        <button :class="['tab-btn', { active: activeTab === 'meteran' }]" @click="activeTab = 'meteran'">
          <i class="bi bi-speedometer2"></i> Meteran
        </button>
        <button :class="['tab-btn', { active: activeTab === 'tagihan-air' }]" @click="activeTab = 'tagihan-air'">
          <i class="bi bi-droplet"></i> Tagihan Air
        </button>
        <button :class="['tab-btn', { active: activeTab === 'iuran' }]" @click="activeTab = 'iuran'">
          <i class="bi bi-cash-stack"></i> Iuran
        </button>
        <button :class="['tab-btn', { active: activeTab === 'pembayaran' }]" @click="activeTab = 'pembayaran'">
          <i class="bi bi-receipt"></i> Pembayaran
        </button>
      </div>

      <div v-if="activeTab === 'meteran'" class="card">
        <div class="table-responsive" style="padding:0;">
          <table class="table-custom">
            <thead>
              <tr>
                <th>ID</th>
                <th>No. Meter</th>
                <th>Tgl Pasang</th>
                <th>Tgl Catat Terakhir</th>
                <th>Meter Terakhir</th>
                <th style="text-align:center;">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="meteranData.length === 0"><td colspan="6" style="text-align:center;color:var(--text-muted);">Belum ada data meteran.</td></tr>
              <tr v-for="item in meteranData" :key="item.Id">
                <td><span class="chip">MT-{{ item.Id }}</span></td>
                <td class="text-mono">{{ item.NoMeteran }}</td>
                <td>{{ formatDate(item.TanggalPasang) }}</td>
                <td>{{ formatDate(item.TanggalCatatTerakhir) }}</td>
                <td class="text-mono">{{ item.StandAkhirTerakhir ?? item.StandTerakhir ?? 0 }} m3</td>
                <td style="text-align:center;"><span :class="['badge-status', item.IsAktif ? 'aktif' : 'nonaktif']">{{ item.IsAktif ? 'Aktif' : 'Nonaktif' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="activeTab === 'tagihan-air'" class="card">
        <div class="table-responsive" style="padding:0;">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Periode</th>
                <th style="text-align:right;">Pemakaian</th>
                <th style="text-align:right;">Tagihan</th>
                <th style="text-align:center;">Status</th>
                <th>Jatuh Tempo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="tagihanAirData.length === 0"><td colspan="5" style="text-align:center;color:var(--text-muted);">Belum ada tagihan air.</td></tr>
              <tr v-for="item in tagihanAirData" :key="item.Id">
                <td style="font-weight:600;">{{ formatPeriode(item.Periode) }}</td>
                <td style="text-align:right;">{{ item.Pemakaian || 0 }} m3</td>
                <td style="text-align:right;" class="text-mono">{{ formatRp(item.TotalTagihan) }}</td>
                <td style="text-align:center;"><span :class="['badge-status', badgeBayar(item.StatusTagihan)]">{{ item.StatusTagihan }}</span></td>
                <td>{{ formatDate(item.JatuhTempo) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="activeTab === 'iuran'" class="card">
        <div class="table-responsive" style="padding:0;">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Jenis Iuran</th>
                <th>Periode</th>
                <th style="text-align:right;">Jumlah</th>
                <th style="text-align:center;">Status</th>
                <th>Jatuh Tempo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="iuranData.length === 0"><td colspan="5" style="text-align:center;color:var(--text-muted);">Belum ada tagihan iuran.</td></tr>
              <tr v-for="item in iuranData" :key="item.Id">
                <td style="font-weight:600;">{{ item.NamaIuran }}</td>
                <td>{{ item.Periode }}</td>
                <td style="text-align:right;" class="text-mono">{{ formatRp(item.Nominal) }}</td>
                <td style="text-align:center;"><span :class="['badge-status', badgeBayar(item.StatusTagihan === 'Lunas' ? 'Lunas' : 'Belum Bayar')]">{{ item.StatusTagihan }}</span></td>
                <td>{{ formatDate(item.JatuhTempo) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="activeTab === 'pembayaran'" class="card">
        <div class="table-responsive" style="padding:0;">
          <table class="table-custom">
            <thead>
              <tr>
                <th>No. Transaksi</th>
                <th>Jenis</th>
                <th>Periode</th>
                <th style="text-align:right;">Jumlah</th>
                <th style="text-align:center;">Metode</th>
                <th>Tgl Bayar</th>
                <th style="text-align:center;">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pembayaranData.length === 0"><td colspan="7" style="text-align:center;color:var(--text-muted);">Belum ada riwayat pembayaran.</td></tr>
              <tr v-for="item in pembayaranData" :key="item.NomorTransaksi">
                <td><span class="chip">{{ item.NomorTransaksi }}</span></td>
                <td style="font-weight:600;">{{ item.Jenis }}</td>
                <td>{{ item.Periode }}</td>
                <td style="text-align:right;" class="text-mono">{{ formatRp(item.JumlahBayar) }}</td>
                <td style="text-align:center;"><span class="chip">{{ item.MetodeBayar }}</span></td>
                <td>{{ formatDate(item.TanggalBayar) }}</td>
                <td style="text-align:center;"><span :class="['badge-status', badgeBayar(item.Status)]">{{ item.Status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-if="showEditModal" class="fixed inset-0 z-[1100] flex items-center justify-center" style="background:rgba(15,23,42,0.55);padding:16px;">
      <div class="card" style="width:min(720px,100%);max-height:90vh;overflow:auto;background:#fff;color:#111827;">
        <div class="card-body">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;">
            <div>
              <h2 style="font-size:20px;font-weight:800;margin:0;color:#111827;">Edit Profil</h2>
              <p style="font-size:13px;color:#64748b;margin:4px 0 0;">Perubahan disimpan ke akun login dan data warga yang tertaut.</p>
            </div>
            <button class="btn-outline-custom" style="padding:8px 10px;color:#334155;border-color:#cbd5e1;" @click="closeEditProfile">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="profile-edit-grid">
            <div>
              <label class="form-label-custom">Nama Lengkap</label>
              <input v-model="editForm.NamaLengkap" class="form-control-custom" placeholder="Nama lengkap" />
            </div>
            <div>
              <label class="form-label-custom">Email</label>
              <input v-model="editForm.Email" type="email" class="form-control-custom" placeholder="email@domain.com" />
            </div>
            <div>
              <label class="form-label-custom">NIK</label>
              <input v-model="editForm.NIK" class="form-control-custom" inputmode="numeric" maxlength="20" placeholder="Maksimal 20 angka" @input="onNikInput" />
            </div>
            <div>
              <label class="form-label-custom">No. HP / WhatsApp</label>
              <input v-model="editForm.NoHp" class="form-control-custom" inputmode="numeric" maxlength="15" placeholder="Maksimal 15 angka" @input="onNoHpInput" />
            </div>
            <div>
              <label class="form-label-custom">No. Rumah</label>
              <input v-model="editForm.NoRumah" class="form-control-custom" placeholder="Contoh: A-12" />
            </div>
            <div class="profile-rt-rw-grid">
              <div>
                <label class="form-label-custom">RT</label>
                <input v-model="editForm.RT" class="form-control-custom" placeholder="001" />
              </div>
              <div>
                <label class="form-label-custom">RW</label>
                <input v-model="editForm.RW" class="form-control-custom" placeholder="007" />
              </div>
            </div>
            <div style="grid-column:1 / -1;">
              <label class="form-label-custom">Alamat</label>
              <textarea v-model="editForm.Alamat" class="form-control-custom" rows="3" placeholder="Alamat lengkap"></textarea>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;">
            <button class="btn-outline-custom" style="color:#334155;border-color:#cbd5e1;" :disabled="savingProfile" @click="closeEditProfile">
              Batal
            </button>
            <button class="btn-primary-custom" :disabled="savingProfile" @click="saveProfile">
              <Loader2 v-if="savingProfile" class="h-4 w-4 animate-spin" />
              {{ savingProfile ? 'Menyimpan...' : 'Simpan Profil' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-edit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.profile-rt-rw-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 640px) {
  .profile-edit-grid {
    grid-template-columns: 1fr;
  }
}
</style>
