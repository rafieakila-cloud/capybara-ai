'use strict';

/* ============================================================
   CAPYBARA AI — Capy: santai, jenius, ngajarin sampai paham
   Cerita & blog · kode · ahli AI · belajar sampai paham
   OpenRouter · openrouter/auto default · API key sekali set
   ============================================================ */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MODE_PROMPTS = {
  umum: 'Kamu Capy, capybara AI yang santai, hangat, dan sangat pintar. Jawab langsung ke inti dengan nada ramah dan tenang. Bahasa Indonesia. JANGAN awali dengan basa-basi atau kata "Tentu". JANGAN pakai simbol bintang (**). Boleh pakai daftar atau langkah bernomor bila perlu.',
  cerita: 'Kamu Capy, penulis cerita dan penulis blog yang memukau. Tulis cerita atau artikel blog sesuai permintaan: karakter hidup, alur mengalir, dan penutup yang memuaskan. Panjang menyesuaikan permintaan. Langsung isinya — tanpa pembuka basa-basi. Jangan pakai simbol bintang (**). Bahasa Indonesia.',
  koding: 'Kamu Capy, programmer senior sekaligus guru terbaik. Tulis kode yang benar-benar jalan — lengkap, bukan potongan putus — dengan komentar singkat. Lalu jelaskan sampai pengguna PAHAM: bukan hanya bagaimana kodenya bekerja, tapi MENGAPA harus begitu. Analogi dipersilakan. Blok kode pakai tiga backtick. Jangan pakai simbol bintang (**). Bahasa Indonesia.',
  ahliai: 'Kamu Capy, ahli Artificial Intelligence terdalam: LLM, transformer, tokenisasi, training, fine-tuning, RAG, agent, embedding, evaluasi, etika, prompt engineering. Jelaskan dari analogi sederhana sampai detail teknis yang presisi — sesuaikan dengan level penanya. Sertakan contoh praktis atau cuplikan kode bila membantu. Jangan pakai simbol bintang (**). Bahasa Indonesia.',
  belajar: 'Kamu Capy, tutor pribadi yang tidak pernah menyerah. Metode mengajar: (1) jelaskan konsep dengan analogi sehari-hari yang mudah dibayangkan, (2) lanjutkan dengan versi teknis yang lebih rinci, (3) beri satu contoh konkret dengan angka atau kasus nyata, (4) tulis baris "Inti:" berisi satu-dua kalimat ringkasan, lalu tanya: "Sudah paham? Mau aku pakai analogi lain atau contoh lain?" Kalau pengguna bertanya hal yang sama sepuluh kali, jawab sepuluh kali memakai cara berbeda sampai paham. JANGAN pakai simbol bintang (**). Bahasa Indonesia.',
};

const state = {
  mode: 'umum',
  chats: [],        // [{id, title, mode, messages, created, updated}]
  currentId: null,
  sending: false,
  pendingImage: null, // dataUrl
};

/* ---------- storage ---------- */
const loadChats = () => { try { state.chats = JSON.parse(localStorage.getItem('capybara_chats') || '[]'); } catch { state.chats = []; } };
const saveChats = () => localStorage.setItem('capybara_chats', JSON.stringify(state.chats.slice(0, 60)));
const getKey = () => localStorage.getItem('capybara_apikey') || '';
const getModel = () => localStorage.getItem('capybara_model') || 'openrouter/auto';
const chatAktif = () => state.chats.find(c => c.id === state.currentId) || null;

function obrolanBaru(judul) {
  const c = { id: 'chat-' + Date.now(), title: judul || 'Chat baru', mode: state.mode, messages: [], created: Date.now(), updated: Date.now() };
  state.chats.unshift(c);
  state.currentId = c.id;
  saveChats();
  renderDaftar();
  return c;
}

/* ---------- render riwayat ---------- */
function renderDaftar() {
  $('#chat-list').innerHTML = state.chats.length
    ? state.chats.map(c => `
      <button class="chat-item${c.id === state.currentId ? ' aktif' : ''}" data-id="${escapeHtml(c.id)}">
        <span class="chat-item-title">${escapeHtml(c.title)}</span>
        <span class="chat-item-meta">${escapeHtml(c.mode.toUpperCase())} · ${new Date(c.updated).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
        <span class="chat-item-del" data-del="${escapeHtml(c.id)}" title="Hapus">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </span>
      </button>`).join('')
    : '<div style="padding:16px 12px;color:var(--redup);font-size:11px;line-height:1.7">Belum ada riwayat.<br>Mulai chat pertamamu.</div>';
}

/* ---------- render pesan ---------- */
function renderPesan() {
  const c = chatAktif();
  const box = $('#messages');
  const ada = c && c.messages.length;
  $('#welcome').classList.toggle('hidden', !!ada);
  box.classList.toggle('hidden', !ada);
  if (!ada) { box.innerHTML = ''; return; }

  box.innerHTML = c.messages.map(m => pesanHtml(m)).join('');
  box.scrollTop = box.scrollHeight;
}
function pesanHtml(m) {
  const img = m.image ? `<img class="lampiran" src="${m.image}" alt="foto terlampir">` : '';
  const teks = escapeHtml(m.content || '');
  const isi = m.role === 'assistant' ? renderIsi(teks) : img + teks;
  const tag = m.role === 'user' ? 'Kamu' : 'Capy';
  const av = m.role === 'user' ? 'KAMU' : 'CAPY';
  const avClass = m.role === 'user' ? 'user' : 'ai';
  const errClass = m.role === 'error' ? ' error-bubble' : '';
  return `<div class="msg ${m.role === 'user' ? 'user' : 'ai'}">
    <div class="avatar ${avClass}">${av}</div>
    <div class="bubble${errClass}">${m.role !== 'user' ? `<span class="msg-tag">${tag}</span>` : ''}${isi}</div>
  </div>`;
}
/* render isi jawaban: pisah blok kode (```) dari teks biasa */
function renderIsi(escapedText) {
  const parts = escapedText.split(/```/);
  let html = '';
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      html += parts[i];
    } else {
      // buang baris bahasa (mis. "python") di baris pertama
      const lines = parts[i].split('\n');
      if (lines.length > 1 && /^[a-zA-Z+#-]{1,15}$/.test(lines[0].trim())) lines.shift();
      const kode = lines.join('\n');
      html += `<div class="code-block"><button class="code-copy" type="button">Salin</button><pre>${kode}</pre></div>`;
    }
  }
  return html;
}
$('#messages').addEventListener('click', (e) => {
  const btn = e.target.closest('.code-copy');
  if (!btn) return;
  const kode = btn.nextElementSibling ? btn.nextElementSibling.textContent : '';
  salin(kode, 'Kode tersalin.');
});

/* ---------- lampiran foto ---------- */
$('#btn-attach').addEventListener('click', () => $('#file-input').click());
$('#file-input').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) { showToast('Foto terlalu besar (maks 8 MB).'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    state.pendingImage = String(reader.result);
    $('#attach-img').src = state.pendingImage;
    $('#attach-strip').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});
$('#btn-remove-attach').addEventListener('click', () => {
  state.pendingImage = null;
  $('#attach-strip').classList.add('hidden');
});

/* ---------- kirim ---------- */
async function kirim(teksManual) {
  const input = $('#input-msg');
  const teks = (teksManual ?? input.value).trim();
  if (!teks && !state.pendingImage) return;
  if (state.sending) return;

  const apiKey = getKey();
  if (!apiKey) { showToast('API key belum diisi. Buka Pengaturan dulu.'); bukaModal(); return; }

  let c = chatAktif();
  if (!c) c = obrolanBaru(teks.slice(0, 48));

  const msgUser = { role: 'user', content: teks || '(foto)', image: state.pendingImage || null };
  c.messages.push(msgUser);
  if (c.title === 'Chat baru' || c.messages.length === 1) c.title = teks.slice(0, 48) || 'Foto';
  c.updated = Date.now(); c.mode = state.mode;

  state.pendingImage = null;
  $('#attach-strip').classList.add('hidden');
  input.value = ''; input.style.height = 'auto';

  state.sending = true;
  $('#btn-send').disabled = true;
  saveChats(); renderPesan(); renderDaftar();
  tampilkanMengetik(true);

  try {
    const balasan = await tanyaCapy(c);
    c.messages.push({ role: 'assistant', content: balasan });
  } catch (err) {
    c.messages.push({ role: 'error', content: 'Gagal bertanya ke Capy: ' + (err.message || err) });
  }
  c.updated = Date.now();
  state.sending = false;
  $('#btn-send').disabled = false;
  tampilkanMengetik(false);
  saveChats(); renderPesan(); renderDaftar();
}
function tampilkanMengetik(show) {
  const box = $('#messages');
  let t = $('#typing-row');
  if (show) {
    if (!t) {
      t = document.createElement('div');
      t.id = 'typing-row';
      t.className = 'msg ai';
      t.innerHTML = '<div class="avatar ai">CAPY</div><div class="bubble"><span class="typing"><i></i><i></i></span></div>';
      box.appendChild(t);
    }
    box.scrollTop = box.scrollHeight;
  } else if (t) t.remove();
}

async function tanyaCapy(chat) {
  const model = getModel();
  const system = MODE_PROMPTS[chat.mode] || MODE_PROMPTS.umum;
  // ambil riwayat; foto hanya dari 2 pesan terakhir yang punya foto
  const riwayat = [];
  let fotoTerpakai = 0;
  for (let i = chat.messages.length - 1; i >= 0; i--) {
    const m = chat.messages[i];
    if (m.role === 'error') continue;
    if (m.image && fotoTerpakai < 2) { fotoTerpakai++; riwayat.unshift(m); }
    else if (!m.image) riwayat.unshift(m);
    if (riwayat.length >= 20) break;
  }
  const messages = [
    { role: 'system', content: system },
    ...riwayat.map(m => m.image
      ? { role: m.role, content: [{ type: 'text', text: m.content }, { type: 'image_url', image_url: { url: m.image } }] }
      : { role: m.role, content: m.content }),
  ];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + getKey(),
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://rafieakila-cloud.github.io/capybara-ai/',
      'X-Title': 'Capybara AI',
    },
    body: JSON.stringify({ model, messages }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || ('HTTP ' + res.status + ' dari OpenRouter'));
  return data?.choices?.[0]?.message?.content?.trim() || '(Capy diam saja)';
}

/* ---------- salin ---------- */
function salin(teks, pesan) {
  const done = () => showToast(pesan || 'Tersalin.');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks).then(done, done);
  else {
    const ta = document.createElement('textarea'); ta.value = teks; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta); done();
  }
}

/* ---------- modal settings ---------- */
function bukaModal() {
  $('#s-apikey').value = getKey();
  $('#s-model').value = getModel();
  $('#test-result').classList.add('hidden');
  $('#modal-backdrop').classList.remove('hidden');
}
function tutupModal() { $('#modal-backdrop').classList.add('hidden'); }
$('#btn-settings').addEventListener('click', bukaModal);
$('#btn-settings-2').addEventListener('click', bukaModal);
$('#modal-backdrop').addEventListener('click', (e) => { if (e.target.id === 'modal-backdrop') tutupModal(); });
$('#btn-save-settings').addEventListener('click', () => {
  localStorage.setItem('capybara_apikey', $('#s-apikey').value.trim());
  localStorage.setItem('capybara_model', $('#s-model').value.trim() || 'openrouter/auto');
  $('#model-label').textContent = getModel();
  showToast('Tersimpan. Capy siap dipakai.');
  tutupModal();
});
$('#btn-clear-key').addEventListener('click', () => {
  localStorage.removeItem('capybara_apikey');
  $('#s-apikey').value = '';
  showToast('API key dihapus dari perangkat ini.');
});
$('#btn-test').addEventListener('click', async () => {
  const el = $('#test-result');
  el.classList.remove('hidden', 'ok', 'gagal');
  el.textContent = 'Menghubungi OpenRouter...';
  localStorage.setItem('capybara_apikey', $('#s-apikey').value.trim());
  localStorage.setItem('capybara_model', $('#s-model').value.trim() || 'openrouter/auto');
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + getKey(), 'Content-Type': 'application/json', 'HTTP-Referer': 'https://rafieakila-cloud.github.io/capybara-ai/', 'X-Title': 'Capybara AI' },
      body: JSON.stringify({ model: getModel(), messages: [{ role: 'user', content: 'Jawab satu kata: siap' }] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || ('HTTP ' + res.status));
    el.textContent = 'Terhubung. Model: ' + getModel();
    el.classList.add('ok');
  } catch (err) {
    el.textContent = 'Gagal: ' + (err.message || err);
    el.classList.add('gagal');
  }
});

/* ---------- event umum ---------- */
$('#btn-send').addEventListener('click', () => kirim());
$('#input-msg').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); kirim(); }
});
$('#input-msg').addEventListener('input', (e) => {
  e.target.style.height = 'auto';
  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
});
$('#mode-chips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  state.mode = chip.dataset.mode;
  $$('.chip').forEach(c => c.classList.toggle('aktif', c === chip));
  const c = chatAktif(); if (c) { c.mode = state.mode; saveChats(); }
});
$('#btn-new-chat').addEventListener('click', () => {
  state.currentId = null;
  obrolanBaru('Chat baru');
  renderPesan();
  $('#sidebar').classList.remove('terbuka');
});
$('#chat-list').addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) {
    e.stopPropagation();
    state.chats = state.chats.filter(c => c.id !== del.dataset.del);
    if (state.currentId === del.dataset.del) state.currentId = state.chats[0]?.id || null;
    saveChats(); renderDaftar(); renderPesan();
    return;
  }
  const item = e.target.closest('.chat-item');
  if (item) {
    state.currentId = item.dataset.id;
    const c = chatAktif();
    if (c) {
      state.mode = c.mode || 'umum';
      $$('.chip').forEach(chip => chip.classList.toggle('aktif', chip.dataset.mode === state.mode));
    }
    renderDaftar(); renderPesan();
    $('#sidebar').classList.remove('terbuka');
  }
});
$('#btn-menu').addEventListener('click', () => $('#sidebar').classList.toggle('terbuka'));
$('.suggestion') && $$('.suggestion').forEach(b => b.addEventListener('click', () => kirim(b.dataset.q)));

/* ---------- toast ---------- */
function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3200);
}

/* ---------- init ---------- */
$('#topbar-orb').innerHTML = '<img src="icons/icon-192.png" width="30" height="30" alt="Capybara AI" style="border-radius:50%">';
$('#welcome-orb').innerHTML = '<img src="icons/icon-512.png" width="150" height="150" alt="Capybara AI" style="border-radius:50%">';
$('#model-label').textContent = getModel();
$('#welcome-note').textContent = getKey() ? '' : 'Belum ada API key — buka Pengaturan (ikon roda gigi) dan tempel OpenRouter key-mu. Sekali set, selamanya.';
loadChats();
renderDaftar();
renderPesan();
