AZRE CHESS ARENA — STOCKFISH WASM

Isi:
- index.html
- style.css
- script.js

Perbaikan:
- Memakai nama file Stockfish 16 yang sesuai dengan paket npm:
  src/stockfish-nnue-16-single.js
  src/stockfish-nnue-16-single.wasm
- Worker diarahkan ke lokasi WASM yang benar melalui Module.locateFile.

Cara menjalankan:
1. Ekstrak ZIP.
2. Buka index.html melalui browser modern.
3. Koneksi internet diperlukan saat engine dimuat dari jsDelivr.

Jika hosting menerapkan Content Security Policy yang ketat, izinkan worker/blob dan cdn.jsdelivr.net.
