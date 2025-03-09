# DevOps AI Agent

AI agent dengan kemampuan Chain of Thought (CoT) untuk meremote server dan melakukan perintah DevOps secara otomatis.

## Fitur

- AI agent yang dapat memahami instruksi dalam bahasa alami
- Chain of Thought (CoT) untuk memecah tugas kompleks menjadi langkah-langkah yang logis
- Eksekusi otomatis perintah pada server jarak jauh
- Analisis hasil eksekusi dan rekomendasi langkah selanjutnya
- Dukungan untuk model AI dari OpenAI (GPT-4) dan Anthropic (Claude 3.7 Sonnet)
- Antarmuka pengguna yang intuitif dengan Vue.js dan Tailwind CSS

## Teknologi yang Digunakan

- **Frontend**: Vue.js, Tailwind CSS, Vite, Socket.io-client
- **Backend**: Express.js, Node.js, Socket.io
- **AI**: 
  - OpenAI API dengan model GPT-4
  - Anthropic API dengan model Claude 3.7 Sonnet
- **Remote Access**: SSH2 library

## Cara Kerja

1. **Pemahaman Instruksi**: AI agent menerima instruksi dalam bahasa alami dari pengguna
2. **Chain of Thought**: AI menggunakan penalaran CoT untuk memecah tugas menjadi langkah-langkah yang logis
3. **Perencanaan Tindakan**: AI menentukan perintah spesifik yang diperlukan untuk setiap langkah
4. **Eksekusi Otomatis**: Perintah dijalankan secara otomatis pada server jarak jauh
5. **Analisis Hasil**: AI menganalisis output dari setiap perintah dan memberikan ringkasan
6. **Rekomendasi**: AI memberikan rekomendasi untuk langkah selanjutnya atau perbaikan

## Penyimpanan Data

Aplikasi ini menyimpan data dalam file JSON di folder `server/data/`:

1. **llm_config.json**: Menyimpan konfigurasi model LLM dan API key
2. **servers.json**: Menyimpan daftar server yang telah didaftarkan

Folder `data/` telah ditambahkan ke `.gitignore` untuk memastikan informasi sensitif tidak masuk ke repositori.

## Cara Menjalankan

### Prasyarat

- Node.js (versi 14 atau lebih tinggi)
- NPM (versi 6 atau lebih tinggi)
- OpenAI API Key
- Anthropic API Key (opsional)

### Langkah-langkah

1. Clone repositori ini
2. Instal dependensi:
   ```bash
   # Instal dependensi server
   cd server
   npm install
   
   # Instal dependensi client
   cd ../client
   npm install
   ```

3. Konfigurasi API key (pilih salah satu metode):
   - **Metode 1**: Melalui file `.env` di folder `server`
     ```
     PORT=50539
     OPENAI_API_KEY=your-openai-api-key
     ANTHROPIC_API_KEY=your-anthropic-api-key
     ```
   - **Metode 2**: Melalui antarmuka web setelah aplikasi berjalan
     - Buka aplikasi di browser
     - Isi form "LLM Configuration" dengan API key Anda

4. Jalankan aplikasi:
   ```bash
   # Dari root proyek
   cd server
   npm start
   ```

5. Buka aplikasi di browser:
   - http://localhost:50539

## Cara Penggunaan

1. **Daftarkan Server**:
   - Masukkan nama server, host, port, username, dan metode autentikasi
   - Jika menggunakan password, masukkan password
   - Jika menggunakan private key, masukkan private key

2. **Pilih Server**:
   - Pilih server yang telah didaftarkan dari daftar

3. **Pilih Model AI**:
   - Pilih antara OpenAI GPT-4 atau Claude 3.7 Sonnet
   - Setiap model memiliki kekuatan dan karakteristik yang berbeda

4. **Berikan Instruksi**:
   - Jelaskan tugas yang ingin dilakukan dalam bahasa alami
   - Contoh: "Install dan konfigurasi Nginx sebagai web server"
   - Anda juga dapat memilih dari contoh instruksi yang tersedia

5. **Lihat Proses Chain of Thought**:
   - AI akan menampilkan proses penalarannya langkah demi langkah
   - Anda dapat melihat bagaimana AI memecah tugas menjadi langkah-langkah yang logis

6. **Pantau Eksekusi**:
   - Lihat perintah yang dijalankan dan hasilnya secara real-time
   - Setiap perintah dan outputnya ditampilkan dengan jelas

7. **Tinjau Analisis**:
   - Setelah semua perintah dijalankan, AI akan memberikan analisis hasil
   - Analisis mencakup keberhasilan tugas, masalah yang ditemui, dan rekomendasi

## Keamanan

- Kredensial server disimpan hanya dalam memori selama sesi aplikasi berjalan
- Koneksi SSH menggunakan library SSH2 yang aman
- Pastikan untuk menggunakan aplikasi ini dalam lingkungan yang aman dan terpercaya

## Pengembangan Lebih Lanjut

- Implementasi penyimpanan kredensial yang aman
- Penambahan fitur manajemen file
- Dukungan untuk eksekusi perintah batch
- Integrasi dengan layanan cloud
- Penambahan fitur monitoring server