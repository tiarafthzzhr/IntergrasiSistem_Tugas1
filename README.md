# ChillArrival — Eco-Analytics MQTT

Project implementasi protokol MQTT untuk monitoring energi rumah secara real-time.  
Dibuat untuk mata kuliah Integrasi Sistem.

---

## Arsitektur Sistem

```
[publisher-suhu]   [publisher-ac]   [publisher-lamp]   [publisher-system]
       |                 |                 |                    |
       └─────────────────┴─────────────────┴────────────────────┘
                                   |
                              [BROKER MQTT]
                           TCP :1883 | WS :8883
                                   |
                    ┌──────────────┴──────────────┐
             [subscriber-logger]      [subscriber-alert]
                                   |
                           [WEB DASHBOARD]
                            localhost:8080
```

---

## Fitur MQTT yang Diimplementasikan

| Fitur | Digunakan di |
|---|---|
| **QoS 0** (At most once) | publisher-suhu, publisher-ac |
| **QoS 1** (At least once) | subscriber-alert (subscribe & publish alert) |
| **Retain Flag** | publisher-lamp (data kWh tersimpan di broker) |
| **Last Will (LWT)** | publisher-ac, publisher-lamp, publisher-system |

---

## Cara Menjalankan

### Prasyarat
- [Node.js](https://nodejs.org/) versi 18 ke atas
- Terminal (PowerShell / CMD)

### Langkah 1 — Install dependencies

Buka terminal di folder project, lalu jalankan:

```bash
npm install
```

### Langkah 2 — Masuk ke folder mqtt-project

```bash
cd mqtt-project
```

### Langkah 3 — Jalankan Broker (wajib pertama)

Buka terminal baru, lalu:

```bash
node broker.js
```

Tunggu sampai muncul:
```
[Broker] MQTT TCP Server berjalan di port 1883
[Broker] MQTT WebSocket Server berjalan di port 8883
[Broker] Web Dashboard: http://localhost:8080/
```

### Langkah 4 — Jalankan Publishers (masing-masing terminal baru)

```bash
node publisher-suhu.js        # Sensor suhu ruangan (QoS 0)
node publisher-ac.js          # Sensor energi AC (QoS 0 + LWT)
node publisher-lamp.js        # Sensor energi lampu (Retain + LWT)
node publisher-system.js      # Hub IoT (LWT)
```

### Langkah 5 — Jalankan Subscribers (masing-masing terminal baru)

```bash
node subscriber-logger.js     # Mencatat semua pesan MQTT
node subscriber-alert.js      # Memantau suhu tinggi & status sistem
```

### Langkah 6 — Buka Dashboard

Buka browser dan akses:

```
http://localhost:8080
```

---

## Cara Demo Fitur

### Turn ON/OFF AC & Lampu
Klik tombol **Turn ON** / **Turn OFF** di kartu AC atau Lampu pada dashboard.

### Demo LWT (Hub IoT mati mendadak)
1. Pastikan `publisher-system.js` sedang jalan
2. Tekan **Ctrl+C** di terminal `publisher-system.js`
3. Dashboard otomatis tampil **"OFFLINE — Hub IoT mati mendadak!"**
4. Jalankan lagi `publisher-system.js` untuk restore ke ONLINE

### Demo Perangkat Offline (AC / Lampu)
1. Tekan **Ctrl+C** di terminal `publisher-ac.js` atau `publisher-lamp.js`
2. Kartu di dashboard otomatis tampil **"Tidak ada sinyal"** setelah 5 detik
3. Jalankan lagi publisher-nya untuk restore

### Demo Mati Listrik Total
Ctrl+C semua terminal publisher sekaligus — semua kartu di dashboard menunjukkan tidak ada sinyal.

---

## Struktur File

```
mqtt-project/
├── broker.js              # MQTT Broker (TCP + WebSocket + Web Server)
├── publisher-suhu.js      # Publisher: sensor suhu (QoS 0)
├── publisher-ac.js        # Publisher: sensor AC (QoS 0 + LWT)
├── publisher-lamp.js      # Publisher: sensor lampu (Retain + LWT)
├── publisher-system.js    # Publisher: Hub IoT (LWT)
├── subscriber-logger.js   # Subscriber: data logger semua topik
├── subscriber-alert.js    # Subscriber: monitor alert suhu & sistem
└── mqtt-dashboard.html    # Web dashboard (diakses via localhost:8080)
```

---

## Topik MQTT

| Topik | Deskripsi |
|---|---|
| `chillarrival/sensor/suhu` | Data suhu ruangan |
| `chillarrival/energy/AC_BEDROOM` | Data kWh AC |
| `chillarrival/energy/LAMP_KITCHEN` | Data kWh lampu |
| `chillarrival/command/AC_BEDROOM` | Perintah ON/OFF AC |
| `chillarrival/command/LAMP_KITCHEN` | Perintah ON/OFF lampu |
| `chillarrival/system/status` | Status Hub IoT (LWT) |
| `chillarrival/status/AC_BEDROOM` | Status koneksi publisher AC |
| `chillarrival/status/LAMP_KITCHEN` | Status koneksi publisher lampu |
| `chillarrival/alert` | Notifikasi alert dari subscriber |
