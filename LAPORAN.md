# LAPORAN PROYEK MQTT
# ChillArrival Eco-Analytics

**Mata Kuliah:** Integrasi Sistem  
**Institut Teknologi Sepuluh Nopember (ITS)**  
**Tahun Akademik:** 2025/2026

---

## Anggota Kelompok

| Nama | NRP |
|------|-----|
| Tiara Fatimah | 5027241090 |
| Nisrina Bilqis | 5027241063 |

---

## Abstrak

Proyek ini mengembangkan sistem monitoring dan kontrol perangkat rumah pintar (*smart home*) berbasis protokol **MQTT** (Message Queuing Telemetry Transport) yang diberi nama **ChillArrival Eco-Analytics**. Sistem dirancang untuk memantau konsumsi energi listrik perangkat rumah tangga, suhu ruangan, serta status keamanan pintu secara *real-time* melalui web dashboard interaktif.

Arsitektur sistem terdiri dari lima publisher (sensor AC, sensor lampu, sensor suhu, sensor pintu, dan hub IoT), satu broker MQTT berbasis **Aedes** (Node.js), dua subscriber (logger dan alert monitor), serta satu web dashboard yang terhubung via MQTT over WebSocket. Broker berjalan pada tiga protokol transport sekaligus: TCP (port 1883), WebSocket (port 8883), dan HTTP (port 8080).

Proyek ini mengimplementasikan berbagai fitur MQTT meliputi tiga level QoS (0, 1, dan 2), retained messages, Last Will and Testament (LWT), serta simulasi fitur MQTT 5.0 yaitu Message Expiry, Shared Subscription, dan Flow Control. Perintah kontrol ON/OFF perangkat menggunakan QoS 2 (*Exactly Once*) untuk menjamin keandalan pengiriman. Hasil implementasi menunjukkan bahwa MQTT merupakan protokol yang efisien dan andal untuk komunikasi antar perangkat IoT dalam lingkungan rumah pintar.

**Kata kunci:** MQTT, IoT, Smart Home, Monitoring Energi, QoS, Aedes Broker, Real-Time Dashboard

---

## Daftar Isi

- [BAB I — Pendahuluan](#bab-i--pendahuluan)
  - [1.1 Latar Belakang](#11-latar-belakang)
  - [1.2 Tujuan Proyek](#12-tujuan-proyek)
  - [1.3 Ruang Lingkup](#13-ruang-lingkup)
- [BAB II — Deskripsi Proyek](#bab-ii--deskripsi-proyek)
  - [2.1 Gambaran Umum Sistem](#21-gambaran-umum-sistem)
  - [2.2 Arsitektur Sistem](#22-arsitektur-sistem)
  - [2.3 Stack Teknologi](#23-stack-teknologi)
- [BAB III — Design Topic](#bab-iii--design-topic)
  - [3.1 Topic Tree](#31-topic-tree)
  - [3.2 Pemetaan QoS per Topik](#32-pemetaan-qos-per-topik)
- [BAB IV — Fitur-Fitur Sistem](#bab-iv--fitur-fitur-sistem)
  - [4.1 Monitoring Energi Real-Time](#41-monitoring-energi-real-time-ac--lampu)
  - [4.2 Kontrol Perangkat via QoS 2](#42-kontrol-perangkat-via-qos-2-exactly-once)
  - [4.3 Last Will and Testament (LWT)](#43-last-will-and-testament-lwt)
  - [4.4 Sensor Suhu dan Message Expiry](#44-sensor-suhu-dan-message-expiry)
  - [4.5 Sensor Pintu dengan Retain](#45-sensor-pintu-dengan-retain)
  - [4.6 Shared Subscription](#46-shared-subscription-simulasi-mqtt-50)
  - [4.7 Flow Control (Receive Maximum)](#47-flow-control-simulasi-receive-maximum)
- [BAB V — Dashboard](#bab-v--dashboard)
  - [5.1 Cara Menjalankan Sistem](#51-cara-menjalankan-sistem)
  - [5.2 Tampilan Dashboard](#52-tampilan-dashboard)
  - [5.3 Penjelasan Setiap Kartu Dashboard](#53-penjelasan-setiap-kartu-dashboard)
- [BAB VI — Penutup](#bab-vi--penutup)
  - [6.1 Kesimpulan](#61-kesimpulan)
  - [6.2 Ringkasan Implementasi MQTT](#62-ringkasan-implementasi-mqtt)

---

## BAB I — Pendahuluan

### 1.1 Latar Belakang

Perkembangan teknologi *Internet of Things* (IoT) mendorong kebutuhan akan protokol komunikasi yang ringan, efisien, dan andal untuk menghubungkan perangkat-perangkat dalam lingkungan rumah pintar. Konsumsi energi listrik yang tidak terpantau secara real-time menjadi salah satu masalah utama rumah tangga modern, di mana pengguna tidak mengetahui berapa besar pemakaian listrik perangkat mereka hingga tagihan datang di akhir bulan.

**MQTT** (*Message Queuing Telemetry Transport*) hadir sebagai solusi protokol *publish-subscribe* berbasis TCP/IP yang dirancang khusus untuk perangkat dengan sumber daya terbatas dan koneksi jaringan yang tidak stabil. MQTT memiliki overhead yang sangat kecil dibandingkan protokol seperti HTTP, sehingga ideal untuk komunikasi antar sensor IoT yang membutuhkan pengiriman data secara kontinu dan berkala.

Proyek **ChillArrival Eco-Analytics** memanfaatkan MQTT sebagai tulang punggung komunikasi antar perangkat dalam simulasi lingkungan rumah pintar, dengan fokus pada pemantauan konsumsi energi listrik, suhu ruangan, dan keamanan pintu secara *real-time* melalui web dashboard interaktif.

### 1.2 Tujuan Proyek

1. Mengimplementasikan broker MQTT berbasis **Aedes** (Node.js) yang mendukung transport TCP dan WebSocket secara bersamaan.
2. Membangun publisher dan subscriber untuk berbagai sensor rumah — energi, suhu, pintu, dan hub IoT.
3. Mendemonstrasikan penggunaan tiga level **QoS** (0, 1, 2) sesuai kebutuhan dan karakteristik masing-masing topik.
4. Mengimplementasikan fitur **Retained Message** dan **Last Will and Testament (LWT)** untuk persistensi data dan deteksi kegagalan perangkat secara otomatis.
5. Mensimulasikan fitur MQTT 5.0: **Message Expiry**, **Shared Subscription**, dan **Flow Control (Receive Maximum)** di sisi aplikasi.
6. Membangun **web dashboard** real-time yang memungkinkan monitoring konsumsi energi dan kontrol perangkat langsung dari browser.

### 1.3 Ruang Lingkup

Proyek ini mencakup:

- **Perangkat yang disimulasikan:** AC kamar tidur (1000W), lampu dapur (40W), sensor suhu, sensor pintu, dan hub IoT.
- **Infrastruktur:** Broker MQTT lokal (Aedes) dengan tiga endpoint — TCP :1883, WebSocket :8883, HTTP :8080.
- **Protokol:** MQTT 3.1.1 dengan implementasi manual fitur-fitur MQTT 5.0 di sisi aplikasi.
- **Platform:** Node.js (backend/broker/publisher/subscriber), HTML + CSS + JavaScript vanilla (frontend dashboard).
- **Lingkup pengujian:** Simulasi lokal (*localhost*), bukan deployment ke cloud atau perangkat keras fisik.

Proyek ini **tidak mencakup** integrasi dengan perangkat keras nyata, autentikasi atau enkripsi koneksi MQTT (TLS), maupun deployment ke lingkungan produksi.

---

## BAB II — Deskripsi Proyek

### 2.1 Gambaran Umum Sistem

**ChillArrival Eco-Analytics** adalah sistem monitoring dan kontrol perangkat rumah pintar berbasis protokol MQTT. Sistem ini mensimulasikan lingkungan rumah dengan beberapa sensor dan perangkat yang dapat dipantau serta dikontrol secara *real-time* melalui web dashboard.

Sistem memantau:

| Komponen | Fungsi |
|----------|--------|
| AC Kamar Tidur (1000W) | Monitoring konsumsi energi & kontrol ON/OFF |
| Lampu Dapur (40W) | Monitoring konsumsi energi & kontrol ON/OFF |
| Sensor Suhu | Membaca suhu ruangan setiap 3 detik (24–30°C) |
| Sensor Pintu | Memantau status buka/tutup setiap 10 detik |
| Hub IoT | Status konektivitas pusat jaringan rumah |

Selain monitoring, sistem juga menghasilkan **notifikasi alert** otomatis ketika suhu melebihi batas normal (28.5°C) atau ketika hub IoT terdeteksi mati mendadak.

### 2.2 Arsitektur Sistem

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
  ┌──────────────────┐                 │ HTTP             │  • Total Tagihan     │
  │publisher-pintu.js│─────────────────┘ 8080             │  • Status Hub IoT    │
  │ (Sensor Pintu)   │                                    │  • Sensor Pintu      │
  │ QoS 1 · Retain   │                                    │  • Suhu Ruangan      │
  └──────────────────┘                                    │  • AC Bedroom        │
                                                          │  • Lampu Dapur       │
  ┌─────────────────┐                                     │  • Notifikasi Alert  │
  │publisher-system │──TCP 1883──────────────────────────▶│  • MQTT 5.0 Features │
  │ (Hub IoT + LWT) │                                     └──────────────────────┘
  └─────────────────┘
```

Alur komunikasi:
1. **Publisher** mengirim data sensor ke broker via TCP (port 1883).
2. **Broker Aedes** mendistribusikan pesan ke semua subscriber yang berlangganan topik terkait.
3. **Subscriber terminal** (logger & alert) menerima dan memproses pesan via TCP.
4. **Web Dashboard** terhubung ke broker via WebSocket (port 8883) untuk menerima data *real-time* dan mengirim perintah kontrol.

### 2.3 Stack Teknologi

| Komponen | Teknologi |
|----------|-----------|
| Broker MQTT | Aedes v1 (Node.js) |
| Transport Terminal | MQTT over TCP, Port 1883 |
| Transport Dashboard | MQTT over WebSocket, Port 8883 |
| Web Server Dashboard | Node.js `http` built-in, Port 8080 |
| Client Library | `mqtt.js` |
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Font | DM Sans (Google Fonts) |
| Runtime | Node.js 18+ |

---

## BAB III — Design Topic

### 3.1 Topic Tree

Semua topik menggunakan namespace `chillarrival/` sebagai root untuk menghindari konflik dengan sistem lain yang mungkin menggunakan broker yang sama.

```
chillarrival/
│
├── energy/
│   ├── AC_BEDROOM        ← Payload JSON: { deviceId, deviceName, watt, kwh, cost }
│   │                        QoS: 0 | Retain: true | Interval: 2 detik
│   │                        Publisher : publisher-ac.js
│   │                        Subscriber: dashboard, subscriber-alert.js
│   │
│   └── LAMP_KITCHEN      ← Payload JSON: { deviceId, deviceName, watt, kwh, cost }
│                            QoS: 0 | Retain: true | Interval: 2 detik
│                            Publisher : publisher-lamp.js
│                            Subscriber: dashboard, subscriber-alert.js
│
├── sensor/
│   ├── suhu              ← Payload JSON: { suhu, waktu, expiresAt }
│   │                        QoS: 0 | Retain: false | Interval: 3 detik
│   │                        Publisher : publisher-suhu.js
│   │                        Subscriber: dashboard, subscriber-alert.js
│   │
│   └── pintu             ← Payload: "TERBUKA" | "TERTUTUP"
│                            QoS: 1 | Retain: true | Interval: 10 detik
│                            Publisher : publisher-pintu.js
│                            Subscriber: dashboard
│
├── command/
│   ├── AC_BEDROOM        ← Payload: "ON" | "OFF"
│   │                        QoS: 2 (Exactly Once)
│   │                        Publisher : dashboard (tombol Turn ON/OFF)
│   │                        Subscriber: publisher-ac.js
│   │
│   └── LAMP_KITCHEN      ← Payload: "ON" | "OFF"
│                            QoS: 2 (Exactly Once)
│                            Publisher : dashboard (tombol Turn ON/OFF)
│                            Subscriber: publisher-lamp.js
│
├── system/
│   └── status            ← Payload: "ONLINE" | "OFFLINE — Hub IoT mati mendadak!"
│                            QoS: 1 | Retain: true
│                            Publisher : publisher-system.js (LWT)
│                            Subscriber: dashboard, subscriber-alert.js
│
├── status/
│   ├── AC_BEDROOM        ← Payload: "ONLINE" | "OFFLINE"
│   │                        QoS: 1 | Retain: true
│   │                        Publisher : publisher-ac.js (Will Message / LWT)
│   │                        Subscriber: dashboard
│   │
│   └── LAMP_KITCHEN      ← Payload: "ONLINE" | "OFFLINE"
│                            QoS: 1 | Retain: true
│                            Publisher : publisher-lamp.js (Will Message / LWT)
│                            Subscriber: dashboard
│
└── alert                 ← Payload JSON: { level, pesan, waktu }
                             QoS: 1
                             Publisher : subscriber-alert.js
                             Subscriber: dashboard
```

### 3.2 Pemetaan QoS per Topik

| Topik | QoS | Retain | Alasan Pemilihan |
|-------|:---:|:------:|------------------|
| `chillarrival/energy/+` | 0 | ✅ | Data energi dikirim sangat sering — loss sesekali tidak kritis. Retain memastikan data terakhir bisa dipulihkan saat restart. |
| `chillarrival/sensor/suhu` | 0 | ❌ | Data real-time, kedaluwarsa 10 detik — tidak perlu jaminan pengiriman maupun disimpan. |
| `chillarrival/sensor/pintu` | 1 | ✅ | Status pintu harus tiba minimal satu kali. Retain agar subscriber baru langsung tahu kondisi terkini. |
| `chillarrival/command/+` | 2 | ❌ | Perintah ON/OFF tidak boleh hilang dan tidak boleh dobel — harus tepat satu kali (Exactly Once). |
| `chillarrival/system/status` | 1 | ✅ | Status hub IoT kritis — harus tiba dan disimpan agar dashboard baru langsung tampilkan kondisi terkini. |
| `chillarrival/status/+` | 1 | ✅ | Status koneksi perangkat (LWT) — harus tiba dan disimpan broker. |
| `chillarrival/alert` | 1 | ❌ | Notifikasi alert harus tiba minimal satu kali, namun tidak perlu disimpan permanen. |

---

## BAB IV — Fitur-Fitur Sistem

### 4.1 Monitoring Energi Real-Time (AC & Lampu)

**File:** `publisher-ac.js`, `publisher-lamp.js`

Setiap perangkat memiliki sensor energi virtual yang menghitung konsumsi listrik secara akumulatif dan mempublikasikannya setiap 2 detik:

- **AC Kamar Tidur** → 1000 Watt → topik `chillarrival/energy/AC_BEDROOM`
- **Lampu Dapur** → 40 Watt → topik `chillarrival/energy/LAMP_KITCHEN`

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

Mekanisme khusus yang diimplementasikan:

- **Retained message** — nilai kWh terakhir tersimpan di broker. Saat publisher direstart, data kWh sebelumnya dipulihkan secara otomatis (tidak mulai dari nol).
- **Offline detection** — jika tidak ada sinyal masuk selama 5 detik, dashboard menandai perangkat sebagai tidak aktif dengan banner merah.

> **Screenshot:** *(Tambahkan screenshot kartu AC Bedroom dan Lampu Dapur pada dashboard)*

---

### 4.2 Kontrol Perangkat via QoS 2 (Exactly Once)

**File:** `mqtt-dashboard.html` (publisher perintah), `publisher-ac.js` & `publisher-lamp.js` (subscriber perintah)

Tombol **Turn ON / Turn OFF** di dashboard mengirimkan perintah ke topik `chillarrival/command/AC_BEDROOM` atau `chillarrival/command/LAMP_KITCHEN` menggunakan **QoS 2** untuk menjamin perintah tiba tepat satu kali — tidak hilang dan tidak dieksekusi dua kali.

Handshake QoS 2 (4 langkah):
```
Dashboard ──PUBLISH──▶ Broker ──PUBLISH──▶ Publisher AC   (Step 1: pesan dikirim)
Dashboard ◀──PUBREC─── Broker ◀──PUBREC─── Publisher AC   (Step 2: penerima konfirmasi)
Dashboard ──PUBREL──▶ Broker ──PUBREL──▶ Publisher AC   (Step 3: pengirim rilis)
Dashboard ◀──PUBCOMP── Broker ◀──PUBCOMP── Publisher AC   (Step 4: ✅ Exactly Once selesai)
```

Output terminal publisher saat menerima perintah:
```
[QoS 2] ← PUBLISH  | msgId: 1 | Step 1/4: Perintah diterima dari broker
[QoS 2] → PUBREC   | msgId: 1 | Step 2/4: Mengirim PUBREC ke broker
[QoS 2] ← PUBREL   | msgId: 1 | Step 3/4: Broker konfirmasi PUBREC
[QoS 2] → PUBCOMP  | msgId: 1 | Step 4/4: ✅ Exactly Once terkonfirmasi!

⚙️ [AC Bedroom] Menerima Perintah: ON! AC sekarang Menyala.
```

> **Screenshot:** *(Tambahkan screenshot terminal publisher-ac.js menampilkan QoS 2 handshake + tombol Turn ON/OFF di dashboard)*

---

### 4.3 Last Will and Testament (LWT)

**File:** `publisher-system.js`, `publisher-ac.js`, `publisher-lamp.js`

LWT adalah fitur MQTT yang memungkinkan broker mengirim pesan secara otomatis ke topik tertentu ketika sebuah klien terputus secara tidak normal (crash, mati listrik, putus jaringan mendadak). Setiap publisher mendaftarkan will message saat pertama kali terhubung:

| Publisher | Will Topic | Will Payload |
|-----------|-----------|-------------|
| `publisher-system.js` | `chillarrival/system/status` | `OFFLINE — Hub IoT mati mendadak!` |
| `publisher-ac.js` | `chillarrival/status/AC_BEDROOM` | `OFFLINE` |
| `publisher-lamp.js` | `chillarrival/status/LAMP_KITCHEN` | `OFFLINE` |

Ketika publisher **mati mendadak** tanpa proses disconnect bersih, broker otomatis mempublikasikan will message. Dashboard kemudian menampilkan status OFFLINE dengan teks merah berkedip (animasi pulse).

Cara mensimulasikan: klik tombol **"Matikan Hub (simulasi)"** di kartu Status Hub IoT pada dashboard untuk mempublikasikan status OFFLINE secara manual.

> **Screenshot:** *(Tambahkan screenshot kartu "Status Hub IoT" — kondisi ONLINE (hijau) vs OFFLINE (merah berkedip))*

---

### 4.4 Sensor Suhu dan Message Expiry

**File:** `publisher-suhu.js`, `subscriber-alert.js`

Publisher mengirimkan data suhu ruangan acak (24–30°C) setiap 3 detik ke topik `chillarrival/sensor/suhu` menggunakan QoS 0. Setiap payload menyertakan field `expiresAt` berisi timestamp kedaluwarsa (waktu kirim + 10 detik):

```json
{
  "suhu": "27.3",
  "waktu": "10:45:23",
  "expiresAt": 1715591133000
}
```

**Simulasi Message Expiry:** `subscriber-alert.js` memeriksa field `expiresAt` setiap kali menerima data suhu. Jika `Date.now() > data.expiresAt`, data dianggap kedaluwarsa dan diabaikan:
```
[10:45:34] ⏱ Data suhu diabaikan — sudah kadaluarsa
```

Jika suhu dalam batas waktu valid dan nilainya **melebihi 28.5°C**, subscriber mempublikasikan alert:
```json
{
  "level": "WARNING",
  "pesan": "Suhu terlalu tinggi: 29.1°C (batas: 28.5°C)",
  "waktu": "10:45:23"
}
```

> **Screenshot:** *(Tambahkan screenshot kartu "Suhu Ruangan" di dashboard + log terminal subscriber-alert.js saat suhu tinggi)*

---

### 4.5 Sensor Pintu dengan Retain

**File:** `publisher-pintu.js`

Sensor pintu mempublikasikan status (`TERBUKA` / `TERTUTUP`) ke topik `chillarrival/sensor/pintu` setiap 10 detik menggunakan **QoS 1 + Retain**. Karena pesan di-retain, setiap subscriber baru yang bergabung (misalnya dashboard yang baru dibuka) langsung menerima status terkini dari broker tanpa harus menunggu update interval berikutnya.

Tampilan di dashboard:

| Kondisi | Emoji | Badge | Warna Border Kartu |
|---------|-------|-------|--------------------|
| TERTUTUP | 🚪 | ● TERTUTUP (hijau) | Ungu |
| TERBUKA | 🚪↔ | ● TERBUKA (merah) | Merah |

Dashboard juga menyediakan tombol manual **"Buka Pintu"** dan **"Tutup Pintu"** untuk mengubah status langsung dari browser dengan mempublikasikan ke topik yang sama (QoS 1, retain: true).

> **Screenshot:** *(Tambahkan screenshot kartu "Sensor Pintu" — tampilkan kondisi TERBUKA dan TERTUTUP)*

---

### 4.6 Shared Subscription (Simulasi MQTT 5.0)

**File:** `subscriber-logger.js`

Shared Subscription adalah fitur MQTT 5.0 yang memungkinkan beberapa subscriber dalam satu group berbagi beban pesan secara *round-robin* — setiap pesan hanya diterima oleh satu subscriber dari group tersebut. Sistem mensimulasikan ini dengan dua instance logger yang berjalan bersamaan:

```bash
node subscriber-logger.js 0 2   # Logger A — memproses pesan ke-1, 3, 5, ...
node subscriber-logger.js 1 2   # Logger B — memproses pesan ke-2, 4, 6, ...
```

Topik shared subscription yang disimulasikan: `$share/loggers/chillarrival/#`

Contoh output saat kedua logger berjalan:
```
[10:45:21] #001 📩 [Logger A] PROSES | chillarrival/sensor/suhu            | {"suhu":"26.8",...
[10:45:21] #001 ⏩ [Logger B] skip   | → dikirim ke Logger A
[10:45:24] #002 ⏩ [Logger A] skip   | → dikirim ke Logger B
[10:45:24] #002 📩 [Logger B] PROSES | chillarrival/sensor/suhu            | {"suhu":"27.1",...
```

Dengan pola ini, beban pemrosesan log terbagi rata di antara dua instance — mensimulasikan skenario *horizontal scaling* pada sistem IoT skala besar.

> **Screenshot:** *(Tambahkan screenshot dua terminal Logger A dan Logger B berjalan bersamaan secara side-by-side)*

---

### 4.7 Flow Control (Simulasi Receive Maximum)

**File:** `subscriber-alert.js`

Flow Control (Receive Maximum) adalah fitur MQTT 5.0 yang membatasi jumlah pesan QoS 1/2 yang boleh diproses secara bersamaan. Sistem mensimulasikan ini dengan antrian internal pada Alert Monitor: maksimal **10 pesan diproses bersamaan**. Pesan ke-11 dan seterusnya masuk ke antrian hingga ada slot yang kosong.

```javascript
const MAX_INFLIGHT = 10;
let inflightCount = 0;
const messageQueue = [];

// Saat pesan ke-11 datang:
// → masuk antrian, tidak langsung diproses
```

Output saat antrian aktif:
```
[Alert Monitor] Flow Control aktif: maks 10 pesan diproses bersamaan
[Flow Control] Antrian: 3 pesan menunggu
```

Mekanisme ini mencegah subscriber kewalahan saat terjadi lonjakan pesan dari banyak sensor secara bersamaan.

> **Screenshot:** *(Tambahkan screenshot terminal subscriber-alert.js saat flow control aktif dengan antrian)*

---

## BAB V — Dashboard

### 5.1 Cara Menjalankan Sistem

**Prasyarat:** Node.js 18+ terinstal, dependencies sudah di-install (`npm install` di folder `mqtt-project`).

**Cara cepat — jalankan semua sekaligus:**
```bash
cd mqtt-project
START-SEMUA.bat
```

Script `START-SEMUA.bat` akan membuka terminal terpisah untuk setiap komponen, menunggu broker siap, lalu membuka dashboard otomatis di browser.

**Cara manual — jalankan satu per satu:**
```bash
# 1. Jalankan broker terlebih dahulu
node broker.js

# 2. Jalankan publishers (di terminal terpisah)
node publisher-suhu.js
node publisher-ac.js
node publisher-lamp.js
node publisher-system.js

# 3. Jalankan subscribers (di terminal terpisah)
node subscriber-logger.js 0 2    # Logger A
node subscriber-logger.js 1 2    # Logger B
node subscriber-alert.js

# 4. Buka dashboard di browser
# http://localhost:8080/
```

### 5.2 Tampilan Dashboard

> **Screenshot:** *(Tambahkan screenshot penuh dashboard http://localhost:8080/ — tampilkan semua kartu)*

Dashboard dibangun dengan *dark theme* menggunakan teknik **glassmorphism** (kartu dengan latar transparan + blur efek), gradien halus, dan tipografi **DM Sans**. Koneksi ke broker dilakukan secara langsung dari browser menggunakan **MQTT over WebSocket** (port 8883) — tidak ada server-side rendering, semua data mengalir langsung ke antarmuka.

Status koneksi ditampilkan di bagian atas dengan badge "titik hijau berkilau" saat terhubung dan "titik merah" saat koneksi terputus.

### 5.3 Penjelasan Setiap Kartu Dashboard

#### Kartu 1 — Status Koneksi (Header Badge)

Badge di bawah judul menampilkan status koneksi WebSocket antara browser dan broker MQTT secara real-time.

- **Terhubung:** Titik hijau berkilau + teks *"Terhubung secara Real-Time via MQTT"*
- **Terputus:** Titik merah + teks *"Koneksi Terputus. Menghubungkan ulang..."*

> **Screenshot:** *(Badge status koneksi — kondisi terhubung)*

---

#### Kartu 2 — Total Estimasi Tagihan

Kartu lebar penuh (*full-width*) di bagian paling atas menampilkan **total biaya gabungan** AC dan Lampu dalam Rupiah. Nilai diperbarui setiap kali ada data energi baru masuk dari salah satu perangkat.

- Kalkulasi: `totalCost = costAC + costLamp`
- Estimasi tarif: Rp 1.500 per kWh

> **Screenshot:** *(Kartu total estimasi tagihan dengan nilai Rupiah)*

---

#### Kartu 3 — Status Hub IoT

- **Fitur MQTT:** Last Will & Testament (LWT)
- Menampilkan status sistem hub IoT: `ONLINE` (teks hijau) atau `OFFLINE` (teks merah berkedip, animasi pulse)
- Tombol **"Matikan Hub (simulasi)"** → mempublikasikan `OFFLINE` ke `chillarrival/system/status`
- Tombol **"Hidupkan Hub"** → mempublikasikan `ONLINE`
- Penjelasan singkat tentang LWT ditampilkan di dalam kartu

> **Screenshot:** *(Kartu Status Hub IoT — tampilkan kondisi ONLINE dan OFFLINE)*

---

#### Kartu 4 — Sensor Pintu

- **Fitur MQTT:** QoS 1, Retain
- Emoji berubah sesuai status: 🚪 (tertutup) / 🚪↔ (terbuka)
- Badge berwarna hijau (tertutup) atau merah (terbuka)
- Waktu update terakhir ditampilkan
- Tombol **"Buka Pintu"** dan **"Tutup Pintu"** untuk kontrol manual dari dashboard
- Keterangan pada kartu: *"Retain: status tersimpan di broker, langsung muncul saat refresh"*

> **Screenshot:** *(Kartu Sensor Pintu — kondisi TERBUKA dan TERTUTUP)*

---

#### Kartu 5 — Suhu Ruangan

- **Fitur MQTT:** QoS 0, Message Expiry 10 detik
- Nilai suhu diperbarui setiap 3 detik (rentang simulasi: 24–30°C)
- Menampilkan waktu update terakhir
- Badge fitur: *"QoS 0 · Expire 10s"*

> **Screenshot:** *(Kartu Suhu Ruangan dengan nilai °C dan waktu update)*

---

#### Kartu 6 — AC Kamar Tidur

- **Fitur MQTT:** Data QoS 0 + Retain, Perintah QoS 2
- Menampilkan total akumulasi kWh dan estimasi biaya (Rp)
- Status badge: `● MENYALA` (hijau) saat aktif / `● MATI` (abu) saat tidak aktif
- Banner merah *"Tidak ada sinyal dari publisher AC"* jika tidak ada data masuk > 5 detik
- Tombol **Turn ON** / **Turn OFF** — perintah dikirim via QoS 2

> **Screenshot:** *(Kartu AC Bedroom — kondisi MENYALA dan kondisi OFFLINE/tidak ada sinyal)*

---

#### Kartu 7 — Lampu Dapur

- **Fitur MQTT:** Retain, Perintah QoS 2
- Identik dengan kartu AC namun untuk Lampu Dapur (40 Watt)
- Keterangan pada kartu: *"Data disimpan oleh Broker!"* — menunjukkan retained energy data
- Banner merah muncul jika publisher mati

> **Screenshot:** *(Kartu Lampu Dapur — kondisi MENYALA dan MATI)*

---

#### Kartu 8 — Notifikasi Alert

- **Fitur MQTT:** QoS 1, Flow Control max 10 pesan
- Menampilkan pesan alert terbaru dari `subscriber-alert.js`
- Level alert dengan warna berbeda:
  - `WARNING` → oranye (suhu terlalu tinggi)
  - `CRITICAL` → merah (hub IoT tidak merespons)
  - `INFO` → biru (informasi umum)
- Menampilkan waktu kejadian alert

> **Screenshot:** *(Kartu Notifikasi Alert — tampilkan WARNING suhu tinggi)*

---

#### Kartu 9 — Panel Fitur MQTT 5.0

Panel lebar penuh di bagian bawah dashboard yang merangkum implementasi fitur MQTT 5.0:

| Fitur | Implementasi dalam Proyek |
|-------|--------------------------|
| QoS 2 — Exactly Once | Perintah Turn ON/OFF AC dan Lampu |
| Message Expiry | Data suhu otomatis diabaikan setelah 10 detik |
| Shared Subscription | Logger A & B berbagi pesan secara round-robin |
| Flow Control (Receive Max 10) | Alert Monitor antri pesan berlebih, maks 10 inflight |

> **Screenshot:** *(Panel MQTT 5.0 Features — bagian bawah dashboard)*

---

## BAB VI — Penutup

### 6.1 Kesimpulan

Proyek **ChillArrival Eco-Analytics** berhasil mengimplementasikan sistem monitoring dan kontrol perangkat rumah pintar berbasis protokol MQTT dengan fitur-fitur sebagai berikut:

1. **Broker Aedes** berjalan stabil dengan tiga transport sekaligus (TCP, WebSocket, HTTP), memungkinkan komunikasi dari terminal maupun browser secara bersamaan.
2. **Tiga level QoS** diimplementasikan sesuai kebutuhan masing-masing topik — QoS 0 untuk data sensor berkala, QoS 1 untuk status perangkat, dan QoS 2 untuk perintah kontrol kritis.
3. **Retained Message** terbukti efektif untuk memulihkan data kWh dan status perangkat saat subscriber/dashboard baru bergabung.
4. **LWT** berhasil mendeteksi kegagalan perangkat secara otomatis dan menampilkan notifikasi OFFLINE di dashboard.
5. **Simulasi MQTT 5.0** (Message Expiry, Shared Subscription, Flow Control) berhasil diimplementasikan di sisi aplikasi menggunakan MQTT 3.1.1 sebagai transport.
6. **Web Dashboard** menyajikan data real-time dari semua sensor dengan tampilan yang informatif dan kontrol perangkat yang responsif.

Proyek ini membuktikan bahwa MQTT adalah protokol yang efisien, fleksibel, dan tepat untuk sistem komunikasi IoT — bahkan dengan implementasi di sisi lokal tanpa perangkat keras fisik, semua konsep inti MQTT dapat didemonstrasikan secara nyata.

### 6.2 Ringkasan Implementasi MQTT

| Fitur MQTT | Implementasi | File Terkait |
|------------|-------------|--------------|
| **QoS 0** | Data suhu & energi real-time | `publisher-suhu.js`, `publisher-ac.js`, `publisher-lamp.js` |
| **QoS 1** | Status pintu, alert, hub IoT | `publisher-pintu.js`, `subscriber-alert.js`, `publisher-system.js` |
| **QoS 2** | Perintah ON/OFF perangkat | `mqtt-dashboard.html` → `publisher-ac.js`, `publisher-lamp.js` |
| **Retained Message** | Status pintu, energi, hub, device | Semua publisher utama |
| **Last Will (LWT)** | Deteksi crash mendadak | `publisher-system.js`, `publisher-ac.js`, `publisher-lamp.js` |
| **Message Expiry** | Abaikan data suhu > 10 detik | `publisher-suhu.js` + `subscriber-alert.js` |
| **Shared Subscription** | Distribusi pesan round-robin | `subscriber-logger.js` (2 instance) |
| **Flow Control** | Maks 10 pesan diproses bersamaan | `subscriber-alert.js` |
| **WebSocket Transport** | Koneksi browser ke broker | `broker.js` (port 8883) |
| **Offline Detection** | Banner merah jika > 5 detik tanpa sinyal | `mqtt-dashboard.html` |
