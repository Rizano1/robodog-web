# Robodog Web Interface (`robodog-web`)

**Robodog Web** adalah antarmuka web modern berbasis **Next.js 16 (App Router)** yang berfungsi sebagai pusat teleoperasi, pemantauan telemetri real-time, visualisasi peta navigasi interaktif, dan panel interaksi AI Chat untuk sistem robot quadruped **Robodog**.

---

## 🚀 Fitur Utama

- **🤖 Interactive AI Chat Panel**: Interaksi dua arah dengan AI Assistant melalui backend `robodog-mcp-client` untuk mengeksekusi navigasi otonom, perintah aksi robot, dan inspeksi visual.
- **🗺️ Interactive Navigation Map**: Visualisasi 2D/3D lokasi, titik *waypoint*, posisi objek, dan lintasan navigasi robot secara real-time.
- **📹 Live Stream Video Feed**: Pengintegrasian streaming kamera robot berbasis WebRTC / RTSP / MJPEG.
- **📊 Real-time Telemetry Bar**: Papan pemantauan orientasi (roll, pitch, yaw), kecepatan, status baterai, dan konektivitas ROS.
- **📂 Spatial Explorer & Modals**:
  - **Explorer**: Navigasi hirarkis Lokasi, Objek Inspeksi, Waypoint, dan Dokumen SOP.
  - **Modals & Slide-over**: Detail spesifikasi objek, riwayat hasil inspeksi, dan dokumen panduan SOP.
- **⚡ ROS Bridge Integration**: Koneksi langsung ke node ROS menggunakan `roslib` over WebSocket (`ws://...:9090`).

---

## 🛠️ Stack Teknologi

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI & Styling**: [React 19](https://react.dev/), [TailwindCSS v4](https://tailwindcss.com/), Lucide Icons
- **Animation**: GSAP (GreenSock Animation Platform)
- **State & Data Fetching**: TanStack React Query v5, Supabase SSR / JS Client
- **ROS Integration**: `roslib` (ROSBridge WebSocket)
- **Deployment**: Docker, Docker Compose, Caddy Reverse Proxy

---

## 📁 Struktur Proyek

```text
robodog-web/
├── app/
│   ├── api/                # Route Handlers Next.js (Proxy API / Chat Backend)
│   ├── components/         # Komponen UI (ChatPanel, NavigationMap, VideoFeed, TelemetryBar, Sidebar, Modals)
│   ├── config/             # Konfigurasi aplikasi & variabel lingkungan
│   ├── context/            # React Context (ROS State, Session, Map Context)
│   ├── explorer/           # Halaman pengelola Lokasi, Objek, dan SOP
│   ├── hooks/              # Custom React Hooks (useChat, useMaps, useWaypoints, dsb.)
│   ├── providers/          # React Query & Theme Providers
│   ├── globals.css         # Styling global TailwindCSS
│   ├── layout.tsx          # Root Layout Next.js
│   └── page.tsx            # Halaman utama Dashboard Teleoperasi
├── services/               # Layanan integrasi API (Supabase & Backend Client)
├── public/                 # Aset statis & ikon
├── Caddyfile               # Konfigurasi Web Server Caddy
├── Dockerfile              # Docker Image Multi-stage build
├── docker-compose.yml      # Konfigurasi containerization
├── package.json            # Manifest paket Node.js
└── README.md
```

---

## ⚙️ Variabel Lingkungan (`.env.local`)

Buat file `.env.local` di root direktori `robodog-web/`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ROS & Video Streaming URLs
NEXT_PUBLIC_ROSBRIDGE_URL=ws://localhost:9090
NEXT_PUBLIC_VIDEO_STREAM_URL=http://localhost:1984/stream.html?src=front_facing_low&mode=webrtc,mse,hls,mjpeg

# Backend AI Client URL (Server-only)
CHAT_API_URL=http://localhost:8000
OPENAI_API_KEY=your_openai_api_key
```

---

## 💻 Cara Memulai

### 1. Install Dependensi

```bash
npm install
# atau
pnpm install
# atau
yarn install
```

### 2. Jalankan Mode Pengembang (Development)

```bash
npm run dev
```

Aplikasi dapat diakses di browser pada: [http://localhost:3000](http://localhost:3000).

### 3. Build & Production Mode

```bash
# Compile & build aplikasi
npm run build

# Jalankan server produksi
npm run start
```

---

## 🐳 Running with Docker

Jalankan seluruh stack web server menggunakan Docker Compose:

```bash
docker-compose up -d --build
```

Aplikasi akan dibuild secara multi-stage dan siap digunakan dalam skala produksi.
