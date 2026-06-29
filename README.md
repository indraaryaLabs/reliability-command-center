# Centralized Monitoring Command Center

Dashboard monitoring real-time untuk memantau kesehatan seluruh layanan internal dan eksternal organisasi. Dibangun sebagai bagian dari **Service Reliability Initiative** — target SLA 99.9% uptime di semua platform.

Frontend: **React 19 + TypeScript + Tailwind CSS v4**  
Backend: **Express.js + TypeScript**  
Real-time: **Server-Sent Events (SSE)**  
Storage: **JSON file persistence**

---

## Kenapa Stack Ini? (The "Why")

### Kenapa React, bukan Angular?

Saya sadar brief menyebutkan Angular sebagai stack yang diutamakan. Tapi saya memilih React karena beberapa alasan praktis:

1. **Kecepatan development.** Dengan waktu 4 hari, saya butuh stack yang bisa saya gerakkan paling cepat tanpa mengorbankan kualitas. Saya jauh lebih produktif di React — component composition-nya lebih straightforward untuk dashboard seperti ini yang sifatnya banyak widget independent (kartu service, chart, log terminal, actuator panel) tanpa perlu routing kompleks.

2. **Ekosistem real-time.** React hooks (`useState`, `useEffect`, `useMemo`) membuat state management untuk SSE streaming sangat natural. Data masuk dari EventSource → update state → UI re-render. Di Angular, pattern yang sama butuh lebih banyak boilerplate (Service + Subject + async pipe), yang bukan masalah di project besar tapi jadi overhead di prototype 4 hari.

3. **Tailwind CSS tetap jadi pilihan styling.** Sesuai dengan preferensi di brief, saya pakai Tailwind v4 untuk seluruh styling. Tidak ada custom CSS yang signifikan — semua utility-first.

4. **Skalabilitas.** Kalau project ini diteruskan ke production, migrasi ke Angular tetap feasible karena logic bisnis (types, API contract, SSE protocol) sudah dipisahkan dengan jelas dari layer view. Tapi secara realistis, untuk monitoring dashboard internal yang dimaintain tim kecil, React + Vite jauh lebih lean dan developer-friendly.

### Kenapa Express.js, bukan Spring Boot?

1. **Satu bahasa, satu runtime.** Dengan Express.js + TypeScript, frontend dan backend pakai bahasa yang sama. Tipe data (`MonitoredService`, `LogEntry`, `ActuatorMetrics`) didefinisikan sekali dan digunakan di kedua sisi. Tidak ada risiko mismatch antara Java DTO dan TypeScript interface.

2. **TCP socket ping bawaan.** Node.js punya modul `net` built-in untuk raw TCP connection. Ini penting karena tidak semua service yang dimonitor itu HTTP — database (PostgreSQL) dan cache (Redis) perlu di-ping via TCP socket langsung ke port-nya. Di Spring Boot, saya perlu library tambahan atau menulis custom health indicator.

3. **SSE tanpa overhead.** Express bisa streaming SSE response dengan `res.write()` langsung — tidak perlu WebFlux atau SseEmitter setup. Untuk dashboard yang cuma perlu push satu arah (server → client), SSE lebih tepat daripada WebSocket.

4. **Startup instan.** `tsx server.ts` langsung jalan tanpa compile step. Bandingkan dengan Spring Boot yang butuh Maven/Gradle build + JVM warm-up. Untuk development cycle yang cepat, ini sangat membantu.

### Kenapa JSON file, bukan PostgreSQL/H2?

Keputusan yang paling pragmatis. Untuk prototype monitoring 4 hari:

- Data yang disimpan itu kecil dan sederhana — daftar service, riwayat ping, log.
- Tidak ada relasi kompleks yang butuh SQL JOIN.
- JSON file artinya **zero setup** — tidak perlu install database, konfigurasi connection string, atau manage migration.
- Siapa pun yang clone repo bisa langsung `npm install && npm run server` tanpa prerequisite tambahan.

Kalau project ini masuk production, tentu saja JSON file perlu diganti dengan database proper. Tapi untuk demonstrasi kapabilitas fullstack di window 4 hari, ini trade-off yang masuk akal.

### Arsitektur Keseluruhan

```
Browser (port 3000)                    Express API (port 3001)
┌────────────────────┐                ┌──────────────────────────┐
│  React Dashboard   │◄──── SSE ─────│  /api/stream             │
│                    │                │                          │
│  - Service Cards   │── REST API ──►│  /api/services (CRUD)    │
│  - Actuator Panel  │               │  /api/actuator/health    │
│  - Log Terminal    │               │  /api/actuator/metrics   │
│  - Latency Charts  │               │  /api/actuator/simulate  │
│                    │                │                          │
│  Fallback:         │                │  Background Workers:     │
│  In-memory sim     │                │  - Per-service scheduler │
│  jika backend mati │                │  - HTTP fetch ping       │
└────────────────────┘                │  - TCP socket ping       │
                                      │                          │
                                      │  Storage: db.json        │
                                      └──────────────────────────┘
```

**Dual-mode operation:** Frontend otomatis mendeteksi apakah backend tersedia. Kalau ya, semua data di-stream dari server via SSE. Kalau backend mati, dashboard tetap jalan penuh dengan data simulasi di memori — user tidak lihat blank page atau error.

---

## Setup Guide

### Prasyarat

- **Node.js** v18 ke atas
- **npm** v9 ke atas

### Instalasi

```bash
git clone <repo-url>
cd centralized-monitoring
npm install
```

### Menjalankan (Development)

Buka 2 terminal:

```bash
# Terminal 1 — Frontend (Vite dev server, port 3000)
npm run dev

# Terminal 2 — Backend API (Express, port 3001)
npm run server
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### Menjalankan (Production — Single Process)

```bash
npm run dev:fullstack
```

Ini akan build frontend ke `dist/`, lalu Express melayani static files + API dari satu port ([http://localhost:3001](http://localhost:3001)).

---

## Fitur

### Dashboard

- **Service cards** dengan indikator status, latency real-time, dan sparkline chart riwayat ping
- **CRUD inventory** — tambah, edit, hapus service yang dimonitor
- **Filter kategori** (Web, API, Database, Auth, Cache, Infra) dan search bar
- **KPI summary** — total services, UP/DOWN count, rata-rata latency, overall uptime

### Health Check Engine

- **Automated pinging** setiap 60 detik (atau sesuai interval per-service)
- **HTTP fetch** untuk service web/API
- **TCP socket** (modul `net`) untuk database dan cache yang tidak punya HTTP endpoint
- **Status transition logging** — log otomatis saat service berubah dari UP ke DOWN atau sebaliknya

### Self-Observability

Endpoint `/api/actuator/health` dan `/api/actuator/metrics` yang meniru format Spring Boot Actuator:
- CPU usage, heap memory, disk space
- DB connection pool status
- Overall health status: UP / DEGRADED / DOWN

### Failure Simulation

Tombol-tombol di panel "Self-Observability Hub" untuk mensimulasikan skenario kegagalan:
- **Spike CPU** — CPU naik ke 92%, health menjadi DEGRADED
- **Disrupt Database** — Connection pool collapse, semua service database otomatis DOWN (cascading failure)
- **Trigger GC** — Simulasi garbage collection dengan CPU spike sementara lalu heap reclaim
- **Reset** — Kembalikan semua kondisi ke normal

### Manual Intervention (The "Bridge")

- **Force Re-check** per service — tombol "Manual Sync Check" di detail panel
- **Sweep All** — re-check semua service sekaligus dari header
- **Force Toggle** — paksa status service UP/DOWN untuk testing

### Error Handling

Saat backend tidak tersedia:
- Banner kuning muncul: "OFFLINE IN-MEMORY SIMULATION"
- Dashboard tetap berfungsi penuh dengan data mock
- Saat backend kembali hidup, otomatis reconnect dan switch ke live mode

---

## API Reference

### Services

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `GET` | `/api/services` | Daftar semua service |
| `POST` | `/api/services` | Tambah service baru |
| `PUT` | `/api/services/:id` | Update konfigurasi service |
| `DELETE` | `/api/services/:id` | Hapus service |
| `POST` | `/api/services/:id/recheck` | Force health check |
| `POST` | `/api/services/recheck` | Sweep semua service |
| `POST` | `/api/services/:id/toggle` | Toggle status UP/DOWN |

### Actuator

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `GET` | `/api/actuator/health` | Health check (format Spring Boot) |
| `GET` | `/api/actuator/metrics` | Metrics sistem |
| `POST` | `/api/actuator/simulate/cpu` | Toggle CPU spike |
| `POST` | `/api/actuator/simulate/db` | Toggle DB disruption |
| `POST` | `/api/actuator/gc` | Trigger garbage collection |
| `POST` | `/api/actuator/simulate/reset` | Reset semua intervensi |

### Streaming

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `GET` | `/api/stream` | SSE stream (services + logs + actuator) |

---

## Struktur Project

```
centralized-monitoring/
├── server.ts              # Backend Express API
├── src/
│   ├── App.tsx            # Komponen utama React
│   ├── main.tsx           # Entry point
│   ├── types.ts           # Type definitions (shared contract)
│   ├── index.css          # Tailwind styles
│   ├── components/
│   │   ├── ActuatorPanel.tsx    # Panel self-observability
│   │   ├── LogTerminal.tsx      # Terminal log real-time
│   │   ├── MetricCard.tsx       # Kartu KPI summary
│   │   ├── ServiceCard.tsx      # Kartu status per service
│   │   ├── ServiceChart.tsx     # Sparkline latency chart
│   │   └── ServiceFormModal.tsx # Modal form CRUD service
│   └── data/
│       ├── mockServices.ts      # Data seed untuk simulation mode
│       └── logHelper.ts         # Helper pembuatan log entries
├── vite.config.ts         # Vite config + API proxy
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

---

## Challenge Log

Kendala teknis paling signifikan yang saya hadapi adalah **mendesain dual-mode operation** — bagaimana membuat satu codebase frontend yang bisa jalan dengan dua sumber data yang berbeda (backend live vs simulasi lokal).

Masalahnya bukan cuma soal "kalau backend mati, pakai data mock." Yang tricky adalah transisi antar mode:

1. **Timing.** EventSource connection ke `/api/stream` butuh waktu untuk establish. Kalau saya langsung set mode ke "simulation" sebelum connection punya kesempatan connect, user melihat flash banner kuning yang tidak perlu. Solusinya: saya kasih window 2 detik sebelum fallback ke simulation, dan tangani `onerror` event dari EventSource untuk trigger fallback.

2. **State conflict.** Saat mode berubah dari simulation ke live (backend baru dihidupkan), state lokal React harus sepenuhnya di-replace oleh data dari SSE stream. Tapi kalau user sedang melihat detail service tertentu (`selectedService`), saya tidak bisa langsung buang state itu. Saya harus match ulang selectedService berdasarkan ID dari data baru.

3. **Simulation timer cleanup.** Di simulation mode, ada `setInterval` yang jalan untuk mock heartbeats. Saat beralih ke live mode, semua interval itu harus di-clear. Kalau tidak, data mock dan data live bercampur. Saya pakai `useRef` untuk track interval IDs dan cleanup di `useEffect` saat `isLiveMode` berubah.

Ini bukan masalah yang sulit secara algoritmik, tapi butuh perhatian terhadap edge cases yang tidak terlihat sampai ditest manual berulang kali.

---

## Scripts

| Script | Command | Keterangan |
|--------|---------|------------|
| `dev` | `npm run dev` | Frontend dev server (port 3000) |
| `server` | `npm run server` | Backend API (port 3001) |
| `build` | `npm run build` | Build production frontend |
| `dev:fullstack` | `npm run dev:fullstack` | Build + serve dari Express |
| `lint` | `npm run lint` | TypeScript type check |

---

## Evidence

### Screenshots
Seluruh fitur utama dashboard dan observabilitas telah didokumentasikan di folder target artifact:
- **Main Dashboard**: ![Dashboard Utama](file:///C:/Users/Indra/.gemini/antigravity-ide/brain/ea8ea6d6-e5a9-476a-ab0d-505b4f66083c/initial_dashboard_1782764325223.png)
- **Observability Hub & Terminal Logs**: ![Observability & Logs](file:///C:/Users/Indra/.gemini/antigravity-ide/brain/ea8ea6d6-e5a9-476a-ab0d-505b4f66083c/bottom_dashboard_logs_1782764399547.png)

### Video Demo
*Silakan masukkan tautan video demo singkat (maks 2 menit) Anda di sini (misalnya link Google Drive, YouTube, atau Loom).*
- **Link Video Demo**: [Tonton Video Demo Uji Teknis] (Tautan Anda)

