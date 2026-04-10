// ============================================================
// ADMIN PANEL — One Piece: Card Voyage
// Secret access via NAKAMA key sequence
// IndexedDB for binaries, localStorage for config metadata
// ============================================================

(function () {
  'use strict';

  // ---- Constants ----
  const DB_NAME = 'CardVoyageAdmin';
  const DB_VERSION = 1;
  const STORES = ['sprites', 'cardArt', 'scenarioMedia'];
  const LS_KEY = 'gameConfig';
  const SECRET_CODE = 'NAKAMA';

  let db = null;
  let previousScreen = 'title-screen';

  const ANIM_TYPES = ['idle', 'run', 'attack', 'hit', 'defense', 'death'];

  // Current editing state
  const adminState = {
    currentCharId: null,
    // Per-animation frames: { idle: [{blob,url,name}], attack: [...], ... }
    animFrames: { idle: [], run: [], attack: [], hit: [], defense: [], death: [] },
    currentCardId: null,
    cardArtBlob: null,
    cardArtUrl: null,
    cardFrameBlob: null,
    cardFrameUrl: null,
    currentScenarioId: null,
    scenarioMediaBlob: null,
    scenarioMediaUrl: null,
    scenarioMediaType: null, // 'video' or 'image'
    previewAnimInterval: null,
    isolatedAnimInterval: null,
  };

  // ---- IndexedDB (local cache) ----
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const database = e.target.result;
        for (const store of STORES) {
          if (!database.objectStoreNames.contains(store)) {
            database.createObjectStore(store);
          }
        }
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function idbPut(store, key, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  function idbGet(store, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function idbDelete(store, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // ---- Cloud: Cloudinary upload ----
  async function uploadToCloudinary(blob, filename, folder) {
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('upload_preset', CLOUDINARY.uploadPreset);
    formData.append('folder', 'one-piece/' + folder);
    const res = await fetch(
      'https://api.cloudinary.com/v1_1/' + CLOUDINARY.cloudName + '/auto/upload',
      { method: 'POST', body: formData }
    );
    if (!res.ok) throw new Error('Cloudinary upload failed: ' + res.status);
    const data = await res.json();
    return data.secure_url;
  }

  // ---- Cloud: Firestore + localStorage hybrid ----
  let isOnline = false;

  function updateCloudStatus(status, text) {
    const el = document.getElementById('cloud-status');
    if (!el) return;
    el.className = status; // '', 'offline', 'syncing'
    el.textContent = text;
  }

  async function checkCloudConnection() {
    try {
      await cloudDb.collection('_ping').doc('test').set({ t: Date.now() });
      isOnline = true;
      updateCloudStatus('', '\u2601\uFE0F Online');
    } catch (e) {
      isOnline = false;
      updateCloudStatus('offline', '\u2601\uFE0F Offline');
    }
  }

  const DEFAULT_CONFIG = { characters: {}, cards: {}, scenarios: {} };

  async function loadConfig() {
    // Try Firestore first
    if (isOnline) {
      try {
        const doc = await cloudDb.collection('config').doc('gameConfig').get();
        if (doc.exists) {
          const data = doc.data();
          // Cache locally
          localStorage.setItem(LS_KEY, JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.warn('[Cloud] Firestore read failed, using local:', e.message);
      }
    }
    // Fallback to localStorage
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  }

  async function saveConfig(config) {
    // Always save locally
    localStorage.setItem(LS_KEY, JSON.stringify(config));
    // Try Firestore
    if (isOnline) {
      try {
        await cloudDb.collection('config').doc('gameConfig').set(config);
      } catch (e) {
        console.warn('[Cloud] Firestore write failed:', e.message);
      }
    }
  }

  // ---- Cloud-aware asset storage ----
  async function dbPut(store, key, blob, filename) {
    // Save locally in IndexedDB
    await idbPut(store, key, blob);
    // Upload to Cloudinary if online
    if (isOnline && blob instanceof Blob) {
      try {
        const url = await uploadToCloudinary(blob, filename || key, store);
        // Save URL reference in Firestore
        await cloudDb.collection('assets').doc(store + '_' + key.replace(/\//g, '_')).set({ url: url, key: key, store: store });
        return url;
      } catch (e) {
        console.warn('[Cloud] Upload failed for', key, e.message);
      }
    }
    return null;
  }

  async function dbGet(store, key) {
    // Try Firestore first for URL
    if (isOnline) {
      try {
        const doc = await cloudDb.collection('assets').doc(store + '_' + key.replace(/\//g, '_')).get();
        if (doc.exists && doc.data().url) return doc.data().url;
      } catch (e) {}
    }
    // Fallback to local IndexedDB
    return await idbGet(store, key);
  }

  async function dbDelete(store, key) {
    await idbDelete(store, key);
    if (isOnline) {
      try {
        await cloudDb.collection('assets').doc(store + '_' + key.replace(/\//g, '_')).delete();
      } catch (e) {}
    }
  }

  // ---- Upload frames to cloud with progress ----
  async function uploadFramesToCloud(charId, animFrames, onProgress) {
    let total = 0, done = 0;
    for (const nodeId of Object.keys(animFrames)) {
      total += (animFrames[nodeId] || []).length;
    }
    if (total === 0) return;

    for (const nodeId of Object.keys(animFrames)) {
      const frames = animFrames[nodeId] || [];
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        // Skip if already a cloud URL
        if (frame.url && frame.url.startsWith('https://res.cloudinary.com')) {
          done++;
          continue;
        }
        if (!frame.blob) { done++; continue; }
        try {
          const url = await uploadToCloudinary(frame.blob, frame.name || (nodeId + '_' + i + '.png'), 'sprites/' + charId);
          frame.url = url;
          frame.blob = null; // Free memory
        } catch (e) {
          console.warn('[Cloud] Frame upload failed:', nodeId, i, e.message);
        }
        done++;
        if (onProgress) onProgress(done, total);
      }
    }
  }

  // ---- Secret Code Detection ----
  let codeBuffer = '';
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    codeBuffer += e.key.toUpperCase();
    if (codeBuffer.length > SECRET_CODE.length) {
      codeBuffer = codeBuffer.slice(-SECRET_CODE.length);
    }
    if (codeBuffer === SECRET_CODE) {
      codeBuffer = '';
      openAdmin();
    }
  });

  // ---- Screen Management ----
  function openAdmin() {
    const current = document.querySelector('.screen.active');
    if (current && current.id !== 'admin-screen') {
      previousScreen = current.id;
    }
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('admin-screen').classList.add('active');
    refreshAllLists();
  }

  function closeAdmin() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(previousScreen).classList.add('active');
    clearPreviewAnimations();
  }

  // ---- Tab Switching ----
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // Close button
  document.getElementById('btn-admin-close').addEventListener('click', closeAdmin);

  // ---- Utility ----
  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  function genId(prefix, name) {
    return prefix + '_' + slugify(name) + '_' + Date.now().toString(36);
  }

  function blobToUrl(blob) {
    return URL.createObjectURL(blob);
  }

  // ---- Refresh all lists ----
  function refreshAllLists() {
    refreshCharList();
    refreshCardList();
    refreshScenarioList();
  }

  // ============================================================
  // CHARACTERS TAB
  // ============================================================

  function getBuiltinCharacters() {
    if (typeof CHARACTERS !== 'undefined') return CHARACTERS;
    // Access from game.js IIFE — we'll use a bridge
    return window._gameCharacters || {};
  }

  function getBuiltinCards() {
    return window._gameCards || {};
  }

  async function getAllCharacters() {
    const config = await loadConfig();
    const builtin = getBuiltinCharacters();
    const merged = {};
    for (const [id, char] of Object.entries(builtin)) {
      merged[id] = { ...char, _builtin: true };
    }
    for (const [id, char] of Object.entries(config.characters)) {
      merged[id] = { ...char, _builtin: false };
    }
    return merged;
  }

  async function refreshCharList() {
    const list = document.getElementById('char-list');
    list.innerHTML = '';
    const chars = await getAllCharacters();
    for (const [id, char] of Object.entries(chars)) {
      const item = document.createElement('div');
      item.className = 'admin-list-item' + (adminState.currentCharId === id ? ' active' : '');
      item.innerHTML = `
        <span class="item-emoji">${char.emoji || '👤'}</span>
        <span class="item-name">${char.name || id}</span>
        ${char._builtin ? '<span class="item-badge">built-in</span>' : ''}
      `;
      item.addEventListener('click', () => loadCharacter(id));
      list.appendChild(item);
    }
  }

  async function loadCharacter(id) {
    adminState.currentCharId = id;
    const chars = await getAllCharacters();
    const char = chars[id];
    if (!char) return;

    document.getElementById('char-name').value = char.name || '';
    document.getElementById('char-id').value = id;
    document.getElementById('char-emoji').value = char.emoji || '';
    document.getElementById('char-role').value = char.role || '';
    document.getElementById('char-hp').value = char.hp || 80;

    // Load per-animation frames from IndexedDB
    for (const animType of ANIM_TYPES) {
      adminState.animFrames[animType] = [];
      const config = await loadConfig();
      const charConfig = config.characters[id];
      if (charConfig && charConfig.animations && charConfig.animations[animType]) {
        const animData = charConfig.animations[animType];
        for (let i = 0; i < animData.frameCount; i++) {
          const key = `${id}_${animType}_${i}`;
          const blob = await dbGet('sprites', key);
          if (blob) {
            adminState.animFrames[animType].push({ blob, url: blobToUrl(blob), name: `${animType}_${i}` });
          }
        }
        // Set FPS
        const section = document.querySelector(`.anim-section[data-anim="${animType}"]`);
        if (section) {
          const fpsInput = section.querySelector('.anim-fps');
          fpsInput.value = animData.fps || 4;
          section.querySelector('.fps-val').textContent = animData.fps || 4;
        }
      }
    }

    renderAllAnimThumbs();
    await loadFlowFromConfig(id);
    refreshCharList();
  }

  // ---- Per-animation thumb rendering ----
  function renderAnimThumbs(animType) {
    const grid = document.querySelector(`.anim-thumbs-grid[data-anim="${animType}"]`);
    if (!grid) return;
    grid.innerHTML = '';
    const frames = adminState.animFrames[animType];
    frames.forEach((frame, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'anim-thumb';
      thumb.draggable = true;
      thumb.dataset.index = idx;
      thumb.innerHTML = `
        <img src="${frame.url}" alt="${frame.name}">
        <span class="thumb-order">${idx + 1}</span>
        <button class="thumb-remove">&times;</button>
      `;
      // Remove
      thumb.querySelector('.thumb-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        adminState.animFrames[animType].splice(idx, 1);
        renderAnimThumbs(animType);
      });
      // Drag to reorder
      thumb.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', idx);
        thumb.classList.add('dragging');
      });
      thumb.addEventListener('dragend', () => thumb.classList.remove('dragging'));
      thumb.addEventListener('dragover', (e) => e.preventDefault());
      thumb.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const toIdx = idx;
        if (fromIdx === toIdx) return;
        const [moved] = adminState.animFrames[animType].splice(fromIdx, 1);
        adminState.animFrames[animType].splice(toIdx, 0, moved);
        renderAnimThumbs(animType);
      });
      grid.appendChild(thumb);
    });
    // Update count in header
    const section = document.querySelector(`.anim-section[data-anim="${animType}"]`);
    if (section) {
      section.querySelector('.anim-section-count').textContent = `${frames.length} frames`;
    }
  }

  function renderAllAnimThumbs() {
    for (const animType of ANIM_TYPES) {
      renderAnimThumbs(animType);
    }
  }

  // ---- Dropzone setup (reusable) ----
  function setupDropzone(dropEl, inputEl, onFiles) {
    dropEl.addEventListener('dragover', (e) => { e.preventDefault(); dropEl.classList.add('dragover'); });
    dropEl.addEventListener('dragleave', () => dropEl.classList.remove('dragover'));
    dropEl.addEventListener('drop', (e) => {
      e.preventDefault();
      dropEl.classList.remove('dragover');
      onFiles(Array.from(e.dataTransfer.files));
    });
    const browseBtn = dropEl.querySelector('.admin-btn');
    if (browseBtn) browseBtn.addEventListener('click', (e) => { e.stopPropagation(); inputEl.click(); });
    dropEl.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      inputEl.click();
    });
    inputEl.addEventListener('change', () => {
      if (inputEl.files.length) onFiles(Array.from(inputEl.files));
      inputEl.value = '';
    });
  }

  // ---- Init animation section dropzones, collapsing, FPS, preview ----
  function initAnimSections() {
    document.querySelectorAll('.anim-section').forEach(section => {
      const animType = section.dataset.anim;
      const header = section.querySelector('.anim-section-header');
      const dropzone = section.querySelector('.anim-dropzone');
      const fileInput = section.querySelector('.anim-file-input');
      const fpsSlider = section.querySelector('.anim-fps');
      const previewBtn = section.querySelector('.anim-preview-btn');

      // Collapse toggle
      header.addEventListener('click', () => {
        section.classList.toggle('collapsed');
      });

      // Dropzone upload
      setupDropzone(dropzone, fileInput, (files) => {
        for (const file of files) {
          if (!file.type.startsWith('image/')) continue;
          adminState.animFrames[animType].push({
            blob: file,
            url: blobToUrl(file),
            name: file.name,
          });
        }
        renderAnimThumbs(animType);
      });

      // FPS slider
      fpsSlider.addEventListener('input', () => {
        section.querySelector('.fps-val').textContent = fpsSlider.value;
      });

      // Preview button
      previewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fps = parseInt(fpsSlider.value) || 8;
        console.log(`[Admin] Preview "${animType}" — ${adminState.animFrames[animType].length} frames @ ${fps} FPS`);
        playPreviewAnim('char-preview-canvas', animType);
      });
    });
  }

  // New character button
  document.getElementById('btn-new-char').addEventListener('click', () => {
    adminState.currentCharId = null;
    for (const t of ANIM_TYPES) adminState.animFrames[t] = [];
    document.getElementById('char-name').value = '';
    document.getElementById('char-id').value = '';
    document.getElementById('char-emoji').value = '';
    document.getElementById('char-role').value = '';
    document.getElementById('char-hp').value = 80;
    renderAllAnimThumbs();
    loadDefaultFlow();
    // Reset FPS sliders to defaults
    const defaults = { idle: 4, run: 8, attack: 12, hit: 8, death: 6, defense: 6 };
    for (const [type, fps] of Object.entries(defaults)) {
      const section = document.querySelector(`.anim-section[data-anim="${type}"]`);
      if (section) {
        section.querySelector('.anim-fps').value = fps;
        section.querySelector('.fps-val').textContent = fps;
      }
    }
    refreshCharList();
  });

  // Save character
  document.getElementById('btn-char-save').addEventListener('click', async () => {
    const name = document.getElementById('char-name').value.trim();
    if (!name) return alert('Nome é obrigatório');

    const saveBtn = document.getElementById('btn-char-save');
    const origText = saveBtn.textContent;
    saveBtn.textContent = 'Salvando...';
    saveBtn.disabled = true;

    try {
      const id = adminState.currentCharId || genId('char', name);
      const config = await loadConfig();

      // Upload frames to cloud with progress
      if (isOnline) {
        updateCloudStatus('syncing', '\u2601\uFE0F Enviando sprites...');
        await uploadFramesToCloud(id, adminState.animFrames, (done, total) => {
          saveBtn.textContent = 'Enviando sprites ' + done + '/' + total + '...';
        });
      }

      // Build animations metadata
      const animations = {};
      for (const animType of ANIM_TYPES) {
        const frames = adminState.animFrames[animType] || [];
        const section = document.querySelector('.anim-section[data-anim="' + animType + '"]');
        const fps = section ? parseInt(section.querySelector('.anim-fps').value) : 8;
        for (let i = 0; i < frames.length; i++) {
          if (frames[i].blob) {
            await dbPut('sprites', id + '_' + animType + '_' + i, frames[i].blob, frames[i].name);
          }
        }
        animations[animType] = { frameCount: frames.length, fps };
      }

      // Also upload flow node frames
      for (const node of flowState.nodes) {
        const nodeFrames = adminState.animFrames[node.id] || [];
        for (let i = 0; i < nodeFrames.length; i++) {
          if (nodeFrames[i].blob) {
            await dbPut('sprites', id + '_' + node.id + '_' + i, nodeFrames[i].blob, nodeFrames[i].name);
          }
        }
      }

      config.characters[id] = {
        id,
        name,
        emoji: document.getElementById('char-emoji').value || '\u{1F464}',
        battleEmoji: document.getElementById('char-emoji').value || '\u{1F44A}',
        role: document.getElementById('char-role').value || 'Custom',
        hp: parseInt(document.getElementById('char-hp').value) || 80,
        description: 'Custom character: ' + name,
        starterDeck: ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend'],
        animations,
        animFlow: JSON.parse(JSON.stringify(flowState)),
      };

      saveBtn.textContent = 'Salvando config...';
      await saveConfig(config);
      adminState.currentCharId = id;
      document.getElementById('char-id').value = id;
      refreshCharList();
      updateCloudStatus('', isOnline ? '\u2601\uFE0F Online' : '\u2601\uFE0F Offline');
      showToast(isOnline ? '\u2705 Salvo na nuvem!' : '\u2705 Salvo localmente!');
    } catch (e) {
      console.error('[Save] Error:', e);
      showToast('\u274C Erro ao salvar: ' + e.message);
    } finally {
      saveBtn.textContent = origText;
      saveBtn.disabled = false;
    }
  });

  // ---- Character Preview Animation ----
  function clearPreviewAnimations() {
    if (adminState.previewAnimInterval) {
      clearInterval(adminState.previewAnimInterval);
      adminState.previewAnimInterval = null;
    }
    if (adminState.isolatedAnimInterval) {
      clearInterval(adminState.isolatedAnimInterval);
      adminState.isolatedAnimInterval = null;
    }
  }

  async function playPreviewAnim(canvasId, animType) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const intervalKey = canvasId === 'char-preview-canvas' ? 'previewAnimInterval' : 'isolatedAnimInterval';
    if (adminState[intervalKey]) {
      clearInterval(adminState[intervalKey]);
      adminState[intervalKey] = null;
    }

    const frames = adminState.animFrames[animType] || [];
    const section = document.querySelector(`.anim-section[data-anim="${animType}"]`);
    const fps = section ? parseInt(section.querySelector('.anim-fps').value) || 8 : 8;

    console.log(`[Admin Preview] animType=${animType}, frames=${frames.length}, fps=${fps}`);

    if (frames.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#a0a0b0';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sem frames para', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillText(`"${animType}"`, canvas.width / 2, canvas.height / 2 + 10);
      return;
    }

    // Load images from blob URLs
    const images = [];
    for (const frame of frames) {
      let url = frame.url;
      // If URL revoked, reload from blob
      if (!url && frame.blob) {
        url = blobToUrl(frame.blob);
        frame.url = url;
      }
      const img = await new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => { console.warn('[Admin Preview] Failed to load:', url); resolve(null); };
        image.src = url;
      });
      if (img) images.push(img);
    }

    if (images.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#e74c3c';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Erro ao carregar sprites', canvas.width / 2, canvas.height / 2);
      return;
    }

    let frameIdx = 0;
    function drawFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const img = images[frameIdx % images.length];
      const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      frameIdx++;
      if (frameIdx >= images.length && animType !== 'idle') {
        clearInterval(adminState[intervalKey]);
        adminState[intervalKey] = null;
        setTimeout(() => playPreviewAnim(canvasId, 'idle'), 300);
        return;
      }
      if (frameIdx >= images.length) frameIdx = 0;
    }
    drawFrame();
    adminState[intervalKey] = setInterval(drawFrame, 1000 / fps);
  }

  // Isolated preview modal
  document.getElementById('btn-char-preview-isolated').addEventListener('click', () => {
    document.getElementById('admin-preview-modal').classList.add('active');
    setTimeout(() => playPreviewAnim('isolated-preview-canvas', 'idle'), 100);
  });

  document.getElementById('btn-close-preview-modal').addEventListener('click', () => {
    document.getElementById('admin-preview-modal').classList.remove('active');
    clearPreviewAnimations();
  });

  document.querySelectorAll('[data-ipose]').forEach(btn => {
    btn.addEventListener('click', () => {
      playPreviewAnim('isolated-preview-canvas', btn.dataset.ipose);
    });
  });

  // Test in battle
  document.getElementById('btn-char-test-battle').addEventListener('click', () => {
    const name = document.getElementById('char-name').value.trim();
    if (!name) return alert('Salve o personagem primeiro');

    const id = adminState.currentCharId;
    if (!id) return alert('Salve o personagem primeiro');

    if (window._adminStartTestBattle) {
      window._adminStartTestBattle(id);
    } else {
      alert('Bridge com game.js não disponível');
    }
  });

  // ============================================================
  // CARDS TAB
  // ============================================================

  async function getAllCards() {
    const config = await loadConfig();
    const builtin = getBuiltinCards();
    const merged = {};
    for (const [id, card] of Object.entries(builtin)) {
      merged[id] = { ...card, _builtin: true };
    }
    for (const [id, card] of Object.entries(config.cards)) {
      merged[id] = { ...card, _builtin: false };
    }
    return merged;
  }

  async function refreshCardList() {
    const list = document.getElementById('card-list');
    list.innerHTML = '';
    const cards = await getAllCards();
    for (const [id, card] of Object.entries(cards)) {
      const item = document.createElement('div');
      item.className = 'admin-list-item' + (adminState.currentCardId === id ? ' active' : '');
      item.innerHTML = `
        <span class="item-emoji">${card.icon || '🃏'}</span>
        <span class="item-name">${card.name || id}</span>
        ${card._builtin ? '<span class="item-badge">built-in</span>' : ''}
      `;
      item.addEventListener('click', () => loadCard(id));
      list.appendChild(item);
    }
  }

  async function loadCard(id) {
    adminState.currentCardId = id;
    const cards = await getAllCards();
    const card = cards[id];
    if (!card) return;

    document.getElementById('admin-card-name').value = card.name || '';
    document.getElementById('admin-card-id').value = id;
    document.getElementById('admin-card-type').value = card.type || 'attack';
    document.getElementById('admin-card-cost').value = card.cost != null ? card.cost : 1;
    document.getElementById('admin-card-effect').value = card.desc || '';
    document.getElementById('admin-card-icon').value = card.icon || '';

    // Load art from IndexedDB
    adminState.cardArtBlob = null;
    adminState.cardArtUrl = null;
    adminState.cardFrameBlob = null;
    adminState.cardFrameUrl = null;

    const config = await loadConfig();
    const cardConfig = config.cards[id];
    if (cardConfig) {
      if (cardConfig.artKey) {
        const blob = await dbGet('cardArt', cardConfig.artKey);
        if (blob) { adminState.cardArtBlob = blob; adminState.cardArtUrl = blobToUrl(blob); }
      }
      if (cardConfig.frameKey) {
        const blob = await dbGet('cardArt', cardConfig.frameKey);
        if (blob) { adminState.cardFrameBlob = blob; adminState.cardFrameUrl = blobToUrl(blob); }
      }
    }

    renderCardArtThumbs();
    updateCardPreview();
    refreshCardList();
  }

  function renderCardArtThumbs() {
    const artThumb = document.getElementById('card-art-thumb');
    const frameThumb = document.getElementById('card-frame-thumb');
    artThumb.innerHTML = adminState.cardArtUrl ? `<img src="${adminState.cardArtUrl}">` : '';
    frameThumb.innerHTML = adminState.cardFrameUrl ? `<img src="${adminState.cardFrameUrl}">` : '';
  }

  function updateCardPreview() {
    const preview = document.getElementById('card-live-preview');
    const name = document.getElementById('admin-card-name').value || 'Card Name';
    const type = document.getElementById('admin-card-type').value;
    const cost = document.getElementById('admin-card-cost').value;
    const desc = document.getElementById('admin-card-effect').value || 'Effect description';
    const icon = document.getElementById('admin-card-icon').value || '⚔️';

    preview.className = `game-card type-${type}`;
    preview.innerHTML = `
      <div class="card-cost">${cost}</div>
      <div class="card-name">${name}</div>
      <div class="card-icon">${icon}</div>
      ${adminState.cardArtUrl ? `<div class="card-art-preview" style="width:80%;margin:4px auto;"><img src="${adminState.cardArtUrl}" style="width:100%;border-radius:4px;"></div>` : ''}
      <div class="card-desc">${desc}</div>
      <div class="card-type-label">${type}</div>
    `;
  }

  // Live preview updates
  ['admin-card-name', 'admin-card-type', 'admin-card-cost', 'admin-card-effect', 'admin-card-icon'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateCardPreview);
  });

  // New card
  document.getElementById('btn-new-card').addEventListener('click', () => {
    adminState.currentCardId = null;
    adminState.cardArtBlob = null;
    adminState.cardArtUrl = null;
    adminState.cardFrameBlob = null;
    adminState.cardFrameUrl = null;
    document.getElementById('admin-card-name').value = '';
    document.getElementById('admin-card-id').value = '';
    document.getElementById('admin-card-type').value = 'attack';
    document.getElementById('admin-card-cost').value = 1;
    document.getElementById('admin-card-effect').value = '';
    document.getElementById('admin-card-icon').value = '';
    renderCardArtThumbs();
    updateCardPreview();
    refreshCardList();
  });

  // Save card
  document.getElementById('btn-card-save').addEventListener('click', async () => {
    const name = document.getElementById('admin-card-name').value.trim();
    if (!name) return alert('Nome é obrigatório');

    const id = adminState.currentCardId || genId('card', name);
    const config = await loadConfig();

    let artKey = null;
    let frameKey = null;

    // Save art to IndexedDB
    if (adminState.cardArtBlob) {
      artKey = id + '/art';
      await dbPut('cardArt', artKey, adminState.cardArtBlob);
    } else if (config.cards[id] && config.cards[id].artKey) {
      artKey = config.cards[id].artKey;
    }

    if (adminState.cardFrameBlob) {
      frameKey = id + '/frame';
      await dbPut('cardArt', frameKey, adminState.cardFrameBlob);
    } else if (config.cards[id] && config.cards[id].frameKey) {
      frameKey = config.cards[id].frameKey;
    }

    const type = document.getElementById('admin-card-type').value;
    const cost = parseInt(document.getElementById('admin-card-cost').value) || 0;
    const desc = document.getElementById('admin-card-effect').value;
    const icon = document.getElementById('admin-card-icon').value || '⚔️';

    config.cards[id] = {
      id,
      name,
      type,
      cost,
      icon,
      desc,
      effect: parseEffectText(desc, cost),
      artKey,
      frameKey,
    };

    await saveConfig(config);
    adminState.currentCardId = id;
    document.getElementById('admin-card-id').value = id;
    refreshCardList();
    showToast('Carta salva!');
  });

  function parseEffectText(desc, cost) {
    // Simple parser: extract damage/block/heal numbers from description
    const effect = {};
    const dmgMatch = desc.match(/[Dd]eal (\d+) damage/);
    if (dmgMatch) effect.damage = parseInt(dmgMatch[1]);
    const blkMatch = desc.match(/[Gg]ain (\d+) [Bb]lock/);
    if (blkMatch) effect.block = parseInt(blkMatch[1]);
    const healMatch = desc.match(/[Hh]eal (\d+)/);
    if (healMatch) effect.heal = parseInt(healMatch[1]);
    const drawMatch = desc.match(/[Dd]raw (\d+)/);
    if (drawMatch) effect.draw = parseInt(drawMatch[1]);
    const hitsMatch = desc.match(/(\d+) times/);
    if (hitsMatch) effect.hits = parseInt(hitsMatch[1]);
    return effect;
  }

  // ============================================================
  // SCENARIOS TAB
  // ============================================================

  async function getAllScenarios() {
    const config = await loadConfig();
    const merged = {};
    // Built-in scenario
    merged['battle-bg-default'] = {
      id: 'battle-bg-default',
      name: 'Battle Background (Default)',
      type: 'batalha',
      floor: '1',
      file: 'assets/backgrounds/battle-bg.mp4',
      mediaType: 'video',
      opacity: 85,
      overlay: 25,
      _builtin: true,
    };
    for (const [id, scenario] of Object.entries(config.scenarios)) {
      merged[id] = { ...scenario, _builtin: false };
    }
    return merged;
  }

  async function refreshScenarioList() {
    const list = document.getElementById('scenario-list');
    list.innerHTML = '';
    const scenarios = await getAllScenarios();
    for (const [id, s] of Object.entries(scenarios)) {
      const item = document.createElement('div');
      item.className = 'admin-list-item' + (adminState.currentScenarioId === id ? ' active' : '');
      item.innerHTML = `
        <span class="item-emoji">🌄</span>
        <span class="item-name">${s.name || id}</span>
        ${s._builtin ? '<span class="item-badge">built-in</span>' : ''}
      `;
      item.addEventListener('click', () => loadScenario(id));
      list.appendChild(item);
    }
  }

  async function loadScenario(id) {
    adminState.currentScenarioId = id;
    const scenarios = await getAllScenarios();
    const s = scenarios[id];
    if (!s) return;

    document.getElementById('scenario-name').value = s.name || '';
    document.getElementById('scenario-id').value = id;
    document.getElementById('scenario-type').value = s.type || 'batalha';
    document.getElementById('scenario-floor').value = s.floor || '1';
    document.getElementById('scenario-opacity').value = s.opacity != null ? s.opacity : 85;
    document.getElementById('scenario-opacity-val').textContent = s.opacity != null ? s.opacity : 85;
    document.getElementById('scenario-overlay').value = s.overlay != null ? s.overlay : 25;
    document.getElementById('scenario-overlay-val').textContent = s.overlay != null ? s.overlay : 25;

    // Load media
    adminState.scenarioMediaBlob = null;
    adminState.scenarioMediaUrl = null;
    adminState.scenarioMediaType = s.mediaType || null;

    if (s._builtin && s.file) {
      // Built-in: use file path directly
      adminState.scenarioMediaUrl = s.file;
      adminState.scenarioMediaType = 'video';
    } else {
      const config = await loadConfig();
      const sConfig = config.scenarios[id];
      if (sConfig && sConfig.mediaKey) {
        const blob = await dbGet('scenarioMedia', sConfig.mediaKey);
        if (blob) {
          adminState.scenarioMediaBlob = blob;
          adminState.scenarioMediaUrl = blobToUrl(blob);
          adminState.scenarioMediaType = sConfig.mediaType || 'video';
        }
      }
    }

    renderScenarioPreview();
    refreshScenarioList();
  }

  function renderScenarioPreview() {
    const container = document.getElementById('scenario-preview');
    const opacity = document.getElementById('scenario-opacity').value / 100;
    const overlay = document.getElementById('scenario-overlay').value / 100;

    if (!adminState.scenarioMediaUrl) {
      container.innerHTML = '<div class="scenario-preview-empty">Nenhuma mídia carregada</div>';
      return;
    }

    if (adminState.scenarioMediaType === 'video') {
      container.innerHTML = `
        <video autoplay loop muted playsinline style="opacity:${opacity}">
          <source src="${adminState.scenarioMediaUrl}" type="video/mp4">
        </video>
        <div class="scenario-overlay" style="background:rgba(0,0,0,${overlay})"></div>
      `;
    } else {
      container.innerHTML = `
        <img src="${adminState.scenarioMediaUrl}" style="opacity:${opacity}">
        <div class="scenario-overlay" style="background:rgba(0,0,0,${overlay})"></div>
      `;
    }
  }

  // Sliders live update
  document.getElementById('scenario-opacity').addEventListener('input', (e) => {
    document.getElementById('scenario-opacity-val').textContent = e.target.value;
    renderScenarioPreview();
  });

  document.getElementById('scenario-overlay').addEventListener('input', (e) => {
    document.getElementById('scenario-overlay-val').textContent = e.target.value;
    renderScenarioPreview();
  });

  // New scenario
  document.getElementById('btn-new-scenario').addEventListener('click', () => {
    adminState.currentScenarioId = null;
    adminState.scenarioMediaBlob = null;
    adminState.scenarioMediaUrl = null;
    adminState.scenarioMediaType = null;
    document.getElementById('scenario-name').value = '';
    document.getElementById('scenario-id').value = '';
    document.getElementById('scenario-type').value = 'batalha';
    document.getElementById('scenario-floor').value = '1';
    document.getElementById('scenario-opacity').value = 85;
    document.getElementById('scenario-opacity-val').textContent = '85';
    document.getElementById('scenario-overlay').value = 25;
    document.getElementById('scenario-overlay-val').textContent = '25';
    renderScenarioPreview();
    refreshScenarioList();
  });

  // Save scenario
  document.getElementById('btn-scenario-save').addEventListener('click', async () => {
    const name = document.getElementById('scenario-name').value.trim();
    if (!name) return alert('Nome é obrigatório');

    const id = adminState.currentScenarioId || genId('scenario', name);
    const config = await loadConfig();

    let mediaKey = null;
    if (adminState.scenarioMediaBlob) {
      mediaKey = id + '/media';
      await dbPut('scenarioMedia', mediaKey, adminState.scenarioMediaBlob);
    } else if (config.scenarios[id] && config.scenarios[id].mediaKey) {
      mediaKey = config.scenarios[id].mediaKey;
    }

    config.scenarios[id] = {
      id,
      name,
      type: document.getElementById('scenario-type').value,
      floor: document.getElementById('scenario-floor').value,
      opacity: parseInt(document.getElementById('scenario-opacity').value),
      overlay: parseInt(document.getElementById('scenario-overlay').value),
      mediaKey,
      mediaType: adminState.scenarioMediaType,
    };

    await saveConfig(config);
    adminState.currentScenarioId = id;
    document.getElementById('scenario-id').value = id;
    refreshScenarioList();
    showToast('Cenário salvo!');
  });

  // Test scenario in game
  document.getElementById('btn-scenario-test').addEventListener('click', () => {
    if (!adminState.scenarioMediaUrl) return alert('Carregue uma mídia primeiro');
    if (window._adminTestScenario) {
      window._adminTestScenario({
        url: adminState.scenarioMediaUrl,
        type: adminState.scenarioMediaType,
        opacity: document.getElementById('scenario-opacity').value / 100,
        overlay: document.getElementById('scenario-overlay').value / 100,
      });
    } else {
      alert('Bridge com game.js não disponível');
    }
  });

  // ============================================================
  // DROPZONE SETUP (after DOM ready)
  // ============================================================

  function initDropzones() {
    // Animation section dropzones are initialized in initAnimSections()

    // Card art
    setupDropzone(
      document.getElementById('card-art-drop'),
      document.getElementById('card-art-input'),
      async (files) => {
        if (files[0]) {
          adminState.cardArtBlob = files[0];
          adminState.cardArtUrl = blobToUrl(files[0]);
          renderCardArtThumbs();
          updateCardPreview();
        }
      }
    );

    // Card frame
    setupDropzone(
      document.getElementById('card-frame-drop'),
      document.getElementById('card-frame-input'),
      async (files) => {
        if (files[0]) {
          adminState.cardFrameBlob = files[0];
          adminState.cardFrameUrl = blobToUrl(files[0]);
          renderCardArtThumbs();
        }
      }
    );

    // Scenario media
    setupDropzone(
      document.getElementById('scenario-media-drop'),
      document.getElementById('scenario-media-input'),
      async (files) => {
        if (files[0]) {
          const file = files[0];
          adminState.scenarioMediaBlob = file;
          adminState.scenarioMediaUrl = blobToUrl(file);
          adminState.scenarioMediaType = file.type.startsWith('video/') ? 'video' : 'image';
          renderScenarioPreview();
        }
      }
    );
  }

  // ============================================================
  // TOAST NOTIFICATION
  // ============================================================

  function showToast(msg) {
    let toast = document.getElementById('admin-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'admin-toast';
      toast.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: rgba(200, 169, 110, 0.95); color: #0a0a12;
        padding: 10px 24px; border-radius: 8px; font-family: 'Cinzel', serif;
        font-weight: 700; font-size: 0.85rem; z-index: 9999;
        transition: opacity 0.3s; pointer-events: none;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2000);
  }





  // ============================================================
  // FLOW EDITOR — Node-based animation graph
  // ============================================================

  var FLOW_ICONS = { idle:'\u{1F634}', run:'\u{1F3C3}', attack:'\u26A1', hit:'\u{1F4A5}', defense:'\u{1F6E1}\uFE0F', death:'\u{1F480}' };
  var FLOW_LABELS = { idle:'Parado', run:'Correndo', attack:'Ataque', hit:'Levando Dano', defense:'Defendendo', death:'Morrendo' };
  var FLOW_MENU_TYPES = [
    { type:'attack', icon:'\u26A1', label:'Novo Ataque' },
    { type:'run', icon:'\u{1F3C3}', label:'Correndo' },
    { type:'hit', icon:'\u{1F4A5}', label:'Levando Dano' },
    { type:'defense', icon:'\u{1F6E1}\uFE0F', label:'Defendendo' },
    { type:'death', icon:'\u{1F480}', label:'Morrendo' },
  ];

  var DEFAULT_FLOW = {
    nodes: [
      { id:'idle', type:'idle', x:40, y:120, label:'Parado', fps:4 },
      { id:'run', type:'run', x:220, y:120, label:'Correndo', fps:8 },
      { id:'attack_1', type:'attack', x:400, y:120, label:'Ataque 1', fps:12 },
      { id:'hit', type:'hit', x:220, y:280, label:'Levando Dano', fps:8 },
      { id:'defense', type:'defense', x:40, y:280, label:'Defendendo', fps:6 },
      { id:'death', type:'death', x:400, y:280, label:'Morrendo', fps:6 },
    ],
    edges: [
      { from:'idle', to:'run' },
      { from:'run', to:'attack_1' },
      { from:'attack_1', to:'idle' },
    ],
  };

  var flowState = { nodes:[], edges:[] };
  var flowDrag = null, flowWiring = null;
  var flowAttackCounter = 1, flowSelectedNode = null;
  var panX = 0, panY = 0, zoom = 1;
  var isPanning = false, panStart = { x:0, y:0 };
  var flowPreviewRunning = false, flowPreviewPaused = false, flowPreviewInterval = null;

  function applyTransform() {
    var w = document.getElementById('flow-world');
    if (w) w.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + zoom + ')';
  }

  function screenToWorld(cx, cy) {
    var cr = document.getElementById('flow-canvas').getBoundingClientRect();
    return { x: (cx - cr.left - panX) / zoom, y: (cy - cr.top - panY) / zoom };
  }

  function worldToScreen(wx, wy) {
    return { x: wx * zoom + panX, y: wy * zoom + panY };
  }

  function getNodeDuration(nodeId) {
    var frames = adminState.animFrames[nodeId] || [];
    var node = flowState.nodes.find(function(n) { return n.id === nodeId; });
    var fps = (node && node.fps) || 8;
    var count = frames.length;
    var dur = count > 0 ? (count / fps).toFixed(2) : '0.0';
    return { count: count, fps: fps, dur: dur };
  }

  function updateDurationDisplay() {
    if (!flowSelectedNode) return;
    var d = getNodeDuration(flowSelectedNode);
    var el = document.getElementById('flow-duration');
    if (el) el.innerHTML = '\u23F1 <b>' + d.count + '</b> frames \u00D7 <b>' + d.fps + 'fps</b> = <b>' + d.dur + 's</b>';
  }

  function cleanFlowEdges() {
    var ids = new Set(flowState.nodes.map(function(n) { return n.id; }));
    flowState.edges = flowState.edges.filter(function(ed) { return ids.has(ed.from) && ids.has(ed.to); });
  }

  function initFlowEditor() {
    var tabFrames = document.getElementById('tab-frames');
    var tabFluxo = document.getElementById('tab-fluxo');
    var panelFrames = document.getElementById('anim-panel-frames');
    var panelFluxo = document.getElementById('anim-panel-fluxo');
    var previewStage = document.getElementById('char-preview-stage');
    var flowCol = document.getElementById('flow-editor-col');

    tabFrames.addEventListener('click', function() {
      tabFrames.classList.add('active'); tabFluxo.classList.remove('active');
      panelFrames.classList.remove('hidden'); panelFluxo.classList.add('hidden');
      previewStage.classList.remove('hidden'); flowCol.classList.add('hidden');
    });
    tabFluxo.addEventListener('click', function() {
      tabFluxo.classList.add('active'); tabFrames.classList.remove('active');
      panelFluxo.classList.remove('hidden'); panelFrames.classList.add('hidden');
      previewStage.classList.add('hidden'); flowCol.classList.remove('hidden');
      renderFlow();
    });

    document.getElementById('btn-add-attack-node').addEventListener('click', function() {
      flowAttackCounter++;
      var id = 'attack_' + flowAttackCounter;
      flowState.nodes.push({ id:id, type:'attack', x:200+Math.random()*120, y:80+Math.random()*120, label:'Ataque '+flowAttackCounter, fps:12 });
      if (!adminState.animFrames[id]) adminState.animFrames[id] = [];
      renderFlow();
    });

    document.getElementById('btn-reset-flow').addEventListener('click', function() {
      loadDefaultFlow(); flowSelectedNode = null; renderFlow(); renderNodePanel();
    });

    document.getElementById('btn-reset-view').addEventListener('click', function() {
      panX = 0; panY = 0; zoom = 1; applyTransform(); drawEdges();
    });

    document.getElementById('btn-flow-panel-close').addEventListener('click', function() {
      flowSelectedNode = null; renderNodePanel(); renderFlow();
    });

    // Node name input sync
    document.getElementById('flow-node-name').addEventListener('input', function(e) {
      if (!flowSelectedNode) return;
      var node = flowState.nodes.find(function(n) { return n.id === flowSelectedNode; });
      if (node) { node.label = e.target.value; renderFlow(); }
    });

    // Dropzone
    setupDropzone(
      document.getElementById('flow-frame-drop'),
      document.getElementById('flow-frame-input'),
      function(files) {
        if (!flowSelectedNode) return;
        if (!adminState.animFrames[flowSelectedNode]) adminState.animFrames[flowSelectedNode] = [];
        for (var i = 0; i < files.length; i++) {
          if (!files[i].type.startsWith('image/')) continue;
          adminState.animFrames[flowSelectedNode].push({ blob:files[i], url:blobToUrl(files[i]), name:files[i].name });
        }
        renderNodePanelFrames(); updateDurationDisplay(); renderFlow();
      }
    );

    // FPS slider
    document.getElementById('flow-fps').addEventListener('input', function(e) {
      document.getElementById('flow-fps-val').textContent = e.target.value;
      if (flowSelectedNode) {
        var node = flowState.nodes.find(function(n) { return n.id === flowSelectedNode; });
        if (node) node.fps = parseInt(e.target.value);
      }
      updateDurationDisplay(); renderFlow();
    });

    document.getElementById('btn-flow-preview-node').addEventListener('click', function() {
      if (flowSelectedNode) playFlowMiniPreview(flowSelectedNode);
    });

    // Full flow preview
    document.getElementById('btn-flow-preview-full').addEventListener('click', function() {
      openFlowPreviewModal();
    });
    document.getElementById('btn-flow-prev-close').addEventListener('click', closeFlowPreviewModal);
    document.getElementById('btn-flow-prev-restart').addEventListener('click', function() {
      if (flowPreviewRunning) { closeFlowPreviewModal(); openFlowPreviewModal(); }
    });
    document.getElementById('btn-flow-prev-pause').addEventListener('click', function() {
      flowPreviewPaused = !flowPreviewPaused;
      this.textContent = flowPreviewPaused ? '\u25B6 Continuar' : '\u23F8 Pausar';
    });

    // ---- Canvas: pan, zoom, drag, wiring ----
    var canvas = document.getElementById('flow-canvas');

    canvas.addEventListener('mousedown', function(e) {
      if (!e.target.closest('.flow-node') && !e.target.closest('.flow-context-menu')) {
        isPanning = true;
        panStart = { x: e.clientX - panX, y: e.clientY - panY };
        canvas.classList.add('panning');
      }
    });

    canvas.addEventListener('mousemove', function(e) {
      if (isPanning) {
        panX = e.clientX - panStart.x; panY = e.clientY - panStart.y;
        applyTransform(); drawEdges(); return;
      }
      if (flowDrag) {
        var wc = screenToWorld(e.clientX, e.clientY);
        var nd = flowState.nodes.find(function(n) { return n.id === flowDrag.nodeId; });
        if (nd) {
          nd.x = Math.max(0, wc.x - flowDrag.ox); nd.y = Math.max(0, wc.y - flowDrag.oy);
          var el = document.querySelector('[data-nid="' + nd.id + '"]');
          if (el) { el.style.left = nd.x + 'px'; el.style.top = nd.y + 'px'; }
          drawEdges();
        }
        return;
      }
      if (flowWiring) {
        var wc2 = screenToWorld(e.clientX, e.clientY);
        var sx = flowWiring.sx, sy = flowWiring.sy, mx = wc2.x, my = wc2.y;
        var dx = (mx - sx) * 0.5;
        flowWiring.line.setAttribute('d', 'M'+sx+','+sy+' C'+(sx+dx)+','+sy+' '+(mx-dx)+','+my+' '+mx+','+my);
      }
    });

    canvas.addEventListener('mouseup', function(e) {
      if (isPanning) { isPanning = false; canvas.classList.remove('panning'); return; }
      if (flowDrag) {
        var el = document.querySelector('[data-nid="' + flowDrag.nodeId + '"]');
        if (el) el.classList.remove('dragging');
        flowDrag = null;
      }
      if (flowWiring) {
        var portIn = e.target.closest('.port-in');
        if (portIn) {
          var toId = portIn.dataset.node, fromId = flowWiring.fromId;
          if (fromId !== toId && !flowState.edges.some(function(ed) { return ed.from === fromId && ed.to === toId; })) {
            flowState.edges.push({ from:fromId, to:toId });
          }
          flowWiring.line.remove(); flowWiring = null; drawEdges();
        } else {
          // Drop on empty — context menu
          var cr = canvas.getBoundingClientRect();
          var worldX = (e.clientX - cr.left - panX) / zoom;
          var worldY = (e.clientY - cr.top - panY) / zoom;
          var fId = flowWiring.fromId;
          flowWiring.line.remove(); flowWiring = null;
          showFlowContextMenu(worldX, worldY, fId);
        }
      }
    });

    canvas.addEventListener('mouseleave', function() {
      if (isPanning) { isPanning = false; canvas.classList.remove('panning'); }
    });

    canvas.addEventListener('wheel', function(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -0.1 : 0.1;
      var newZoom = Math.max(0.3, Math.min(2.0, zoom + delta));
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      panX = mx - (mx - panX) * (newZoom / zoom);
      panY = my - (my - panY) * (newZoom / zoom);
      zoom = newZoom; applyTransform(); drawEdges();
    }, { passive: false });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.flow-context-menu')) {
        document.querySelectorAll('.flow-context-menu').forEach(function(m) { m.remove(); });
      }
    });

    loadDefaultFlow();
  }

  function showFlowContextMenu(worldX, worldY, fromId) {
    var canvas = document.getElementById('flow-canvas');
    canvas.querySelectorAll('.flow-context-menu').forEach(function(m) { m.remove(); });
    var menu = document.createElement('div');
    menu.className = 'flow-context-menu';
    // Position in screen coords
    var sc = worldToScreen(worldX, worldY);
    menu.style.left = sc.x + 'px';
    menu.style.top = sc.y + 'px';

    var existingTypes = {};
    flowState.nodes.forEach(function(n) { existingTypes[n.type] = true; });

    FLOW_MENU_TYPES.forEach(function(item) {
      if (item.type !== 'attack' && existingTypes[item.type]) return;
      var btn = document.createElement('button');
      btn.className = 'flow-context-item';
      btn.textContent = item.icon + ' ' + item.label;
      btn.addEventListener('click', function(ev) {
        ev.stopPropagation(); menu.remove();
        var newId;
        if (item.type === 'attack') { flowAttackCounter++; newId = 'attack_' + flowAttackCounter; }
        else { newId = item.type; }
        var label = item.type === 'attack' ? 'Ataque ' + flowAttackCounter : item.label;
        flowState.nodes.push({ id:newId, type:item.type, x:worldX, y:worldY, label:label, fps:item.type==='attack'?12:8 });
        if (!adminState.animFrames[newId]) adminState.animFrames[newId] = [];
        flowState.edges.push({ from:fromId, to:newId });
        renderFlow();
      });
      menu.appendChild(btn);
    });
    canvas.appendChild(menu);
  }

  function loadDefaultFlow() {
    flowState = JSON.parse(JSON.stringify(DEFAULT_FLOW));
    flowAttackCounter = 1;
    cleanFlowEdges();
  }

  async function loadFlowFromConfig(charId) {
    var config = await loadConfig();
    var cc = config.characters[charId];
    if (cc && cc.animFlow && cc.animFlow.nodes && cc.animFlow.nodes.length > 0) {
      flowState = JSON.parse(JSON.stringify(cc.animFlow));
      flowAttackCounter = 1;
      flowState.nodes.forEach(function(n) {
        if (n.type === 'attack') {
          var num = parseInt(n.id.replace('attack_', '')) || 1;
          if (num > flowAttackCounter) flowAttackCounter = num;
        }
        if (!adminState.animFrames[n.id]) adminState.animFrames[n.id] = [];
      });
    } else { loadDefaultFlow(); }
    cleanFlowEdges();
    flowSelectedNode = null; renderNodePanel();
  }

  function selectFlowNode(nodeId) {
    flowSelectedNode = nodeId; renderNodePanel();
    document.querySelectorAll('.flow-node').forEach(function(el) { el.classList.remove('selected'); });
    var el = document.querySelector('[data-nid="' + nodeId + '"]');
    if (el) el.classList.add('selected');
  }

  function renderNodePanel() {
    var empty = document.querySelector('.flow-node-panel-empty');
    var content = document.querySelector('.flow-node-panel-content');
    if (!flowSelectedNode) { empty.classList.remove('hidden'); content.classList.add('hidden'); return; }
    empty.classList.add('hidden'); content.classList.remove('hidden');
    var node = flowState.nodes.find(function(n) { return n.id === flowSelectedNode; });
    var icon = node ? (FLOW_ICONS[node.type] || '\u{1F3AC}') : '\u{1F3AC}';
    var label = node ? (node.label || FLOW_LABELS[node.type]) : flowSelectedNode;
    document.getElementById('flow-panel-title').textContent = icon + ' ' + label;
    document.getElementById('flow-node-name').value = label;
    var fps = (node && node.fps) || 8;
    document.getElementById('flow-fps').value = fps;
    document.getElementById('flow-fps-val').textContent = fps;
    renderNodePanelFrames(); updateDurationDisplay();
  }

  function renderNodePanelFrames() {
    var list = document.getElementById('flow-frame-list');
    list.innerHTML = '';
    if (!flowSelectedNode) return;
    var frames = adminState.animFrames[flowSelectedNode] || [];
    frames.forEach(function(frame, idx) {
      var item = document.createElement('div');
      item.className = 'flow-frame-item'; item.draggable = true; item.dataset.index = idx;
      item.innerHTML = '<span class="frame-handle">\u2801\u2802\u2803</span><span class="frame-order">' + (idx+1) + '</span><img src="' + frame.url + '"><button class="frame-delete">\u00D7</button>';
      item.querySelector('.frame-delete').addEventListener('click', function() {
        adminState.animFrames[flowSelectedNode].splice(idx, 1);
        renderNodePanelFrames(); updateDurationDisplay(); renderFlow();
      });
      item.addEventListener('dragstart', function(e) { e.dataTransfer.setData('text/plain', String(idx)); item.classList.add('dragging'); });
      item.addEventListener('dragend', function() { item.classList.remove('dragging'); });
      item.addEventListener('dragover', function(e) { e.preventDefault(); });
      item.addEventListener('drop', function(e) {
        e.preventDefault(); var from = parseInt(e.dataTransfer.getData('text/plain'));
        if (from === idx) return;
        var arr = adminState.animFrames[flowSelectedNode]; var moved = arr.splice(from, 1)[0]; arr.splice(idx, 0, moved);
        renderNodePanelFrames(); renderFlow();
      });
      list.appendChild(item);
    });
  }

  function renderFlow() {
    var world = document.getElementById('flow-world');
    var svg = document.getElementById('flow-svg');
    if (!world || !svg) return;
    world.querySelectorAll('.flow-node, .flow-context-menu').forEach(function(el) { el.remove(); });
    svg.innerHTML = '';

    flowState.nodes.forEach(function(node) {
      var el = document.createElement('div');
      el.className = 'flow-node' + (flowSelectedNode === node.id ? ' selected' : '');
      el.dataset.nid = node.id; el.dataset.type = node.type;
      el.style.left = node.x + 'px'; el.style.top = node.y + 'px';

      var icon = FLOW_ICONS[node.type] || '\u26A1';
      var label = node.label || FLOW_LABELS[node.type] || node.id;
      var isAttack = node.type === 'attack';
      var canDelete = isAttack && flowState.nodes.filter(function(n) { return n.type === 'attack'; }).length > 1;
      var frames = adminState.animFrames[node.id] || [];
      var d = getNodeDuration(node.id);
      var thumbHTML = frames.length > 0 ? '<img src="' + frames[0].url + '">' : '<span class="flow-no-frames">sem frames</span>';
      var footerText = d.count > 0 ? d.count + 'f \u00B7 ' + d.dur + 's @ ' + d.fps + 'fps' : 'sem frames';

      el.innerHTML = '<div class="flow-node-header"><span class="flow-header-label">' + icon + ' ' + label + '</span>'
        + (canDelete ? '<button class="flow-node-delete">\u00D7</button>' : '')
        + '</div><div class="flow-node-body">' + thumbHTML + '</div>'
        + '<div class="flow-node-footer"><span>' + footerText + '</span>'
        + '<button class="admin-btn admin-btn-sm flow-node-play" style="font-size:0.55rem;padding:1px 6px;min-height:18px;">\u25B6</button></div>'
        + '<div class="flow-port port-in" data-node="' + node.id + '"></div>'
        + '<div class="flow-port port-out" data-node="' + node.id + '"></div>';

      // Double-click header to rename
      var headerLabel = el.querySelector('.flow-header-label');
      headerLabel.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        var inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'flow-rename-input'; inp.value = node.label || '';
        headerLabel.replaceWith(inp); inp.focus(); inp.select();
        function finish() {
          node.label = inp.value || FLOW_LABELS[node.type] || node.id;
          renderFlow();
          if (flowSelectedNode === node.id) renderNodePanel();
        }
        inp.addEventListener('keydown', function(ev) { if (ev.key === 'Enter') finish(); });
        inp.addEventListener('blur', finish);
      });

      // Click to select
      el.addEventListener('click', function(e) {
        if (e.target.closest('.flow-port') || e.target.closest('.flow-node-delete') || e.target.closest('.flow-node-play') || e.target.closest('.flow-rename-input')) return;
        selectFlowNode(node.id);
      });

      // Drag
      el.addEventListener('mousedown', function(e) {
        if (e.target.closest('.flow-port') || e.target.closest('.flow-node-delete') || e.target.closest('.flow-node-play') || e.target.closest('.flow-rename-input')) return;
        e.preventDefault(); e.stopPropagation();
        var wc = screenToWorld(e.clientX, e.clientY);
        flowDrag = { nodeId:node.id, ox:wc.x - node.x, oy:wc.y - node.y };
        el.classList.add('dragging');
      });

      // Delete
      var delBtn = el.querySelector('.flow-node-delete');
      if (delBtn) {
        delBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          flowState.nodes = flowState.nodes.filter(function(n) { return n.id !== node.id; });
          flowState.edges = flowState.edges.filter(function(ed) { return ed.from !== node.id && ed.to !== node.id; });
          if (flowSelectedNode === node.id) { flowSelectedNode = null; renderNodePanel(); }
          renderFlow();
        });
      }

      // Play preview
      var playBtn = el.querySelector('.flow-node-play');
      if (playBtn) {
        playBtn.addEventListener('click', function(e) { e.stopPropagation(); playFlowMiniPreview(node.id); });
      }

      // Port wiring
      var portOut = el.querySelector('.port-out');
      if (portOut) {
        portOut.addEventListener('mousedown', function(e) {
          e.preventDefault(); e.stopPropagation();
          var portRect = portOut.getBoundingClientRect();
          var canvasRect = document.getElementById('flow-canvas').getBoundingClientRect();
          var sx = (portRect.left + 6 - canvasRect.left - panX) / zoom;
          var sy = (portRect.top + 6 - canvasRect.top - panY) / zoom;
          var line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          line.setAttribute('fill', 'none'); line.setAttribute('stroke', 'rgba(200,169,110,0.5)');
          line.setAttribute('stroke-width', String(2 / zoom)); line.setAttribute('stroke-dasharray', '6 3');
          svg.appendChild(line);
          flowWiring = { fromId:node.id, line:line, sx:sx, sy:sy };
        });
      }

      world.appendChild(el);
    });

    applyTransform(); drawEdges();
  }

  function drawEdges() {
    var svg = document.getElementById('flow-svg');
    var canvas = document.getElementById('flow-canvas');
    if (!svg || !canvas) return;
    svg.querySelectorAll('.flow-edge').forEach(function(el) { el.remove(); });
    var canvasRect = canvas.getBoundingClientRect();

    var toRemove = [];
    flowState.edges.forEach(function(edge, idx) {
      var fromEl = document.querySelector('[data-nid="' + edge.from + '"]');
      var toEl = document.querySelector('[data-nid="' + edge.to + '"]');
      if (!fromEl || !toEl) { toRemove.push(idx); return; }
      var fp = fromEl.querySelector('.port-out'), tp = toEl.querySelector('.port-in');
      if (!fp || !tp) return;
      var fr = fp.getBoundingClientRect(), tr = tp.getBoundingClientRect();
      var sx = (fr.left+6-canvasRect.left-panX)/zoom, sy = (fr.top+6-canvasRect.top-panY)/zoom;
      var ex = (tr.left+6-canvasRect.left-panX)/zoom, ey = (tr.top+6-canvasRect.top-panY)/zoom;
      var dx = Math.abs(ex-sx)*0.45;
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.classList.add('flow-edge');
      path.setAttribute('d', 'M'+sx+','+sy+' C'+(sx+dx)+','+sy+' '+(ex-dx)+','+ey+' '+ex+','+ey);
      path.style.pointerEvents = 'stroke';
      path.addEventListener('click', function() {
        flowState.edges = flowState.edges.filter(function(ed) { return !(ed.from === edge.from && ed.to === edge.to); });
        drawEdges();
      });
      svg.appendChild(path);
    });
    // Clean orphan edges
    if (toRemove.length) {
      for (var i = toRemove.length - 1; i >= 0; i--) flowState.edges.splice(toRemove[i], 1);
    }
  }

  function playFlowMiniPreview(nodeId) {
    var canvas = document.getElementById('flow-mini-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var frames = adminState.animFrames[nodeId] || [];
    var node = flowState.nodes.find(function(n) { return n.id === nodeId; });
    var fps = (node && node.fps) || 8;
    if (adminState.previewAnimInterval) clearInterval(adminState.previewAnimInterval);
    if (frames.length === 0) {
      ctx.clearRect(0, 0, 200, 200); ctx.fillStyle = '#6b6b80'; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Sem frames', 100, 100); return;
    }
    var images = [], loaded = 0;
    frames.forEach(function(f) { var img = new Image(); img.onload = function() { loaded++; if (loaded === images.length) startA(); }; img.src = f.url; images.push(img); });
    function startA() {
      var i = 0;
      function draw() { ctx.clearRect(0,0,200,200); var img=images[i%images.length]; var s=Math.min(200/img.naturalWidth,200/img.naturalHeight); var w=img.naturalWidth*s,h=img.naturalHeight*s; ctx.drawImage(img,(200-w)/2,(200-h)/2,w,h); i=(i+1)%images.length; }
      draw(); adminState.previewAnimInterval = setInterval(draw, 1000/fps);
    }
  }

  // ---- Full Flow Preview ----
  function openFlowPreviewModal() {
    var modal = document.getElementById('flow-preview-modal');
    modal.classList.remove('hidden');
    flowPreviewRunning = true; flowPreviewPaused = false;
    document.getElementById('btn-flow-prev-pause').textContent = '\u23F8 Pausar';
    document.getElementById('flow-atk-chooser').classList.add('hidden');
    runFlowSequence();
  }

  function closeFlowPreviewModal() {
    document.getElementById('flow-preview-modal').classList.add('hidden');
    flowPreviewRunning = false;
    if (flowPreviewInterval) { clearInterval(flowPreviewInterval); flowPreviewInterval = null; }
  }

  function getFlowOutEdges(nodeId) {
    return flowState.edges.filter(function(ed) { return ed.from === nodeId; });
  }

  function runFlowSequence() {
    if (!flowPreviewRunning) return;
    var sequence = [];
    // Build sequence: idle → follow edges
    var currentId = 'idle';
    var visited = new Set();
    for (var step = 0; step < 20; step++) {
      if (!currentId || visited.has(currentId)) break;
      sequence.push(currentId);
      visited.add(currentId);
      var outs = getFlowOutEdges(currentId);
      if (outs.length === 0) break;
      if (outs.length === 1) { currentId = outs[0].to; }
      else {
        // Multiple outs — check if attacks
        var attackOuts = outs.filter(function(ed) { return ed.to.startsWith('attack'); });
        if (attackOuts.length > 1) {
          // Will handle in playback with chooser
          sequence.push({ multi: attackOuts.map(function(ed) { return ed.to; }) });
          break;
        }
        currentId = outs[Math.floor(Math.random() * outs.length)].to;
      }
    }

    playFlowSequenceStep(sequence, 0);
  }

  function playFlowSequenceStep(sequence, idx) {
    if (!flowPreviewRunning || idx >= sequence.length) {
      // Loop: restart
      if (flowPreviewRunning) setTimeout(function() { runFlowSequence(); }, 200);
      return;
    }

    var step = sequence[idx];

    // Multi-attack choice
    if (typeof step === 'object' && step.multi) {
      var isRandom = document.getElementById('flow-atk-random').checked;
      if (isRandom) {
        var chosen = step.multi[Math.floor(Math.random() * step.multi.length)];
        playNodeOnPreviewCanvas(chosen, function() {
          // After attack, follow that node's out edges back
          var outs = getFlowOutEdges(chosen);
          if (outs.length > 0) {
            playNodeOnPreviewCanvas(outs[0].to, function() {
              if (flowPreviewRunning) setTimeout(function() { runFlowSequence(); }, 100);
            });
          } else {
            if (flowPreviewRunning) setTimeout(function() { runFlowSequence(); }, 100);
          }
        });
      } else {
        showAttackChooser(step.multi, function(chosen) {
          playNodeOnPreviewCanvas(chosen, function() {
            var outs = getFlowOutEdges(chosen);
            if (outs.length > 0) {
              playNodeOnPreviewCanvas(outs[0].to, function() {
                if (flowPreviewRunning) setTimeout(function() { runFlowSequence(); }, 100);
              });
            } else {
              if (flowPreviewRunning) setTimeout(function() { runFlowSequence(); }, 100);
            }
          });
        });
      }
      return;
    }

    // Normal node
    playNodeOnPreviewCanvas(step, function() {
      playFlowSequenceStep(sequence, idx + 1);
    });
  }

  function playNodeOnPreviewCanvas(nodeId, onComplete) {
    var canvas = document.getElementById('flow-preview-canvas');
    if (!canvas) { if (onComplete) onComplete(); return; }
    var ctx = canvas.getContext('2d');
    var node = flowState.nodes.find(function(n) { return n.id === nodeId; });
    var label = node ? (node.label || FLOW_LABELS[node.type] || nodeId) : nodeId;
    document.getElementById('flow-preview-label').textContent = '\u25B6 ' + label;

    var frames = adminState.animFrames[nodeId] || [];
    var fps = (node && node.fps) || 8;

    if (flowPreviewInterval) { clearInterval(flowPreviewInterval); flowPreviewInterval = null; }

    if (frames.length === 0) {
      ctx.clearRect(0, 0, 600, 400); ctx.fillStyle = '#6b6b80'; ctx.font = '16px Inter'; ctx.textAlign = 'center';
      ctx.fillText(label + ' (sem frames)', 300, 200);
      setTimeout(function() { if (onComplete) onComplete(); }, 500);
      return;
    }

    var images = [], loaded = 0;
    frames.forEach(function(f) { var img = new Image(); img.onload = function() { loaded++; if (loaded === images.length) startAnim(); }; img.onerror = function() { loaded++; if (loaded === images.length) startAnim(); }; img.src = f.url; images.push(img); });

    function startAnim() {
      var i = 0;
      function draw() {
        if (flowPreviewPaused) return;
        if (!flowPreviewRunning) { clearInterval(flowPreviewInterval); return; }
        ctx.clearRect(0, 0, 600, 400);
        if (images[i]) {
          var img = images[i]; var s = Math.min(600/img.naturalWidth, 400/img.naturalHeight) * 0.8;
          var w = img.naturalWidth*s, h = img.naturalHeight*s;
          ctx.drawImage(img, (600-w)/2, (400-h)/2, w, h);
        }
        i++;
        if (i >= images.length) {
          clearInterval(flowPreviewInterval); flowPreviewInterval = null;
          setTimeout(function() { if (onComplete) onComplete(); }, 150);
        }
      }
      draw();
      if (images.length > 1) { flowPreviewInterval = setInterval(draw, 1000/fps); }
      else { setTimeout(function() { if (onComplete) onComplete(); }, 1000/fps * 3); }
    }
  }

  function showAttackChooser(attackIds, onChoose) {
    var chooser = document.getElementById('flow-atk-chooser');
    var list = document.getElementById('flow-atk-list');
    chooser.classList.remove('hidden');
    list.innerHTML = '';
    attackIds.forEach(function(atkId) {
      var node = flowState.nodes.find(function(n) { return n.id === atkId; });
      var label = node ? (node.label || atkId) : atkId;
      var d = getNodeDuration(atkId);
      var btn = document.createElement('button');
      btn.className = 'flow-atk-btn';
      btn.innerHTML = '\u26A1 ' + label + '<small>' + d.count + ' frames \u00B7 ' + d.dur + 's</small>';
      btn.addEventListener('click', function() {
        chooser.classList.add('hidden');
        onChoose(atkId);
      });
      list.appendChild(btn);
    });
  }


  // ============================================================
  // INITIALIZATION
  // ============================================================

  async function init() {
    await openDB();
    await checkCloudConnection();
    initAnimSections();
    initFlowEditor();
    initDropzones();

    // Auto-generate ID from name fields
    document.getElementById('char-name').addEventListener('input', (e) => {
      if (!adminState.currentCharId) {
        document.getElementById('char-id').value = slugify(e.target.value);
      }
    });
    document.getElementById('admin-card-name').addEventListener('input', (e) => {
      if (!adminState.currentCardId) {
        document.getElementById('admin-card-id').value = slugify(e.target.value);
      }
    });
    document.getElementById('scenario-name').addEventListener('input', (e) => {
      if (!adminState.currentScenarioId) {
        document.getElementById('scenario-id').value = slugify(e.target.value);
      }
    });
  }

  // Run init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for game.js bridge
  window._adminOpenAdmin = openAdmin;

})();

