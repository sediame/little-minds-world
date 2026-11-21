/* Little Minds World — accounts, child profiles and the first screen.
   Talks to the account API in server.js. Passwords are only ever sent to the server over
   this form and are never stored in the browser. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  if (document.body.dataset.staticDemo === 'true') {
    document.body.dataset.view = 'auth';
    const child = { id: 'pages-demo-child', name: 'Explorer', age: 6, interests: ['Animals'], avatar: '🦊' };
    const user = { id: 'pages-demo', email: 'Browser demo', children: [child] };
    $('#demo-start').addEventListener('click', () => {
      document.body.dataset.view = 'app';
      $('#switch-child').hidden = true;
      $('#edit-family').hidden = true;
      $('#account-box').hidden = true;
      $('#family-email').textContent = 'Demo profile — stored only in this browser.';
      $('#family-list').replaceChildren();
      const item = document.createElement('li');
      item.textContent = `${child.avatar} ${child.name} · ${child.age} years old`;
      $('#family-list').append(item);
      $('#illustrate-story').hidden = true;
      $('#illustration-status').textContent = 'AI chapter illustrations are unavailable in this Pages demo.';
      window.lmwApp.start(user, child);
      window.lmwApp.welcome(user, child);
    });
    return;
  }

  const INTERESTS = [
    ['Animals', '🐘', 'Animals'], ['Dinosaurs', '🦕', 'Dinosaurs'], ['Space', '🚀', 'Space'],
    ['Vehicles', '🚂', 'Vehicles'], ['Nature', '🌳', 'Nature'], ['Professions', '🧑‍🚒', 'Helpers and jobs'],
    ['Ocean life', '🐬', 'Ocean life'], ['Magic and fantasy', '🐉', 'Magic and fantasy'], ['Sports', '⚽', 'Sports']
  ];
  const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🐙', '🦄', '🐯', '🐨'];
  const MAX_CHILDREN = 6;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const NAME_RE = /^[\p{L}\p{N} '’.-]+$/u;

  let user = null;
  let activeChild = null;
  let signupStep = 1;
  let signupCount = 1;
  let signupKids = [];
  let lastFocus = null;

  /* ---------- helpers ---------- */
  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  const setView = v => { document.body.dataset.view = v; window.scrollTo(0, 0); };
  const toast = msg => { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3200); };

  async function api(method, url, body) {
    let res;
    try {
      res = await fetch(url, {
        method, credentials: 'same-origin',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined
      });
    } catch {
      throw new Error('We can’t reach the server. Check that it is running, then try again.');
    }
    let data = {};
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) {
      const err = new Error(data.error || 'Something went wrong. Please try again.');
      err.status = res.status; err.field = data.field;
      throw err;
    }
    return data;
  }

  function showMessage(kind, text) {
    const err = $('#auth-error'), note = $('#auth-notice');
    err.textContent = kind === 'error' ? text : '';
    note.textContent = kind === 'notice' ? text : '';
  }
  const clearMessages = () => showMessage('', '');
  function setBusy(btn, busy, busyText) {
    if (!btn) return;
    if (busy) { btn.dataset.label = btn.textContent; btn.textContent = busyText; btn.disabled = true; }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
  }

  /* ---------- child cards (sign-up step 3 and the family editor) ---------- */
  function childCard(child, index, opts = {}) {
    const card = el('div', 'child-card');
    card.setAttribute('role', 'group');
    card.dataset.id = child.id || '';
    const uid = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    const head = el('div', 'child-card-head');
    const title = el('h3', 'child-card-title', `Child ${index + 1}`);
    head.append(title);
    if (opts.removable) {
      const rm = el('button', 'text-button child-remove', 'Remove');
      rm.type = 'button';
      rm.addEventListener('click', () => opts.onRemove && opts.onRemove(card));
      head.append(rm);
    }
    card.append(head);

    const picker = el('div', 'avatar-picker');
    picker.setAttribute('role', 'radiogroup');
    picker.setAttribute('aria-label', 'Pick a picture');
    const chosen = AVATARS.includes(child.avatar) ? child.avatar : AVATARS[index % AVATARS.length];
    AVATARS.forEach(a => {
      const b = el('button', 'avatar-option', a);
      b.type = 'button'; b.dataset.avatar = a;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(a === chosen));
      b.addEventListener('click', () => $$('.avatar-option', picker).forEach(o => o.setAttribute('aria-checked', String(o === b))));
      picker.append(b);
    });
    card.append(picker);

    const nameLabel = el('label', '', 'First name or nickname');
    const name = el('input', 'field-input child-name');
    name.type = 'text'; name.maxLength = 30; name.autocomplete = 'off'; name.value = child.name || '';
    name.id = `${uid}-name`;
    nameLabel.append(name);

    const ageLabel = el('label', '', 'Age');
    const age = el('select', 'field-input child-age');
    for (let a = 3; a <= 11; a++) { const o = el('option', '', `${a} years`); o.value = String(a); age.append(o); }
    age.value = String(child.age || 6);
    ageLabel.append(age);
    const row = el('div', 'child-fields');
    row.append(nameLabel, ageLabel);
    card.append(row);

    const likes = el('div', 'likes');
    const legend = el('p', 'likes-label', 'What do they like? Pick one or more.');
    legend.id = `${uid}-likes`;
    const chips = el('div', 'chip-group');
    chips.setAttribute('role', 'group'); chips.setAttribute('aria-labelledby', legend.id);
    const picked = new Set(child.interests || []);
    INTERESTS.forEach(([value, emoji, label]) => {
      const c = el('button', 'chip-toggle', `${emoji} ${label}`);
      c.type = 'button'; c.dataset.value = value; c.setAttribute('aria-pressed', String(picked.has(value)));
      c.addEventListener('click', () => c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')));
      chips.append(c);
    });
    likes.append(legend, chips);
    card.append(likes);
    return card;
  }

  function readCard(card) {
    const kid = {
      name: $('.child-name', card).value.trim().replace(/\s+/g, ' '),
      age: Number($('.child-age', card).value),
      interests: $$('.chip-toggle[aria-pressed="true"]', card).map(b => b.dataset.value),
      avatar: ($('.avatar-option[aria-checked="true"]', card) || {}).dataset?.avatar || AVATARS[0]
    };
    if (card.dataset.id) kid.id = card.dataset.id;
    return kid;
  }
  const readCards = container => $$('.child-card', container).map(readCard);

  function validateKids(kids) {
    if (kids.length < 1 || kids.length > MAX_CHILDREN) return { msg: `Please add between 1 and ${MAX_CHILDREN} children.`, index: 0 };
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      if (!k.name) return { msg: `Please enter a name for child ${i + 1}.`, index: i, field: '.child-name' };
      if (k.name.length > 30 || !NAME_RE.test(k.name)) return { msg: `${k.name.slice(0, 30)}: use letters, numbers, spaces, hyphens or apostrophes only.`, index: i, field: '.child-name' };
      if (!Number.isInteger(k.age) || k.age < 3 || k.age > 11) return { msg: `${k.name}: age must be between 3 and 11.`, index: i, field: '.child-age' };
      if (!k.interests.length) return { msg: `Please choose at least one thing ${k.name} likes.`, index: i, field: '.chip-toggle' };
    }
    return null;
  }
  function focusProblem(container, problem) {
    const card = $$('.child-card', container)[problem.index];
    const target = card && $(problem.field || '.child-name', card);
    if (target) { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); target.focus({ preventScroll: true }); }
  }
  function renumber(container) {
    const cards = $$('.child-card', container);
    cards.forEach((c, i) => {
      $('.child-card-title', c).textContent = `Child ${i + 1}`;
      const rm = $('.child-remove', c); if (rm) rm.hidden = cards.length < 2;
    });
  }

  /* ---------- tabs ---------- */
  function selectTab(which, focus = true) {
    const login = which === 'login';
    $('#tab-login').setAttribute('aria-selected', String(login)); $('#tab-login').tabIndex = login ? 0 : -1;
    $('#tab-signup').setAttribute('aria-selected', String(!login)); $('#tab-signup').tabIndex = login ? -1 : 0;
    $('#login-form').hidden = !login; $('#signup-form').hidden = login;
    clearMessages();
    if (!login) setStep(1, false);
    if (focus) (login ? $('#login-email') : $('#signup-email')).focus();
  }
  $('#tab-login').addEventListener('click', () => selectTab('login'));
  $('#tab-signup').addEventListener('click', () => selectTab('signup'));
  $$('.auth-tabs [role="tab"]').forEach(t => t.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); selectTab(t.id === 'tab-login' ? 'signup' : 'login'); (t.id === 'tab-login' ? $('#tab-signup') : $('#tab-login')).focus(); }
  }));
  $$('[data-auth-tab]').forEach(b => b.addEventListener('click', () => selectTab(b.dataset.authTab)));
  $$('.toggle-password').forEach(b => b.addEventListener('click', () => {
    const input = document.getElementById(b.dataset.target);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.textContent = show ? 'Hide' : 'Show'; b.setAttribute('aria-pressed', String(show));
  }));

  // Clear an old error as soon as the parent starts fixing it.
  ['#login-form', '#signup-form'].forEach(s => { $(s).addEventListener('input', clearMessages); $(s).addEventListener('change', clearMessages); });

  /* ---------- log in ---------- */
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault(); clearMessages();
    const email = $('#login-email').value.trim(), password = $('#login-password').value;
    if (!EMAIL_RE.test(email)) { showMessage('error', 'Please enter the email address you signed up with.'); $('#login-email').focus(); return; }
    if (!password) { showMessage('error', 'Please enter your password.'); $('#login-password').focus(); return; }
    const btn = $('#login-submit'); setBusy(btn, true, 'Logging in…');
    try { enter(await api('POST', '/api/auth/login', { email, password })); $('#login-password').value = ''; }
    catch (err) { showMessage('error', err.message); $('#login-password').select(); }
    finally { setBusy(btn, false); }
  });

  /* ---------- sign up wizard ---------- */
  function buildCountPicker() {
    const box = $('#count-picker'); box.replaceChildren();
    for (let n = 1; n <= MAX_CHILDREN; n++) {
      const b = el('button', '', String(n));
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(n === signupCount));
      b.setAttribute('aria-label', n === 1 ? '1 child' : `${n} children`);
      b.addEventListener('click', () => { signupCount = n; $$('button', box).forEach((x, i) => x.setAttribute('aria-checked', String(i + 1 === n))); });
      box.append(b);
    }
  }
  function setStep(n, focus = true) {
    signupStep = n;
    $$('#signup-form .step').forEach(s => { s.hidden = Number(s.dataset.step) !== n; });
    $('#step-label').textContent = `Step ${n} of 3`;
    $$('.step-bar i').forEach((i, idx) => i.classList.toggle('done', idx < n));
    $('#step-back').hidden = n === 1;
    $('#step-next').textContent = n === 3 ? 'Create account' : 'Next';
    if (focus) { const h = $(`#step${n}-title`); h.focus(); h.scrollIntoView({ block: 'nearest' }); }
  }
  function prepareChildStep() {
    const box = $('#signup-children');
    const existing = readCards(box);
    signupKids = Array.from({ length: signupCount }, (_, i) => existing[i] || { name: '', age: 6, interests: [], avatar: AVATARS[i % AVATARS.length] });
    box.replaceChildren(...signupKids.map((k, i) => childCard(k, i)));
  }
  $('#step-back').addEventListener('click', () => { clearMessages(); setStep(signupStep - 1); });

  $('#signup-form').addEventListener('submit', async e => {
    e.preventDefault(); clearMessages();
    if (signupStep === 1) {
      const email = $('#signup-email').value.trim(), pw = $('#signup-password').value;
      $('#signup-email').removeAttribute('aria-invalid'); $('#signup-password').removeAttribute('aria-invalid');
      if (!EMAIL_RE.test(email)) { $('#signup-email').setAttribute('aria-invalid', 'true'); showMessage('error', 'Please enter a valid email address.'); $('#signup-email').focus(); return; }
      if (pw.length < 8) { $('#signup-password').setAttribute('aria-invalid', 'true'); showMessage('error', 'Your password needs at least 8 characters.'); $('#signup-password').focus(); return; }
      if (pw.length > 128) { $('#signup-password').setAttribute('aria-invalid', 'true'); showMessage('error', 'Your password is too long (128 characters at most).'); $('#signup-password').focus(); return; }
      if (!$('#signup-parent').checked) { showMessage('error', 'Please confirm that you are a parent or guardian.'); $('#signup-parent').focus(); return; }
      return setStep(2);
    }
    if (signupStep === 2) { prepareChildStep(); return setStep(3); }
    const kids = readCards($('#signup-children'));
    const problem = validateKids(kids);
    if (problem) { showMessage('error', problem.msg); focusProblem($('#signup-children'), problem); return; }
    const btn = $('#step-next'); setBusy(btn, true, 'Creating account…');
    try {
      const created = await api('POST', '/api/auth/signup', { email: $('#signup-email').value.trim(), password: $('#signup-password').value, parentConfirmed: true, children: kids });
      $('#signup-password').value = '';
      enter(created);
    } catch (err) {
      showMessage('error', err.message);
      if (err.field === 'email') { setStep(1, false); $('#signup-email').setAttribute('aria-invalid', 'true'); $('#signup-email').focus(); }
    } finally { setBusy(btn, false); }
  });

  /* ---------- after sign-in ---------- */
  function enter(u) {
    user = u; clearMessages();
    renderAccount();
    if (u.children.length === 1) chooseChild(u.children[0]);
    else showProfiles();
  }

  function showProfiles() {
    const grid = $('#profile-grid'); grid.replaceChildren();
    user.children.forEach((c, i) => {
      const b = el('button', `profile-tile tone-${i % 6}`);
      b.type = 'button';
      b.append(el('span', 'big-avatar', c.avatar), el('strong', '', c.name), el('span', 'age', `${c.age} years old`));
      b.setAttribute('aria-label', `${c.name}, ${c.age} years old`);
      b.addEventListener('click', () => chooseChild(c));
      grid.append(b);
    });
    window.lmwApp.stop();
    setView('profiles');
    $('#profile-title').focus({ preventScroll: true });
  }

  function chooseChild(c) {
    activeChild = c;
    setView('app');
    window.lmwApp.start(user, c);
    renderAccount();
    window.lmwApp.welcome(user, c);
  }
  $('#switch-child').addEventListener('click', showProfiles);
  $('#profile-logout').addEventListener('click', () => logout());

  function renderAccount() {
    if (!user) return;
    $('#family-email').textContent = `Signed in as ${user.email}`;
    $('#account-email').textContent = user.email;
    const list = $('#family-list'); list.replaceChildren();
    user.children.forEach(c => {
      const li = el('li');
      const info = el('div');
      info.append(el('span', '', c.name), (() => { const s = el('small', '', `${c.age} years old. Likes ${c.interests.join(', ').toLowerCase()}.`); return s; })());
      li.append(el('span', 'fav', c.avatar), info);
      if (activeChild && c.id === activeChild.id) li.append(el('span', 'status-pill', 'Playing now'));
      list.append(li);
    });
    $('#progress-for').textContent = activeChild ? `The progress below is for ${activeChild.name}. Tap their picture at the top to switch child.` : '';
  }

  /* ---------- log out / expired session ---------- */
  function resetToSignedOut(noticeKind, text) {
    window.lmwApp.stop();
    user = null; activeChild = null;
    ['#login-email', '#login-password', '#signup-email', '#signup-password'].forEach(s => { $(s).value = ''; });
    $('#signup-parent').checked = false; $('#signup-children').replaceChildren(); signupCount = 1; buildCountPicker();
    closeModal('family-modal', true); closeModal('delete-modal', true);
    setView('auth'); selectTab('login', false);
    if (text) showMessage(noticeKind, text);
    $('#login-email').focus();
  }
  async function logout() {
    try { await api('POST', '/api/auth/logout'); } catch { /* the session cookie is cleared either way when possible */ }
    resetToSignedOut('notice', 'You’re logged out. See you soon!');
  }
  $('#logout-button').addEventListener('click', logout);

  /* ---------- modals ---------- */
  function openModal(id, focusSel) {
    lastFocus = document.activeElement;
    const m = document.getElementById(id); m.hidden = false; document.body.classList.add('modal-open');
    (focusSel ? $(focusSel, m) : $('h1', m)).focus({ preventScroll: true });
  }
  function closeModal(id, silent) {
    const m = document.getElementById(id); if (m.hidden) return;
    m.hidden = true;
    if ($$('.modal-backdrop').every(x => x.hidden)) document.body.classList.remove('modal-open');
    if (!silent && lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal('family-modal'); closeModal('delete-modal'); } });
  ['family-modal', 'delete-modal'].forEach(id => document.getElementById(id).addEventListener('click', e => { if (e.target.id === id) closeModal(id); }));

  /* ---------- edit children ---------- */
  function fillFamilyEditor() {
    const box = $('#family-children');
    const make = (kid, i) => childCard(kid, i, { removable: true, onRemove: card => { card.remove(); renumber(box); $('#add-child').hidden = false; } });
    box.replaceChildren(...user.children.map((c, i) => make(c, i)));
    renumber(box);
    $('#add-child').hidden = user.children.length >= MAX_CHILDREN;
    box._make = make;
  }
  $('#edit-family').addEventListener('click', () => { $('#family-error').textContent = ''; fillFamilyEditor(); openModal('family-modal'); });
  $('#close-family').addEventListener('click', () => closeModal('family-modal'));
  $('#add-child').addEventListener('click', () => {
    const box = $('#family-children'); const n = $$('.child-card', box).length;
    if (n >= MAX_CHILDREN) return;
    const card = box._make({ name: '', age: 6, interests: [], avatar: AVATARS[n % AVATARS.length] }, n);
    box.append(card); renumber(box);
    $('#add-child').hidden = n + 1 >= MAX_CHILDREN;
    $('.child-name', card).focus();
  });
  $('#save-family').addEventListener('click', async () => {
    const box = $('#family-children'); $('#family-error').textContent = '';
    const kids = readCards(box); const problem = validateKids(kids);
    if (problem) { $('#family-error').textContent = problem.msg; focusProblem(box, problem); return; }
    const btn = $('#save-family'); setBusy(btn, true, 'Saving…');
    try {
      const before = user.children.map(c => c.id);
      const updated = await api('PUT', '/api/children', { children: kids });
      user = updated;
      before.filter(id => !user.children.some(c => c.id === id)).forEach(id => window.lmwApp.purge(user.id, id));
      closeModal('family-modal', true);
      const still = activeChild && user.children.find(c => c.id === activeChild.id);
      if (still) { activeChild = still; window.lmwApp.updateChild(still); renderAccount(); toast('Your family was updated.'); }
      else if (activeChild) { toast('Your family was updated.'); showProfiles(); }
      else renderAccount();
    } catch (err) {
      if (err.status === 401) return expire();
      $('#family-error').textContent = err.message;
    } finally { setBusy(btn, false); }
  });

  /* ---------- delete account ---------- */
  $('#delete-account-button').addEventListener('click', () => { $('#delete-error').textContent = ''; $('#delete-password').value = ''; openModal('delete-modal', '#delete-password'); });
  $('#close-delete').addEventListener('click', () => closeModal('delete-modal'));
  $('#cancel-delete').addEventListener('click', () => closeModal('delete-modal'));
  $('#confirm-delete').addEventListener('click', async () => {
    const pw = $('#delete-password').value; $('#delete-error').textContent = '';
    if (!pw) { $('#delete-error').textContent = 'Enter your password to confirm.'; $('#delete-password').focus(); return; }
    const btn = $('#confirm-delete'); setBusy(btn, true, 'Deleting…');
    try {
      const uid = user.id;
      await api('POST', '/api/auth/delete', { password: pw });
      window.lmwApp.purge(uid);
      resetToSignedOut('notice', 'Your account and its saved data were deleted.');
    } catch (err) {
      if (err.status === 401 && /log in again/i.test(err.message)) return expire();
      $('#delete-error').textContent = err.message;
    } finally { setBusy(btn, false); }
  });

  /* ---------- hooks used by script.js ---------- */
  function expire() { resetToSignedOut('error', 'Your session ended. Please log in again.'); }
  window.lmwAuth = { expire };

  /* ---------- start ---------- */
  buildCountPicker();
  (async function boot() {
    try { enter(await api('GET', '/api/auth/me')); }
    catch (err) {
      setView('auth');
      if (!err.status) showMessage('error', err.message);
    }
  })();
})();
