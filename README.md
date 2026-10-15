# 燈台文庫 - Lighthouse Hashi Library 📚🗼
### by LightHouse 橋i • Prototype Software Pipeline

A responsive technical library management system designed for **LightHouse 橋i**, featuring Gemini AI-powered bulk PDF classification, persistent Firebase Firestore/Storage backend with local offline synchronization, real-time Gundam equipment lending workflows, and minimalist Japanese aesthetic design.

---

## 🇬🇧 English Documentation

### Features
1. **AI Bulk PDF Upload & Auto-Classification**:
   - Upload multiple, unlimited PDF files at once.
   - Text extracted from first pages and inspected via Gemini AI (`gemini-3.8-flash`).
   - Automatically assigns one of 16 predefined categories (`Machine Learning`, `Computer Vision`, `RAG`, `CompTIA`, `Cisco`, `Active Directory`, `Google Cloud`, `Unity`, `Unreal Engine`, `Structural Design`, `Python`, `Generative AI`, `Networking`, `Cybersecurity`, `DevOps`, `Other`), plus sub-tags and summaries.
   - Low confidence books are flagged as "Needs Review" and routed to an Unsorted shelf.
   - Full confirmation and override screen before catalog committing.
2. **Lending Workflow ("Prestar" / "Entregar")**:
   - Lend books to specific equipment hardware accounts (default 14-day loan duration).
   - "Entregar" / Return books with immediate status reset to available.
   - Renew loans (+14 days extension).
   - Real-time Status Board showing which equipment is reading which book right now.
3. **Equipment Management (Equipos)**:
   - Pre-seeded with 11 Gundam workstations: `Gundam00`, `GundamSeed`, `GundamStratus`, `GundamMac`, `GundamCloud`, `GundamCyber`, `GundamFreedom`, `GundamWing`, `GundamRaspberri`, `GundamDock`, `GundamOrange`.
   - Hardware profile pages showing active borrowings and loan history.
4. **Japanese Minimalist Aesthetic & Multilingual**:
   - Warm paper textures (`#FAF7F0`), deep indigo (`#1E2A5E`), and amber accents (`#F5A623`).
   - 3D spine shadow book covers and table view toggle.
   - English (🇬🇧), Japanese (🇯🇵), Spanish (🇪🇸) localization.
   - Dark mode toggle.
5. **Firebase Storage & Firestore Ready**:
   - Persistent storage via Cloud Firestore, Firebase Auth, and Firebase Storage.
   - Instant local storage fallback for offline demo testing.
   - Production-ready `firestore.rules` and `vercel.json`.

### Setup & Running Locally
```bash
# 1. Install dependencies
npm install

# 2. Run full-stack dev server (Express backend + Vite)
npm run dev

# 3. Build for production
npm run build
```

### Firebase Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Firestore Database**, **Firebase Storage**, and **Authentication**.
3. Apply the security rules from `firestore.rules`.
4. Add your Firebase web configuration either to your `.env` or paste them into the in-app **Firebase & Settings** tab.

---

## 🇯🇵 日本語ドキュメント (Japanese)

### 主な機能
1. **AI一括PDF登録・自動分類エンジン**:
   - 複数のPDF技術書を無制限に一括ドラッグ＆ドロップ登録。
   - Gemini AI (`gemini-3.8-flash`) が冒頭テキストと目次を高速解析。
   - 16種類の主要技術カテゴリ（機械学習、コンピュータビジョン、RAG、CompTIA、Cisco、Active Directory、GCP、Unity、Unreal Engine、構造設計、Python、生成AI、ネットワーク、サイバーセキュリティ、DevOps、その他）へ自動分類。
   - 確信度が低い場合は「要確認」として未分類棚に保管。登録前の確認・手動上書きに対応。
2. **貸出・返却ワークフロー (Prestar / Entregar)**:
   - 機材への貸出処理（デフォルト14日間、期間指定可能）。
   - ワンクリック返却処理（即座に貸出可能へ復帰）。
   - 期限延長（+14日更新）。
   - 全機材の読書状況がひと目でわかる「リアルタイム読書現況盤」を搭載。
3. **機材・設備管理 (Equipos)**:
   - ガンダムシリーズ11機（`Gundam00`〜`GundamOrange`）の機材アカウントを初期プリセット。
   - 機材ごとの現在貸出書籍、過去の読書履歴、累計読了数を集計。
4. **和風モダン・ライブラリUI**:
   - 和紙の温もり（#FAF7F0）、藍色（#1E2A5E）、琥珀色（#F5A623）を基調とした洗練されたデザイン。
   - 本棚ビュー（3D背表紙シャドウ）と一覧テーブルビューの切り替え。
   - 英語・日本語・スペイン語の3言語リアルタイム切り替え。
   - ダークモード対応。
5. **Firebase連携とローカル永続化**:
   - Cloud Firestore / Firebase Storage 連携対応。
   - APIキー未設定時でも、ブラウザローカルストレージにより全機能がオフラインで即座に動作。

---

## 🇪🇸 Documentación en Español (Spanish)

### Características Principales
1. **Carga Masiva con IA y Clasificación Automática de PDFs**:
   - Arrastra y suelta múltiples archivos PDF sin límite.
   - Extracción de texto y análisis inteligente con Gemini AI (`gemini-3.8-flash`).
   - Asignación automática de categoría principal entre 16 temas técnicos, sub-etiquetas y resúmenes.
   - Detección de incertidumbre con etiqueta "Requiere Revisión".
   - Pantalla de confirmación para modificar títulos, autores y categorías antes de guardar.
2. **Flujo de Préstamo y Devolución (Prestar / Entregar)**:
   - Prestar libros a equipos técnicos (plazo de 14 días por defecto o personalizado).
   - Entregar / Devolver libros de forma instantánea.
   - Renovar préstamos (+14 días).
   - Tablero de estado en tiempo real para ver qué equipo está leyendo qué libro ahora mismo.
3. **Gestión de Equipos (Equipos / Gundams)**:
   - 11 equipos de desarrollo Gundam pre-configurados (`Gundam00` a `GundamOrange`).
   - Perfil de cada equipo con libros actuales, fechas límite e historial de préstamos.
4. **Diseño Minimalista Japonés y Multilingüe**:
   - Inspirado en la estética de bibliotecas japonesas (papel suave `#FAF7F0`, índigo `#1E2A5E`, ámbar `#F5A623`).
   - Soporte para tres idiomas: Inglés (🇬🇧), Japonés (🇯🇵), Español (🇪🇸).
   - Modo oscuro y responsive en móvil, tablet y escritorio.
5. **Integración con Firebase**:
   - Cloud Firestore, Firebase Storage y reglas de seguridad en `firestore.rules`.
   - Modo de respaldo local automático para pruebas inmediatas sin configuración inicial.

---

### Tech Stack
- **Frontend**: React 19, Tailwind CSS v4, Lucide Icons, PDF.js
- **Backend**: Express + Vite, Node.js (`server.ts`)
- **AI Classification**: Google GenAI SDK (`@google/genai` - `gemini-3.8-flash`)
- **Database / Cloud**: Firebase Firestore, Firebase Storage, Firebase Auth
- **Deployment**: Vercel ready (`vercel.json`), Google Cloud Run ready
