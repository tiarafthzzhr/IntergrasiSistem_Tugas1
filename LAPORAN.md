# Laporan Proyek MQTT — ChillArrival Eco-Analytics

---

## Anggota Kelompok

| Nama | NRP |
|------|-----|
| Tiara Fatimah | 5027241090 |
| Nisrina Bilqis | 5027241063 |

---

## Deskripsi Singkat Proyek

**ChillArrival Eco-Analytics** adalah sistem monitoring dan kontrol perangkat rumah pintar (*smart home*) berbasis protokol MQTT. Sistem ini mensimulasikan lingkungan rumah dengan beberapa sensor dan perangkat yang dapat dipantau serta dikontrol secara *real-time* melalui sebuah web dashboard.

Sistem memantau:
- **Konsumsi energi listrik** AC kamar tidur dan lampu dapur (kWh & estimasi tagihan Rp)
- **Suhu ruangan** dengan data yang otomatis kedaluwarsa setelah 10 detik
- **Status pintu** (terbuka/tertutup)
- **Status Hub IoT** dengan mekanisme *Last Will and Testament* (LWT)
- **Notifikasi alert** untuk suhu tinggi dan kegagalan sistem

Proyek ini mengimplementasikan fitur-fitur MQTT 5.0 secara manual (simulasi) maupun native, meliputi: QoS 0/1/2, Retained Messages, Last Will & Testament, Message Expiry, Shared Subscription, dan Flow Control.

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                      ChillArrival IoT System                    │
└─────────────────────────────────────────────────────────────────┘

  PUBLISHERS (Node.js)            BROKER (Aedes)          SUBSCRIBERS & DASHBOARD
  ─────────────────────          ────────────────          ──────────────────────────
                                                         
  ┌─────────────────┐            ┌────────────┐           ┌──────────────────────┐
  │ publisher-ac.js │──TCP 1883─▶│            │──TCP 1883─▶│ subscriber-logger.js │
  │ (AC Bedroom)    │            │   Aedes    │           │  Logger A (inst 0)   │
  │ 1000W · QoS 2   │            │   MQTT     │──TCP 1883─▶│  Logger B (inst 1)   │
  └─────────────────┘            │   Broker   │           │  (Shared Sub Group)  │
                                 │            │           └──────────────────────┘
  ┌─────────────────┐            │  Port TCP  │           
  │publisher-lamp.js│──TCP 1883─▶│  1883      │──TCP 1883─▶┌──────────────────────┐
  │ (Lampu Dapur)   │            │            │           │ subscriber-alert.js  │
  │ 40W · QoS 2     │            │  Port WS   │           │  Alert Monitor       │
  └─────────────────┘            │  8883      │           │  Flow Max 10         │
                                 │            │           └──────────────────────┘
  ┌─────────────────┐            │  Port HTTP │           
  │publisher-suhu.js│──TCP 1883─▶│  8080      │──WS 8883──▶┌──────────────────────┐
  │ (Sensor Suhu)   │            │            │           │  Web Dashboard       │
  │ QoS 0 · Expire  │            └─────┬──────┘           │  (mqtt-dashboard.html│
  └─────────────────┘                  │                  │  via HTTP :8080)     │
                                       │                  │                      │
  ┌─────────────────┐                  │HTTP              │  • Total Tagihan     │
  │publisher-pintu.js│─────────────────┘  8080            │  • Status Hub IoT    │
  │ (Sensor Pintu)  │                                     │  • Sensor Pintu      │
  │ QoS 1 · Retain  │                                     │  • Suhu Ruangan      │
  └─────────────────┘                                     │  • AC Bedroom        │
                                                          │  • Lampu Dapur       │
  ┌─────────────────┐                                     │  • Notifikasi Alert  │
  │publisher-system │──TCP 1883──────────────────────────▶│  • MQTT 5.0 Features │
  │ (Hub IoT + LWT) │                                     └──────────────────────┘
  └─────────────────┘
```

### Stack Teknologi

| Komponen | Teknologi |
|----------|-----------|
| Broker MQTT | [Aedes](https://github.com/moscajs/aedes) (Node.js) |
| Transport TCP | Port 1883 (publisher/subscriber terminal) |
| Transport WebSocket | Port 8883 (web dashboard) |
| Web Server | Node.js `http` built-in, Port 8080 |
| Client Library | `mqtt.js` |
| Frontend | HTML, CSS, JavaScript (Vanilla) |
| Font | DM Sans (Google Fonts) |

---

## Design Topic — Topic Tree

```
chillarrival/
│
├── energy/
│   ├── AC_BEDROOM        ← Payload JSON: { deviceId, deviceName, watt, kwh, cost }
│   │                        QoS: 0 | Retain: true
│   │                        Publisher: publisher-ac.js
│   │                        Subscriber: dashboard, subscriber-alert.js
│   │
│   └── LAMP_KITCHEN      ← Payload JSON: { deviceId, deviceName, watt, kwh, cost }
│                            QoS: 0 | Retain: true
│                            Publisher: publisher-lamp.js
│                            Subscriber: dashboard, subscriber-alert.js
│
├── sensor/
│   ├── suhu              ← Payload JSON: { suhu, waktu, expiresAt }
│   │                        QoS: 0 | Retain: false | Interval: 3 detik
│   │                        Publisher: publisher-suhu.js
│   │                        Subscriber: dashboard, subscriber-alert.js
│   │
│   └── pintu             ← Payload: "TERBUKA" | "TERTUTUP"
│                            QoS: 1 | Retain: true | Interval: 10 detik
│                            Publisher: publisher-pintu.js
│                            Subscriber: dashboard
│
├── command/
│   ├── AC_BEDROOM        ← Payload: "ON" | "OFF"
│   │                        QoS: 2 (Exactly Once)
│   │                        Publisher: dashboard (tombol Turn ON/OFF)
│   │                        Subscriber: publisher-ac.js
│   │
│   └── LAMP_KITCHEN      ← Payload: "ON" | "OFF"
│                            QoS: 2 (Exactly Once)
│                            Publisher: dashboard (tombol Turn ON/OFF)
│                            Subscriber: publisher-lamp.js
│
├── system/
│   └── status            ← Payload: "ONLINE" | "OFFLINE — Hub IoT mati mendadak!"
│                            QoS: 1 | Retain: true
│                            Publisher: publisher-system.js (LWT)
│                            Subscriber: dashboard, subscriber-alert.js
│
├── status/
│   ├── AC_BEDROOM        ← Payload: "ONLINE" | "OFFLINE" (LWT)
│   │                        QoS: 1 | Retain: true
│   │                        Publisher: publisher-ac.js (Will Message)
│   │                        Subscriber: dashboard
│   │
│   └── LAMP_KITCHEN      ← Payload: "ONLINE" | "OFFLINE" (LWT)
│                            QoS: 1 | Retain: true
│                            Publisher: publisher-lamp.js (Will Message)
│                            Subscriber: dashboard
│
└── alert/                ← Payload JSON: { level, pesan, waktu }
                             QoS: 1
                             Publisher: subscriber-alert.js
                             Subscriber: dashboard
```

### Pemetaan QoS per Topik

| Topik | QoS | Retain | Keterangan |
|-------|-----|--------|------------|
| `chillarrival/energy/+` | 0 | ✅ | Data energi — toleransi loss, retained agar bisa dipulihkan |
| `chillarrival/sensor/suhu` | 0 | ❌ | Data suhu real-time, kedaluwarsa 10 detik |
| `chillarrival/sensor/pintu` | 1 | ✅ | Status pintu at-least-once, disimpan broker |
| `chillarrival/command/+` | 2 | ❌ | Perintah kontrol — harus exactly once |
| `chillarrival/system/status` | 1 | ✅ | Status hub IoT, LWT |
| `chillarrival/status/+` | 1 | ✅ | Status koneksi perangkat, LWT |
| `chillarrival/alert` | 1 | ❌ | Notifikasi alert, at-least-once |

---

## Fitur-Fitur Sistem

### 1. Monitoring Energi Real-Time (AC & Lampu)

**File:** `publisher-ac.js`, `publisher-lamp.js`

Setiap perangkat memiliki sensor energi yang menghitung konsumsi listrik secara berkala:
- **AC Kamar Tidur**: 1000 Watt, di-publish setiap 2 detik ke `chillarrival/energy/AC_BEDROOM`
- **Lampu Dapur**: 40 Watt, di-publish setiap 2 detik ke `chillarrival/energy/LAMP_KITCHEN`

Payload yang dikirim:
```json
{
  "deviceId": "AC_BEDROOM",
  "deviceName": "AC Kamar Tidur",
  "watt": 1000,
  "kwh": "0.0056",
  "cost": 8
}
```

Fitur pendukung:
- **Retained message** → kWh terakhir tersimpan di broker, sehingga saat publisher restart, data kWh dipulihkan dari broker (tidak mulai dari 0)
- **Offline detection** → jika tidak ada sinyal selama 5 detik, dashboard menampilkan banner merah "Tidak ada sinyal dari publisher"

> **Screenshot:** *(Tambahkan screenshot kartu AC dan Lampu pada dashboard di sini)*

---

### 2. Kontrol Perangkat via QoS 2 (Exactly Once)

**File:** `mqtt-dashboard.html` (publisher), `publisher-ac.js` & `publisher-lamp.js` (subscriber)

Tombol **Turn ON / Turn OFF** di dashboard mengirimkan perintah ke topik `chillarrival/command/AC_BEDROOM` atau `chillarrival/command/LAMP_KITCHEN` dengan **QoS 2**.

Handshake QoS 2 yang terjadi (4 langkah):
```
Dashboard ──PUBLISH──▶ Broker ──PUBLISH──▶ Publisher AC
Dashboard ◀──PUBREC─── Broker ◀──PUBREC─── Publisher AC   (Step 2)
Dashboard ──PUBREL──▶ Broker ──PUBREL──▶ Publisher AC   (Step 3)
Dashboard ◀──PUBCOMP── Broker ◀──PUBCOMP── Publisher AC   (Step 4 ✅ Exactly Once)
```

Implementasi di terminal publisher:
```
[QoS 2] ← PUBLISH  | msgId: 1 | Step 1/4: Perintah diterima dari broker
[QoS 2] → PUBREC   | msgId: 1 | Step 2/4: Mengirim PUBREC ke broker
[QoS 2] ← PUBREL   | msgId: 1 | Step 3/4: Broker konfirmasi PUBREC
[QoS 2] → PUBCOMP  | msgId: 1 | Step 4/4: ✅ Exactly Once terkonfirmasi!
```

> **Screenshot:** *(Tambahkan screenshot terminal publisher-ac.js menampilkan QoS 2 handshake + tombol kontrol di dashboard)*

---

### 3. Last Will and Testament (LWT)

**File:** `publisher-system.js`, `publisher-ac.js`, `publisher-lamp.js`

Setiap publisher mendaftarkan **Will Message** saat terhubung ke broker:

| Publisher | Will Topic | Will Payload |
|-----------|-----------|-------------|
| `publisher-system.js` | `chillarrival/system/status` | `OFFLINE — Hub IoT mati mendadak!` |
| `publisher-ac.js` | `chillarrival/status/AC_BEDROOM` | `OFFLINE` |
| `publisher-lamp.js` | `chillarrival/status/LAMP_KITCHEN` | `OFFLINE` |

Saat publisher **mati mendadak** (tanpa `disconnect` bersih), broker otomatis mempublikasikan will message ke topik yang telah didaftarkan. Dashboard kemudian menampilkan status OFFLINE dengan warna merah berkedip.

Simulasi: Klik tombol **"Matikan Hub (simulasi)"** di dashboard untuk mempublikasikan status OFFLINE secara manual ke `chillarrival/system/status`.

> **Screenshot:** *(Tambahkan screenshot kartu "Status Hub IoT" saat OFFLINE — teks merah berkedip)*

---

### 4. Sensor Suhu + Message Expiry

**File:** `publisher-suhu.js`, `subscriber-alert.js`

Publisher mengirimkan data suhu setiap 3 detik ke `chillarrival/sensor/suhu` (QoS 0). Payload menyertakan field `expiresAt` (timestamp Unix + 10 detik):

```json
{
  "suhu": "27.3",
  "waktu": "10:45:23",
  "expiresAt": 1715591133000
}
```

**Simulasi Message Expiry:** `subscriber-alert.js` memeriksa field `expiresAt`. Jika `Date.now() > data.expiresAt`, data diabaikan dengan log:
```
[10:45:34] ⏱ Data suhu diabaikan — sudah kadaluarsa
```

Threshold alert suhu: jika suhu > **28.5°C**, subscriber-alert mempublikasikan alert ke `chillarrival/alert`:
```json
{
  "level": "WARNING",
  "pesan": "Suhu terlalu tinggi: 29.1°C (batas: 28.5°C)",
  "waktu": "10:45:23"
}
```

> **Screenshot:** *(Tambahkan screenshot kartu "Suhu Ruangan" di dashboard + terminal subscriber-alert.js)*

---

### 5. Sensor Pintu dengan Retain

**File:** `publisher-pintu.js`

Sensor pintu mempublikasikan status (`TERBUKA` / `TERTUTUP`) setiap 10 detik dengan **QoS 1 + Retain**. Karena pesan di-retain, subscriber baru (misalnya dashboard yang baru dibuka) langsung menerima status terkini tanpa harus menunggu update berikutnya.

Dashboard menampilkan:
- Emoji pintu berubah: `🚪` (tertutup) → `🚪↔` (terbuka)
- Badge status berubah warna: hijau (tertutup) / merah (terbuka)
- Tombol manual: **"Buka Pintu"** dan **"Tutup Pintu"**

> **Screenshot:** *(Tambahkan screenshot kartu "Sensor Pintu" dengan status TERBUKA dan TERTUTUP)*

---

### 6. Shared Subscription (Simulasi MQTT 5.0)

**File:** `subscriber-logger.js`

Sistem menjalankan dua instance logger secara bersamaan yang membagi beban pesan secara *round-robin*:

```bash
node subscriber-logger.js 0 2   # Logger A — proses pesan ke-1, 3, 5...
node subscriber-logger.js 1 2   # Logger B — proses pesan ke-2, 4, 6...
```

Simulasi topik shared subscription: `$share/loggers/chillarrival/#`

Output terminal (contoh):
```
[10:45:21] #001 📩 [Logger A] PROSES | chillarrival/sensor/suhu       | {"suhu":"26.8"...
[10:45:21] #001 ⏩ [Logger B] skip   | → dikirim ke Logger A
[10:45:24] #002 ⏩ [Logger A] skip   | → dikirim ke Logger B
[10:45:24] #002 📩 [Logger B] PROSES | chillarrival/sensor/suhu       | {"suhu":"27.1"...
```

> **Screenshot:** *(Tambahkan screenshot dua terminal Logger A dan Logger B berjalan bersamaan)*

---

### 7. Flow Control (Simulasi Receive Maximum)

**File:** `subscriber-alert.js`

Alert Monitor mengimplementasikan *flow control* manual: maksimal **10 pesan diproses bersamaan**. Pesan ke-11 dan seterusnya masuk antrian internal hingga salah satu slot selesai diproses.

```javascript
const MAX_INFLIGHT = 10;
let inflightCount = 0;
const messageQueue = [];
```

Jika antrian penuh:
```
[Flow Control] Antrian: 3 pesan menunggu
```

> **Screenshot:** *(Tambahkan screenshot terminal subscriber-alert.js saat flow control aktif)*

---

## Dashboard — Tampilan & Penjelasan Fitur

### Cara Menjalankan

```bash
# Jalankan semua komponen sekaligus:
cd mqtt-project
START-SEMUA.bat

# Atau manual:
node broker.js          # Broker (port 1883, 8883, 8080)
node publisher-suhu.js
node publisher-ac.js
node publisher-lamp.js
node publisher-system.js
node subscriber-logger.js 0 2
node subscriber-logger.js 1 2
node subscriber-alert.js

# Buka dashboard:
# http://localhost:8080/
```

---

### Tampilan Dashboard

> **Screenshot:** *(Tambahkan screenshot penuh dashboard `http://localhost:8080/`)*

Dashboard dibangun dengan dark theme menggunakan glassmorphism cards, gradien, dan blur efek. Font yang digunakan adalah **DM Sans**. Koneksi ke broker dilakukan via **MQTT over WebSocket** (port 8883).

---

### Penjelasan Setiap Kartu Dashboard

#### 1. Koneksi Status Badge (Header)
Menampilkan status koneksi WebSocket ke broker. Titik hijau berkilau = terhubung, titik merah = terputus.

> **Screenshot:** *(Badge "Terhubung secara Real-Time via MQTT")*

---

#### 2. Total Estimasi Tagihan
Kartu full-width di bagian atas menampilkan **total biaya gabungan** AC + Lampu dalam Rupiah, diperbarui setiap kali ada data energi baru masuk.

> **Screenshot:** *(Kartu total tagihan)*

---

#### 3. Status Hub IoT (LWT)
- **Fitur:** Last Will & Testament
- Menampilkan status `ONLINE` (hijau) atau `OFFLINE` (merah berkedip/animasi pulse)
- Tombol **"Matikan Hub"** untuk simulasi crash mendadak
- Tombol **"Hidupkan Hub"** untuk reset ke ONLINE

> **Screenshot:** *(Kartu Status Hub IoT — tampilkan kedua kondisi ONLINE dan OFFLINE)*

---

#### 4. Sensor Pintu
- **Fitur:** QoS 1, Retain
- Emoji dan badge berubah sesuai status pintu
- Tombol manual buka/tutup pintu dari dashboard
- Keterangan: "Retain: status tersimpan di broker, langsung muncul saat refresh"

> **Screenshot:** *(Kartu Sensor Pintu)*

---

#### 5. Suhu Ruangan
- **Fitur:** QoS 0, Message Expiry 10 detik
- Nilai suhu diperbarui setiap 3 detik
- Menampilkan waktu terakhir update

> **Screenshot:** *(Kartu Suhu Ruangan)*

---

#### 6. AC Kamar Tidur
- **Fitur:** Data QoS 0 + Retain, Command QoS 2
- Menampilkan total kWh dan estimasi biaya (Rp)
- Status badge: `● MENYALA` (hijau) / `● MATI` (abu)
- Banner merah jika publisher offline (> 5 detik tidak ada sinyal)
- Tombol **Turn ON** / **Turn OFF** (perintah QoS 2)

> **Screenshot:** *(Kartu AC Bedroom — tampilkan kondisi MENYALA dan OFFLINE)*

---

#### 7. Lampu Dapur
- **Fitur:** Retain, Command QoS 2
- Sama seperti kartu AC, 40 Watt
- Keterangan: "Data disimpan oleh Broker!" (retained energy)

> **Screenshot:** *(Kartu Lampu Dapur)*

---

#### 8. Notifikasi Alert
- **Fitur:** QoS 1, Flow Control max 10
- Menampilkan alert dari `subscriber-alert.js`
- Level alert: `WARNING` (oranye), `CRITICAL` (merah), `INFO` (biru)
- Contoh alert: *"Suhu terlalu tinggi: 29.1°C (batas: 28.5°C)"*

> **Screenshot:** *(Kartu Notifikasi Alert — tampilkan WARNING suhu tinggi)*

---

#### 9. Panel Fitur MQTT 5.0
Panel full-width di bagian bawah yang merangkum 4 fitur utama MQTT yang diimplementasikan:

| Fitur | Implementasi |
|-------|-------------|
| QoS 2 (Exactly Once) | Perintah ON/OFF AC & Lampu |
| Message Expiry | Data suhu kedaluwarsa 10 detik |
| Shared Subscription | Logger A & B berbagi pesan round-robin |
| Flow Control (Receive Max 10) | Alert Monitor antri pesan berlebih |

> **Screenshot:** *(Panel MQTT 5.0 Features di bawah dashboard)*

---

## Ringkasan Implementasi MQTT

| Fitur MQTT | Implementasi | File |
|------------|-------------|------|
| **QoS 0** | Data suhu, energi AC/Lampu | publisher-suhu.js, publisher-ac.js |
| **QoS 1** | Sensor pintu, alert, status | publisher-pintu.js, subscriber-alert.js |
| **QoS 2** | Perintah ON/OFF perangkat | mqtt-dashboard.html → publisher-ac/lamp.js |
| **Retain** | Status pintu, energi, hub, device | Semua publisher utama |
| **Last Will (LWT)** | Deteksi crash mendadak | publisher-system.js, publisher-ac.js, publisher-lamp.js |
| **Message Expiry** | Abaikan data suhu > 10 detik | publisher-suhu.js + subscriber-alert.js |
| **Shared Subscription** | Distribusi pesan round-robin | subscriber-logger.js (2 instance) |
| **Flow Control** | Max 10 pesan inflight | subscriber-alert.js |
| **WebSocket Transport** | Koneksi dashboard ke broker | broker.js (port 8883) |
| **Offline Detection** | Banner merah jika > 5s tanpa sinyal | mqtt-dashboard.html |
