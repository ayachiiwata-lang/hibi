'use strict';
/* 日々 — 端末保存のオフライン日記
   データ形式は旧アプリ（hibi-diary v10）のバックアップと互換 */

const STORE_KEY = 'hibi-data';
const META_KEY = 'hibi-meta';

const CATEGORIES = [
  ['movieForeign', '洋画'],
  ['movieJapanese', '邦画'],
  ['drama', 'ドラマ'],
  ['novel', '小説'],
  ['mangaAnime', '漫画・アニメ'],
  ['other', 'その他'],
];
const CAT = Object.fromEntries(CATEGORIES);
const RANKS = [['gold', '金'], ['silver', '銀'], ['bronze', '銅'], ['', '未評価']];
const RANK = Object.fromEntries(RANKS);
const RATINGS = { good: 'いい日', wasted: 'もったいない日' };
const KINDS = { idea: 'アイデア', mindset: '心構え' };
const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/* ---------- icons ---------- */
const I = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M7 18.5h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.3 1.6A3.3 3.3 0 0 0 7 18.5z"/></svg>',
  grip: '<svg viewBox="0 0 24 24"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24"><path d="M7 4h10v16l-5-4-5 4z"/></svg>',
  film: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="m10 10 5 2.5-5 2.5z"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/></svg>',
  quote: '<svg viewBox="0 0 24 24"><path d="M9 7H6a2 2 0 0 0-2 2v3h5v5H4M20 7h-3a2 2 0 0 0-2 2v3h5v5h-5"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12M8 11l4 4 4-4M5 21h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
};

/* ---------- data ---------- */
let db = load();
let meta = JSON.parse(localStorage.getItem(META_KEY) || '{}');

function emptyDb() {
  return { entries: [], highlights: [], works: [], routines: [], routineLog: {} };
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY));
    if (d && Array.isArray(d.entries)) return { ...emptyDb(), ...d };
  } catch (_) {}
  return emptyDb();
}
function persist() {
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
}
function saveMeta() {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const nowISO = () => new Date().toISOString();

function ymd(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
function fmtDate(s) {
  if (!s) return '';
  const d = parseYmd(s);
  return `${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`;
}
function relDay(s) {
  const diff = Math.round((parseYmd(s) - parseYmd(ymd())) / 864e5);
  return { 0: '今日', '-1': '昨日', '-2': 'おととい', 1: '明日' }[diff] || '';
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function getEntry(date) {
  return db.entries.find((e) => e.date === date);
}
function entryIsEmpty(e) {
  return !e.title.trim() && !e.feelings.trim() && !e.rating && !e.events.some((x) => x.text.trim());
}
function sortedEntries() {
  return [...db.entries].sort((a, b) => b.date.localeCompare(a.date));
}

/* ---------- ui helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const sheet = $('#sheet');
const sheetForm = $('#sheetForm');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 触覚フィードバック。Android は振動。iOS には振動の API が無いので、
   switch 型チェックボックスの切り替え（iOS 17.4 以降で軽く震える）を借りる */
function tap() {
  if (navigator.vibrate) return void navigator.vibrate(8);
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.append(input);
  document.head.append(label);
  label.click();
  label.remove();
}
// 日本語入力の変換を確定する Enter は除く（Safari は確定の Enter を keyCode 229 で送ってくる）
const isEnter = (ev) => ev.key === 'Enter' && !ev.isComposing && ev.keyCode !== 229;

let toastTimer;
function toast(msg, undo) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button">元に戻す</button>' : ''}`;
  if (undo) t.querySelector('button').onclick = () => { undo(); t.classList.remove('show'); };
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), undo ? 5000 : 1800);
}
/* 削除などの操作を「元に戻す」付きで実行 */
function undoable(msg, fn) {
  const snapshot = structuredClone(db);
  fn();
  persist();
  render();
  toast(msg, () => { db = snapshot; persist(); render(); });
}

function autosize(t) {
  t.style.height = 'auto';
  t.style.height = t.scrollHeight + 'px';
}

/* ---------- bottom sheet ---------- */
function openSheet(html, onSubmit, { autofocus = true } = {}) {
  sheetForm.innerHTML = `<div class="grab"><span></span></div>${html}`;
  sheetForm.onsubmit = (ev) => {
    ev.preventDefault();
    const action = ev.submitter?.value;
    if (action === 'cancel') return closeSheet();
    const keep = onSubmit(action, new FormData(sheetForm));
    if (keep !== true) closeSheet();
  };
  const wasOpen = sheet.open;
  if (!wasOpen) {
    sheet.classList.remove('closing');
    sheet.style.transform = '';
    sheet.showModal();
  }
  // 表示後でないと高さが測れない
  sheetForm.querySelectorAll('textarea').forEach((t) => {
    autosize(t);
    t.addEventListener('input', () => autosize(t));
  });
  const first = sheetForm.querySelector('textarea, input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=date])');
  if (autofocus && first && !first.value) wasOpen ? first.focus() : setTimeout(() => first.focus(), 60);
}
function closeSheet() {
  if (!sheet.open) return;
  document.activeElement?.blur();
  if (reduceMotion) return sheet.close();
  sheet.classList.add('closing');
  setTimeout(() => { sheet.close(); sheet.classList.remove('closing'); sheet.style.transform = ''; }, 220);
}
sheet.addEventListener('click', (e) => {
  if (e.target === sheet) closeSheet();
});
sheet.addEventListener('cancel', (e) => {
  e.preventDefault();
  closeSheet();
});
// 下に引っぱると閉じる。中身が一番上までスクロールされていれば、どこをつかんでもよい
(() => {
  let y0 = null;
  let x0 = 0;
  let t0 = 0;
  let dy = 0;
  let active = false;
  const settle = () => {
    sheet.style.transition = '';
    const fast = dy / Math.max(1, Date.now() - t0) > 0.55;
    if (dy > 120 || (dy > 36 && fast)) closeSheet();
    else sheet.style.transform = '';
    y0 = null;
    active = false;
  };
  sheet.addEventListener('touchstart', (e) => {
    y0 = null;
    const t = e.target;
    if (e.touches.length !== 1 || sheet.classList.contains('closing')) return;
    const onBar = t.closest('.grab, h2');
    if (!onBar && (sheetForm.scrollTop > 0 || t.closest('input, textarea, select, .handle'))) return;
    y0 = e.touches[0].clientY;
    x0 = e.touches[0].clientX;
    t0 = Date.now();
    dy = 0;
    active = false;
  }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    const d = e.touches[0].clientY - y0;
    if (!active) {
      // 上へのスクロールや横の動きは引っぱりと見なさない
      if (d < -6 || Math.abs(e.touches[0].clientX - x0) > Math.abs(d) + 6) { y0 = null; return; }
      // 先に止めておかないと、中身のスクロール（ゴムのような伸び）が始まってしまう
      if (d > 0 && e.cancelable) e.preventDefault();
      if (d < 8) return;
      active = true;
      sheet.style.transition = 'none';
    }
    if (e.cancelable) e.preventDefault();
    dy = Math.max(0, d);
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: false });
  sheet.addEventListener('touchend', () => { if (active) settle(); else y0 = null; });
  sheet.addEventListener('touchcancel', () => { if (active) { dy = 0; settle(); } else y0 = null; });

  // マウス（パソコン）では上のつまみ・見出しをドラッグ
  let m0 = null;
  sheet.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || !e.target.closest('.grab, h2')) return;
    m0 = e.clientY;
    t0 = Date.now();
    dy = 0;
    sheet.setPointerCapture(e.pointerId);
    sheet.style.transition = 'none';
  });
  sheet.addEventListener('pointermove', (e) => {
    if (m0 === null) return;
    dy = Math.max(0, e.clientY - m0);
    sheet.style.transform = `translateY(${dy}px)`;
  });
  const mouseEnd = () => {
    if (m0 === null) return;
    m0 = null;
    settle();
  };
  sheet.addEventListener('pointerup', mouseEnd);
  sheet.addEventListener('pointercancel', mouseEnd);
})();

function chipRadios() {
  sheetForm.querySelectorAll('.choice').forEach((g) => g.addEventListener('change', () => {
    tap();
    g.querySelectorAll('label').forEach((l) => {
      const on = l.querySelector('input').checked;
      l.classList.toggle('on', on);
      l.classList.toggle('pop', on);
    });
  }));
}

/* ---------- キーボード表示中はタブバーを隠す ---------- */
document.addEventListener('focusin', (e) => {
  if (e.target.matches('input:not([type=radio]):not([type=checkbox]):not([type=date]), textarea')) document.body.classList.add('typing');
});
document.addEventListener('focusout', () => {
  setTimeout(() => {
    if (!document.activeElement?.matches('input, textarea')) document.body.classList.remove('typing');
  }, 50);
});
if (window.visualViewport) {
  const vv = window.visualViewport;
  const onVV = () => {
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--kb', `${kb}px`);
  };
  vv.addEventListener('resize', onVV);
  vv.addEventListener('scroll', onVV);
}

/* ---------- 横スワイプ ---------- */
function onSwipe(el, cb, ignore = '') {
  let x0, y0, t0, ok;
  el.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    const tg = e.target;
    // 入力中の欄の上では文字の操作を優先する（入力していない欄の上はスワイプできる）
    const editing = tg.matches('input, textarea') && tg === document.activeElement;
    ok = e.touches.length === 1 && t.clientX > 24 && !editing && !tg.closest(`.chips, .handle${ignore && `, ${ignore}`}`);
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (!ok) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0;
    const dy = t.clientY - y0;
    if (Math.abs(dx) > 64 && Math.abs(dy) < Math.abs(dx) * 0.6 && Date.now() - t0 < 600) cb(dx < 0 ? 1 : -1);
  });
}

/* ---------- ドラッグで並べ替え ---------- */
function enableDrag(container, itemSel, onDone) {
  container.addEventListener('pointerdown', (ev) => {
    const h = ev.target.closest('.handle');
    if (!h || !container.contains(h)) return;
    const item = h.closest(itemSel);
    const list = item.parentElement;
    ev.preventDefault();
    item.classList.add('dragging');
    tap();
    let raf;
    const move = (e) => {
      const y = e.clientY;
      const sib = [...list.querySelectorAll(`:scope > ${itemSel}:not(.dragging)`)];
      const before = sib.find((s) => { const r = s.getBoundingClientRect(); return y < r.top + r.height / 2; });
      if ((before || null) !== item.nextElementSibling) list.insertBefore(item, before || null);
      cancelAnimationFrame(raf);
      const edge = y < 90 ? -10 : y > window.innerHeight - 140 ? 10 : 0;
      if (edge) {
        const scroller = item.closest('dialog') ? sheetForm : window;
        const step = () => { scroller.scrollBy(0, edge); raf = requestAnimationFrame(step); };
        raf = requestAnimationFrame(step);
      }
    };
    const up = () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      item.classList.remove('dragging');
      onDone([...list.querySelectorAll(`:scope > ${itemSel}`)].map((x) => x.dataset.key));
    };
    // 要素を移動するとポインタキャプチャが外れるため document で受ける
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  });
}

/* ---------- routing ---------- */
const state = {
  tab: 'today',
  date: ymd(),
  month: ymd().slice(0, 7),
  diaryFilter: 'all',
  hlFilter: 'all',
  workCat: 'movieForeign',
  query: '',
  searching: false,
  from: null, // 日記・検索などから日を開いたときの戻り先
};
const TITLES = { today: '今日', diary: '日記', highlights: '留める', works: '作品', settings: '設定' };
const scrollMem = {}; // タブごとのスクロール位置
// 画面に浮かせるボタン（＋・戻る）。main の外に置き、切り替えアニメーション中も位置がずれないようにする
const floatEl = $('#float');
const setFloat = (html) => { floatEl.innerHTML = html; };
floatEl.addEventListener('click', (ev) => view.onclick?.(ev));

function go(tab, opts = {}, { keepScroll = false } = {}) {
  if (!state.searching && !state.from) scrollMem[state.tab] = window.scrollY;
  Object.assign(state, { from: null }, opts, { tab, searching: false });
  render({ animate: true });
  jumpTo(keepScroll ? scrollMem[tab] || 0 : 0);
}
// 日記・検索・留めるから、ある日を開く（戻り先と位置を覚えておく）
function openDay(date) {
  const from = state.from && !state.searching ? state.from : {
    tab: state.tab, searching: state.searching, date: state.date, scroll: window.scrollY,
    label: state.searching ? '検索' : TITLES[state.tab],
  };
  go('today', { date, from });
}
function back() {
  const f = state.from;
  if (!f) return;
  Object.assign(state, { tab: f.tab, searching: f.searching, date: f.date, from: null });
  render({ animate: true });
  jumpTo(f.scroll);
}
function setSearching(on) {
  if (on === state.searching) return;
  if (on && !state.from) scrollMem[state.tab] = window.scrollY;
  state.searching = on;
  render({ animate: true });
  jumpTo(on ? 0 : scrollMem[state.tab] || 0);
  if (on) $('#q')?.focus();
}
document.querySelector('.tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  tap();
  const tab = b.dataset.tab;
  const f = state.from;
  if (f && !state.searching) {
    // 日記などから開いた日のページ。元のタブをもう一度押すと戻る
    if (!f.searching && tab === f.tab) return back();
    state.date = f.date;
    return go(tab, {}, { keepScroll: true });
  }
  if (tab === state.tab && !state.searching) {
    if (window.scrollY > 10) return window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tab === 'today' && state.date !== ymd()) return go('today', { date: ymd() });
    if (tab === 'diary' && state.month !== ymd().slice(0, 7)) return go('diary', { month: ymd().slice(0, 7) });
    return;
  }
  go(tab, {}, { keepScroll: true });
});
$('#searchBtn').addEventListener('click', () => {
  tap();
  setSearching(true);
});

// 大きい見出しがスクロールで隠れたら、上のバーに背景と小さい見出しを出す
const topBar = $('.top');
const onScroll = () => {
  const big = view.querySelector('.large');
  topBar.classList.toggle('scrolled', big ? big.getBoundingClientRect().bottom < topBar.offsetHeight - 28 : window.scrollY > 8);
};
window.addEventListener('scroll', onScroll, { passive: true });
// 位置を移したら、バーの見た目もすぐ合わせる
function jumpTo(y) {
  window.scrollTo(0, y);
  onScroll();
}

function render({ animate = false } = {}) {
  flushDay?.();
  flushDay = null;
  const active = state.searching ? '' : state.from ? (state.from.searching ? '' : state.from.tab) : state.tab;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === active));
  document.body.classList.toggle('searching', state.searching);
  $('#screenTitle').textContent = state.tab === 'today' ? fmtDate(state.date) : TITLES[state.tab];
  $('#saveDot').className = '';
  view.oninput = view.onkeydown = view.onchange = null;
  setFloat('');
  if (state.searching) renderSearch();
  else ({ today: renderToday, diary: renderDiary, highlights: renderHighlights, works: renderWorks, settings: renderSettings })[state.tab]();
  if (animate && !reduceMotion) {
    view.classList.remove('enter');
    void view.offsetWidth;
    view.classList.add('enter');
  }
  onScroll();
}
const largeTitle = (t, extra = '') => `<div class="large-head"><h1 class="large">${t}</h1>${extra}</div>`;
const fab = (label) => `<button class="fab" data-act="add" aria-label="${label}">${I.plus}</button>`;

/* ---------- 今日 / 日記を書く ---------- */
let saveTimer;
let flushDay = null; // 書きかけをすぐ保存する。画面を作り直す前・アプリを閉じる前に呼ぶ
const mondayOf = (s) => addDays(s, -((parseYmd(s).getDay() + 6) % 7));
function slide(el, dir) {
  if (!el || reduceMotion || !dir) return;
  el.classList.remove('slide-l', 'slide-r');
  void el.offsetWidth;
  el.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
}

// 週の帯（月〜日）。書いた日には点を付ける
function weekStrip(date) {
  const monday = mondayOf(date);
  const today = ymd();
  const byDate = new Map(db.entries.map((e) => [e.date, e]));
  const cells = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const ds = addDays(monday, i);
    const x = parseYmd(ds);
    const e = byDate.get(ds);
    const cls = ['wd', ds === date && 'sel', ds === today && 'today', ds > today && 'future', e && `has ${e.rating}`, x.getDay() === 0 && 'sun', x.getDay() === 6 && 'sat'].filter(Boolean).join(' ');
    return `<button class="${cls}" data-day="${ds}" aria-label="${fmtDate(ds)}"${ds === date ? ' aria-current="date"' : ''}><span class="w">${DOW[x.getDay()]}</span><span class="n">${x.getDate()}</span><i></i></button>`;
  }).join('');
  return `<button class="wk-nav" data-week="-1" aria-label="前の週">${I.left}</button><div class="week" id="week">${cells}</div><button class="wk-nav" data-week="1" aria-label="次の週">${I.right}</button>`;
}

function renderToday() {
  const date = state.date;
  const existing = getEntry(date);
  const e = existing ? structuredClone(existing) : { date, title: '', rating: '', events: [], feelings: '', updatedAt: '' };
  if (!e.events.length) e.events.push({ text: '', important: false });
  const d = parseYmd(date);
  const rel = relDay(date);
  const isToday = date === ymd();
  const rowHtml = (ev) => `<li class="event">
      <button class="star ${ev.important ? 'on' : ''}" aria-label="大事" aria-pressed="${ev.important}">${I.star}</button>
      <textarea class="ev" rows="1" placeholder="何があった？" enterkeyhint="next" autocomplete="off">${esc(ev.text)}</textarea>
      <button class="del" aria-label="この行を削除">${I.x}</button>
    </li>`;

  view.innerHTML = `
    <div class="day-head">
      <div class="eyebrow">${d.getFullYear()}年 ・ ${DOW[d.getDay()]}曜日${rel ? `<span class="pill ${isToday ? 'accent' : ''}">${rel}</span>` : ''}</div>
      <h1 class="large"><label>${d.getMonth() + 1}月${d.getDate()}日${I.down}<input type="date" id="pickDate" value="${date}" aria-label="日付を選ぶ"></label></h1>
    </div>
    <div class="week-wrap no-swipe" id="weekWrap">${weekStrip(date)}</div>

    <div id="dayBody">
      ${backupReminder()}
      <div id="routineCard">${routineCard(date)}</div>

      <section class="card">
        <input class="title-input" id="title" placeholder="${isToday ? '今日' : 'この日'}をひとことで" value="${esc(e.title)}" maxlength="60" enterkeyhint="next" autocomplete="off">
        <div class="mood">
          <button class="mood-btn good ${e.rating === 'good' ? 'on' : ''}" data-rate="good" aria-pressed="${e.rating === 'good'}">${I.sun}<span>いい日</span></button>
          <button class="mood-btn wasted ${e.rating === 'wasted' ? 'on' : ''}" data-rate="wasted" aria-pressed="${e.rating === 'wasted'}">${I.cloud}<span>もったいない日</span></button>
        </div>
      </section>

      <section class="card">
        <div class="card-label">できごと<span class="hint">★ で大事なことに</span></div>
        <ul class="events" id="events">${e.events.map(rowHtml).join('')}</ul>
        <button class="add-row" data-act="addEvent">${I.plus}<span>できごとを追加</span></button>
      </section>

      <section class="card">
        <div class="card-label">気持ち</div>
        <textarea class="plain-area" id="feelings" rows="3" placeholder="どう感じた？">${esc(e.feelings)}</textarea>
      </section>

      <div class="today-foot">
        <button class="soft-btn" data-act="keep">${I.bookmark}<span>この日から留める</span></button>
        <span class="save-state" id="saveState">${existing ? `${I.check}保存済み` : ''}</span>
      </div>
    </div>
  `;
  // 戻るボタン（親指が届く下側）
  setFloat(state.from ? `<button class="float-pill" data-act="back">${I.left}<span>${state.from.label}に戻る</span></button>`
    : isToday ? '' : '<button class="float-pill" data-act="today"><span>今日に戻る</span></button>');

  const list = $('#events');
  const feelings = $('#feelings');
  const rows = () => [...list.children];
  const indexOf = (el) => rows().indexOf(el.closest('.event'));
  const field = (i) => rows()[i]?.querySelector('textarea');
  const redraw = () => {
    list.innerHTML = e.events.map(rowHtml).join('');
    list.querySelectorAll('textarea').forEach(autosize);
  };
  list.querySelectorAll('textarea').forEach(autosize);
  autosize(feelings);

  const setSaved = (kind) => {
    const s = $('#saveState');
    if (s) s.innerHTML = kind === 'saving' ? '<span class="saving"></span>' : kind === 'saved' ? `${I.check}保存しました` : '';
    $('#saveDot').className = kind;
  };
  let dirty = false;
  const commit = () => {
    clearTimeout(saveTimer);
    dirty = false;
    const clean = { ...e, events: e.events.filter((x) => x.text.trim()) };
    const idx = db.entries.findIndex((x) => x.date === date);
    const empty = entryIsEmpty(clean);
    if (empty) {
      if (idx >= 0) db.entries.splice(idx, 1);
    } else {
      clean.updatedAt = nowISO();
      if (idx >= 0) db.entries[idx] = clean;
      else db.entries.push(clean);
    }
    persist();
    setSaved(empty ? '' : 'saved');
    // 週の帯の点も合わせる
    const cell = list.isConnected && $('#week .sel');
    if (cell) {
      cell.classList.toggle('has', !empty);
      cell.classList.toggle('good', !empty && e.rating === 'good');
      cell.classList.toggle('wasted', !empty && e.rating === 'wasted');
    }
  };
  const queue = () => {
    dirty = true;
    setSaved('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(commit, 500);
  };
  flushDay = () => { if (dirty) commit(); };

  // n 日ずらす、または target の日へ。作り直す前に render() が書きかけを保存する
  const changeDay = (n, target) => {
    const next = target || addDays(date, n);
    if (next === date) return;
    tap();
    state.date = next;
    render();
    const dir = next > date ? 1 : -1;
    slide($('#dayBody'), dir);
    if (mondayOf(next) !== mondayOf(date)) slide($('#week'), dir);
  };
  renderToday.changeDay = changeDay;
  onSwipe($('#weekWrap'), (n) => changeDay(7 * n));

  const insertRow = (i) => {
    e.events.splice(i, 0, { text: '', important: false });
    const tmp = document.createElement('ul');
    tmp.innerHTML = rowHtml(e.events[i]);
    const li = tmp.firstElementChild;
    li.classList.add('new');
    list.insertBefore(li, list.children[i] || null);
    li.querySelector('textarea').focus();
  };

  view.oninput = (ev) => {
    const t = ev.target;
    if (t.classList.contains('ev')) {
      if (t.value.includes('\n')) t.value = t.value.replace(/\s*\n\s*/g, ' ');
      e.events[indexOf(t)].text = t.value;
      autosize(t);
    } else if (t.id === 'title') e.title = t.value;
    else if (t === feelings) { e.feelings = t.value; autosize(t); }
    else return;
    queue();
  };
  view.onkeydown = (ev) => {
    const t = ev.target;
    const isEv = t.classList.contains('ev');
    if (isEv && ev.key === 'Backspace' && !t.value && e.events.length > 1) {
      // 空の行で消す → 行ごと消して前の行の末尾へ（先にフォーカスを移してキーボードを保つ）
      ev.preventDefault();
      const i = indexOf(t);
      const to = field(i > 0 ? i - 1 : 1);
      to.focus();
      to.setSelectionRange(to.value.length, to.value.length);
      e.events.splice(i, 1);
      t.closest('.event').remove();
      return;
    }
    if (!isEnter(ev)) return;
    if (t.id === 'title') {
      ev.preventDefault();
      field(0).focus();
    } else if (isEv) {
      ev.preventDefault();
      const i = indexOf(t);
      if (t.value.trim()) return insertRow(i + 1);
      if (i < e.events.length - 1) return field(i + 1).focus(); // 途中の空行は次の行へ
      // 最後の空行で Enter → 気持ちへ
      feelings.focus();
      if (e.events.length > 1) { e.events.splice(i, 1); t.closest('.event').remove(); }
    }
  };
  view.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    if (b.dataset.rt) {
      tap();
      toggleRoutine(date, b.dataset.rt);
      patchRoutineCard(date, b.dataset.rt);
    } else if (act === 'routines') manageRoutines();
    else if (act === 'rtToggle') toggleRoutineList(date);
    else if (b.dataset.day) changeDay(0, b.dataset.day);
    else if (b.dataset.week) changeDay(7 * Number(b.dataset.week));
    else if (b.dataset.rate) {
      tap();
      e.rating = e.rating === b.dataset.rate ? '' : b.dataset.rate;
      view.querySelectorAll('[data-rate]').forEach((c) => {
        const on = c.dataset.rate === e.rating;
        c.classList.toggle('on', on);
        c.classList.toggle('pop', on);
        c.setAttribute('aria-pressed', on);
      });
      commit();
    } else if (b.classList.contains('star')) {
      tap();
      const x = e.events[indexOf(b)];
      x.important = !x.important;
      b.classList.toggle('on', x.important);
      b.classList.toggle('pop', x.important);
      b.setAttribute('aria-pressed', x.important);
      commit();
    } else if (b.classList.contains('del')) {
      const i = indexOf(b);
      const removed = e.events[i];
      e.events.splice(i, 1);
      if (!e.events.length) e.events.push({ text: '', important: false });
      redraw();
      commit();
      if (removed.text.trim()) toast('できごとを削除しました', () => {
        if (list.isConnected) {
          // まだ同じ画面なら、その場に戻す
          e.events.splice(Math.min(i, e.events.length), 0, removed);
          redraw();
          commit();
        } else {
          let en = getEntry(date);
          if (!en) db.entries.push(en = { date, title: '', rating: '', events: [], feelings: '', updatedAt: '' });
          en.events.splice(Math.min(i, en.events.length), 0, removed);
          en.updatedAt = nowISO();
          persist();
          render();
        }
      });
    } else if (act === 'addEvent') {
      const last = e.events.length - 1;
      if (e.events[last].text.trim()) insertRow(last + 1);
      else field(last).focus();
    } else if (act === 'today') go('today', { date: ymd() });
    else if (act === 'back') back();
    else if (act === 'keep') {
      flushDay();
      editHighlight(null, date);
    } else if (act === 'backup') exportData();
    else if (act === 'snooze') {
      meta.snoozeUntil = addDays(ymd(), 3);
      saveMeta();
      $('.notice')?.remove();
    }
  };
  $('#pickDate').onchange = (ev) => {
    if (ev.target.value) changeDay(0, ev.target.value);
  };
  $('#pickDate').onclick = (ev) => {
    try { ev.target.showPicker(); } catch (_) {}
  };
}

function backupReminder() {
  if (!db.entries.length) return '';
  const last = meta.lastBackup ? meta.lastBackup.slice(0, 10) : null;
  const due = !last || addDays(last, 7) <= ymd();
  if (!due || (meta.snoozeUntil && meta.snoozeUntil > ymd())) return '';
  return `<div class="notice">
    <div><b>バックアップしませんか？</b><span>${last ? '前回から1週間たちました' : 'まだ一度も保存していません'}</span></div>
    <div class="row"><button class="link" data-act="snooze">あとで</button><button class="pill-btn" data-act="backup">保存</button></div>
  </div>`;
}

/* ---------- ルーティン ---------- */
function sortedRoutines() {
  return [...db.routines].sort((a, b) => a.sortOrder - b.sortOrder);
}
function routinesFor(date) {
  const w = parseYmd(date).getDay();
  const done = db.routineLog[date] || [];
  // 作る前の日には出さない（その日にチェックした記録があれば出す）
  const existed = (r) => !r.createdAt || done.includes(r.id) || ymd(new Date(r.createdAt)) <= date;
  return sortedRoutines().filter((r) => (!r.days.length || r.days.includes(w)) && existed(r));
}
function routineProgress(date) {
  const list = routinesFor(date);
  const done = new Set(db.routineLog[date] || []);
  return { list, done, count: list.filter((r) => done.has(r.id)).length };
}
function toggleRoutine(date, id) {
  const set = new Set(db.routineLog[date] || []);
  set.has(id) ? set.delete(id) : set.add(id);
  if (set.size) db.routineLog[date] = [...set];
  else delete db.routineLog[date];
  persist();
}
function daysLabel(days) {
  if (!days.length || days.length === 7) return '毎日';
  const k = [...days].sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b));
  if (k.join() === '1,2,3,4,5') return '平日';
  if (k.join() === '6,0') return '週末';
  return k.map((d) => DOW[d]).join('・');
}
const RING = 44;
const RING_C = 2 * Math.PI * ((RING - 6) / 2);
function ring(p) {
  const r = (RING - 6) / 2;
  return `<svg class="ring" viewBox="0 0 ${RING} ${RING}" width="${RING}" height="${RING}">
    <circle cx="${RING / 2}" cy="${RING / 2}" r="${r}" class="ring-bg"/>
    <circle cx="${RING / 2}" cy="${RING / 2}" r="${r}" class="ring-fg" stroke-dasharray="${RING_C}" style="stroke-dashoffset:${RING_C * (1 - p)}"/>
  </svg>`;
}
// 一覧を開くか閉じるか。何もしなければ「全部できたら閉じる」。見出しをタップすると日ごとに切り替えられる
const rtView = {};
let rtTimer;
const rtCollapsed = (date, all) => (rtView[date] ? rtView[date] === 'closed' : all);
const rtSub = (count, total) => (count === total ? '全部できました' : `あと${total - count}つ`);
const rtNum = (count, total) => (count === total ? I.check : `${count}/${total}`);

function routineCard(date) {
  if (!db.routines.length) {
    return `<button class="card rt-empty" data-act="routines">
      <span class="rt-empty-icon">${I.check}</span>
      <span class="grow"><b>ルーティンを作る</b><span class="muted">毎日やることをチェックリストに</span></span>
      ${I.right}
    </button>`;
  }
  const { list, done, count } = routineProgress(date);
  if (!list.length) {
    if (date < ymd()) return ''; // 過去の日は、何も無ければ出さない
    return `<div class="card rt-card"><div class="rt-top"><span class="muted grow">この日のルーティンはありません</span><button class="link" data-act="routines">編集</button></div></div>`;
  }
  const all = count === list.length;
  const closed = rtCollapsed(date, all);
  return `<section class="card rt-card ${all ? 'all' : ''} ${closed ? 'collapsed' : ''}">
    <div class="rt-top">
      <button class="rt-summary" data-act="rtToggle" aria-expanded="${!closed}">
        <span class="ring-wrap">${ring(count / list.length)}<span class="ring-num">${rtNum(count, list.length)}</span></span>
        <span class="grow"><b>ルーティン<span class="rt-chev">${I.down}</span></b><span class="muted rt-sub">${rtSub(count, list.length)}</span></span>
      </button>
      <button class="link" data-act="routines">編集</button>
    </div>
    <div class="rt-body"${closed ? ' inert' : ''}><ul class="rt-list">${list.map((r) => `
      <li><button class="rt-item ${done.has(r.id) ? 'on' : ''}" data-rt="${r.id}" aria-pressed="${done.has(r.id)}">
        <span class="rt-check">${I.check}</span>
        <span class="grow">${esc(r.title)}</span>
      </button></li>`).join('')}
    </ul></div>
  </section>`;
}
function setRtCollapsed(card, closed) {
  card.classList.toggle('collapsed', closed);
  card.querySelector('.rt-summary').setAttribute('aria-expanded', !closed);
  card.querySelector('.rt-body').toggleAttribute('inert', closed);
}
function toggleRoutineList(date) {
  const card = $('#routineCard .rt-card');
  if (!card?.querySelector('.rt-body')) return;
  const closed = !card.classList.contains('collapsed');
  rtView[date] = closed ? 'closed' : 'open';
  clearTimeout(rtTimer);
  tap();
  setRtCollapsed(card, closed);
}
// チェックのたびに作り直さず、その場で書き換える（輪がなめらかに進む）
function patchRoutineCard(date, id) {
  const card = $('#routineCard .rt-card');
  const { list, done, count } = routineProgress(date);
  const all = count === list.length;
  const item = card.querySelector(`[data-rt="${id}"]`);
  item.classList.toggle('on', done.has(id));
  item.classList.toggle('pop', done.has(id));
  item.setAttribute('aria-pressed', done.has(id));
  card.querySelector('.ring-fg').style.strokeDashoffset = RING_C * (1 - count / list.length);
  card.querySelector('.ring-num').innerHTML = rtNum(count, list.length);
  card.querySelector('.rt-sub').textContent = rtSub(count, list.length);
  card.classList.toggle('all', all);
  const wrap = card.querySelector('.ring-wrap');
  wrap.classList.remove('burst');
  clearTimeout(rtTimer);
  if (!all) return;
  void wrap.offsetWidth;
  wrap.classList.add('burst');
  // できた様子を少し見せてからたたむ
  if (!rtView[date]) rtTimer = setTimeout(() => { if (card.isConnected && card.classList.contains('all')) setRtCollapsed(card, true); }, 900);
}
function refreshAfterRoutineEdit() {
  persist();
  if (state.tab === 'today' && !state.searching) {
    const c = $('#routineCard');
    if (c) c.innerHTML = routineCard(state.date);
  } else render();
}
function manageRoutines(focusInput = false) {
  const list = sortedRoutines();
  openSheet(`
    <h2>ルーティン</h2>
    ${list.length ? `<ul class="sheet-list" id="rtManage">${list.map((r) => `
      <li data-key="${r.id}">
        <span class="handle" aria-label="並べ替え">${I.grip}</span>
        <button class="grow open" value="edit:${r.id}" formnovalidate><span>${esc(r.title)}</span><span class="muted">${daysLabel(r.days)}</span></button>
        ${I.right}
      </li>`).join('')}</ul><p class="muted tiny">左のつまみをつかんで動かすと並べ替え</p>` : '<p class="muted">例：ストレッチ、英語30分、日記を書く</p>'}
    <div class="add-line"><input class="field" name="title" placeholder="新しいルーティン" enterkeyhint="done" autocomplete="off"><button class="pill-btn" value="add">追加</button></div>
    <div class="sheet-actions"><button class="btn" value="cancel" formnovalidate>完了</button></div>
  `, (action, fd) => {
    if (!action || action === 'add') {
      const title = (fd.get('title') || '').trim();
      if (!title) return true;
      db.routines.push({ id: uid(), title, days: [], sortOrder: Math.max(-1, ...db.routines.map((r) => r.sortOrder)) + 1, createdAt: nowISO() });
      tap();
    } else {
      const [cmd, id] = action.split(':');
      if (cmd === 'edit') { editRoutine(id); return true; }
    }
    refreshAfterRoutineEdit();
    manageRoutines(true);
    return true;
  }, { autofocus: focusInput || !list.length });
  sheetForm.querySelector('[name=title]').addEventListener('keydown', (ev) => {
    if (isEnter(ev)) {
      ev.preventDefault();
      sheetForm.querySelector('[value=add]').click();
    }
  });
  const ul = $('#rtManage');
  if (ul) enableDrag(ul, 'li', (ids) => {
    ids.forEach((id, k) => { const r = db.routines.find((x) => x.id === id); if (r) r.sortOrder = k; });
    refreshAfterRoutineEdit();
  });
}
function editRoutine(id) {
  const r = db.routines.find((x) => x.id === id);
  openSheet(`
    <h2>ルーティンを編集</h2>
    <input class="field" name="title" value="${esc(r.title)}" required autocomplete="off">
    <div class="field-label">やる曜日<span class="muted">選ばなければ毎日</span></div>
    <div class="choice week">
      ${WEEK_ORDER.map((d) => `<label class="${r.days.includes(d) ? 'on' : ''} ${d === 0 ? 'sun' : d === 6 ? 'sat' : ''}"><input type="checkbox" name="days" value="${d}" ${r.days.includes(d) ? 'checked' : ''}>${DOW[d]}</label>`).join('')}
    </div>
    <div class="sheet-actions">
      <button class="icon-danger" value="delete" formnovalidate aria-label="削除">${I.trash}</button>
      <button class="btn plain" value="back" formnovalidate>戻る</button>
      <button class="btn" value="save">保存</button>
    </div>`, (action, fd) => {
    if (action === 'delete') {
      const snapshot = structuredClone(db);
      db.routines = db.routines.filter((x) => x.id !== id);
      toast(`「${r.title}」を削除しました`, () => { db = snapshot; persist(); render(); });
    } else if (action === 'save') {
      const title = fd.get('title').trim();
      if (!title) return true;
      r.title = title;
      r.days = fd.getAll('days').map(Number);
      if (r.days.length === 7) r.days = [];
    }
    refreshAfterRoutineEdit();
    manageRoutines();
    return true;
  }, { autofocus: false });
  chipRadios();
}

/* ---------- 日記一覧 ---------- */
function streak() {
  const set = new Set(db.entries.map((e) => e.date));
  let d = set.has(ymd()) ? ymd() : addDays(ymd(), -1);
  let n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

function renderDiary() {
  const [y, m] = state.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const byDate = Object.fromEntries(db.entries.map((e) => [e.date, e]));
  const today = ymd();

  let cal = WEEK_ORDER.map((d) => `<div class="dow ${d === 0 ? 'sun' : d === 6 ? 'sat' : ''}">${DOW[d]}</div>`).join('');
  cal += '<div></div>'.repeat((first.getDay() + 6) % 7);
  for (let i = 1; i <= days; i++) {
    const ds = `${state.month}-${String(i).padStart(2, '0')}`;
    const e = byDate[ds];
    const star = e?.events.some((x) => x.important);
    const rp = db.routineLog[ds] ? routineProgress(ds) : null;
    const allDone = rp && rp.list.length && rp.count === rp.list.length;
    const cls = ['d', e ? 'has' : '', e?.rating || '', ds === today ? 'today' : '', ds > today ? 'future' : ''].join(' ');
    cal += `<button class="${cls}" data-date="${ds}" aria-label="${fmtDate(ds)}"><span class="n">${i}</span><span class="marks">${star ? '<i class="m-star"></i>' : ''}${allDone ? '<i class="m-rt"></i>' : ''}</span></button>`;
  }

  const f = state.diaryFilter;
  const monthEntries = db.entries.filter((e) => e.date.startsWith(state.month));
  const list = sortedEntries().filter((e) => e.date.startsWith(state.month)).filter((e) =>
    f === 'all' ? true : f === 'star' ? e.events.some((x) => x.important) : e.rating === f);
  const isThisMonth = state.month === today.slice(0, 7);

  view.innerHTML = `
    ${largeTitle('日記')}
    <div class="stats">
      <div class="stat"><b>${db.entries.length}</b><span>書いた日</span></div>
      <div class="stat"><b>${streak()}<small>日</small></b><span>連続</span></div>
      <div class="stat good"><b>${monthEntries.filter((e) => e.rating === 'good').length}</b><span>${m}月のいい日</span></div>
    </div>
    <section class="card cal-card" id="calCard">
      <div class="month-head">
        <button class="round" data-m="-1" aria-label="前の月">${I.left}</button>
        <span class="m">${y}年 ${m}月</span>
        <button class="round" data-m="1" aria-label="次の月">${I.right}</button>
      </div>
      <div class="cal">${cal}</div>
      <div class="legend"><span><i class="lg good"></i>いい日</span><span><i class="lg wasted"></i>もったいない日</span><span><i class="m-star"></i>大事</span><span><i class="m-rt"></i>ルーティン達成</span></div>
      ${isThisMonth ? '' : '<button class="link center" data-act="thisMonth">今月に戻る</button>'}
    </section>
    <div class="chips fit">
      ${[['all', 'すべて'], ['good', 'いい日'], ['wasted', 'もったいない日'], ['star', '★ 大事']].map(([k, l]) =>
        `<button class="chip ${k} ${f === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}
    </div>
    <div class="entry-list">
      ${list.length ? list.map((e) => entryCard(e)).join('') : `<div class="empty">${I.pen}<p>${f === 'all' ? 'この月の日記はまだありません' : '該当する日記はありません'}</p></div>`}
    </div>
  `;
  const shiftMonth = (n) => {
    tap();
    state.month = ymd(new Date(y, m - 1 + n, 1)).slice(0, 7);
    render();
    slide($('#calCard'), n);
  };
  onSwipe($('#calCard'), shiftMonth);
  view.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.date) openDay(b.dataset.date);
    else if (b.dataset.m) shiftMonth(Number(b.dataset.m));
    else if (b.dataset.act === 'thisMonth') { state.month = today.slice(0, 7); render(); }
    else if (b.dataset.f) { tap(); state.diaryFilter = b.dataset.f; render(); }
  };
}

function entryCard(e, q) {
  const hl = (s) => (q ? highlight(s, q) : esc(s));
  const d = parseYmd(e.date);
  const evs = e.events.filter((x) => x.text);
  // できごとが無い日は、気持ちの書き出しを見せる
  const preview = evs.length
    ? evs.map((x) => (x.important ? '<i class="ev-star">★</i>' : '') + hl(x.text)).join('<span class="sep">・</span>')
    : !q && e.feelings ? esc(e.feelings) : '';
  return `<button class="entry ${e.rating}" data-date="${e.date}">
    <span class="entry-date"><b>${d.getDate()}</b><span>${DOW[d.getDay()]}</span></span>
    <span class="entry-body">
      <span class="entry-title"><span class="t">${hl(e.title || '（無題）')}</span>${e.rating ? `<span class="tag ${e.rating}">${RATINGS[e.rating]}</span>` : ''}</span>
      ${preview ? `<span class="entry-ev">${preview}</span>` : ''}
      ${q && e.feelings ? `<span class="entry-ev">${hl(e.feelings)}</span>` : ''}
      ${q ? `<span class="entry-sub">${d.getFullYear()}年${d.getMonth() + 1}月</span>` : ''}
    </span>
  </button>`;
}

/* ---------- 留める ---------- */
function renderHighlights() {
  const f = state.hlFilter;
  const list = [...db.highlights].filter((h) => f === 'all' || h.kind === f).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  view.innerHTML = `
    ${largeTitle('留める')}
    <div class="segment">
      ${[['all', 'すべて'], ['idea', 'アイデア'], ['mindset', '心構え']].map(([k, l]) =>
        `<button class="${f === k ? 'on' : ''}" data-f="${k}">${l}<small>${k === 'all' ? db.highlights.length : db.highlights.filter((h) => h.kind === k).length}</small></button>`).join('')}
    </div>
    ${list.length ? list.map((h) => hlCard(h)).join('') : `<div class="empty">${I.bookmark}<p>心に留めておきたいことを<br>残しておきましょう</p></div>`}
  `;
  setFloat(fab('留める'));
  view.onclick = (ev) => {
    const b = ev.target.closest('button, .hl[data-id]');
    if (!b) return;
    if (b.dataset.f) { tap(); state.hlFilter = b.dataset.f; render(); }
    else if (b.dataset.act === 'add') editHighlight(null, '');
    else if (b.dataset.src) openDay(b.dataset.src);
    else if (b.dataset.id) editHighlight(b.dataset.id);
  };
}
function hlCard(h, q) {
  return `<article class="hl ${h.kind}" data-id="${h.id}">
    <div class="hl-text">${q ? highlight(h.text, q) : esc(h.text)}</div>
    <div class="hl-foot">
      <span class="tag ${h.kind}">${KINDS[h.kind] || h.kind}</span>
      ${h.sourceDate ? `<button class="link" data-src="${h.sourceDate}">${fmtDate(h.sourceDate)} ${I.right}</button>` : ''}
    </div>
  </article>`;
}
function editHighlight(id, sourceDate = '') {
  const h = id ? db.highlights.find((x) => x.id === id) : { kind: 'idea', text: '', sourceDate };
  openSheet(`
    <h2>${id ? '留めたこと' : '留める'}</h2>
    <textarea class="field big" name="text" rows="3" placeholder="忘れたくないこと">${esc(h.text)}</textarea>
    <div class="choice seg">
      ${Object.entries(KINDS).map(([k, l]) => `<label class="${h.kind === k ? 'on' : ''}"><input type="radio" name="kind" value="${k}" ${h.kind === k ? 'checked' : ''}>${l}</label>`).join('')}
    </div>
    <label class="field-row"><span>元の日記</span><input type="date" name="sourceDate" value="${esc(h.sourceDate || '')}"></label>
    <div class="sheet-actions">
      ${id ? `<button class="icon-danger" value="delete" formnovalidate aria-label="削除">${I.trash}</button>` : ''}
      <button class="btn plain" value="cancel" formnovalidate>キャンセル</button>
      <button class="btn" value="save">保存</button>
    </div>`, (action, fd) => {
    if (action === 'delete') {
      undoable('削除しました', () => { db.highlights = db.highlights.filter((x) => x.id !== id); });
      return;
    }
    const text = fd.get('text').trim();
    if (!text) { toast('内容を入力してください'); return true; }
    const data = { text, kind: fd.get('kind'), sourceDate: fd.get('sourceDate') || '' };
    if (id) Object.assign(h, data);
    else db.highlights.push({ id: uid(), ...data, createdAt: nowISO() });
    persist();
    tap();
    toast(id ? '保存しました' : '留めました');
    if (state.tab === 'highlights' || state.searching) render();
  });
  chipRadios();
}

/* ---------- 作品 ---------- */
function renderWorks() {
  const cat = state.workCat;
  const counts = Object.fromEntries(CATEGORIES.map(([k]) => [k, db.works.filter((w) => w.category === k).length]));
  const shown = CATEGORIES.filter(([k]) => counts[k] || k === cat || k !== 'other').map(([k]) => k);
  const inCat = db.works.filter((w) => w.category === cat);
  const groups = RANKS.map(([r, label]) => {
    const items = inCat.filter((w) => (w.rank || '') === r).sort((a, b) => a.sortOrder - b.sortOrder);
    if (!items.length) return '';
    return `<div class="rank-head"><span class="medal ${r || 'none'}">${r ? label : '–'}</span>${label}<small>${items.length}</small></div>
      <ul class="card work-list" data-rank="${r}">${items.map((w) => `
        <li class="work" data-key="${w.id}">
          <button class="open grow" data-id="${w.id}">
            <span class="ttl">${esc(w.title)}</span>
            ${w.review ? `<span class="rv">${esc(w.review)}</span>` : ''}
          </button>
          <span class="handle" aria-label="並べ替え">${I.grip}</span>
        </li>`).join('')}</ul>`;
  }).join('');

  view.innerHTML = `
    ${largeTitle('作品', `<span class="large-sub">${db.works.length}本</span>`)}
    <div id="chipsAnchor"></div>
    <div class="chips sticky-chips">
      ${shown.map((k) => `<button class="chip ${cat === k ? 'on' : ''}" data-cat="${k}">${CAT[k]}<small>${counts[k]}</small></button>`).join('')}
    </div>
    <div id="workBody">${groups || `<div class="empty">${I.film}<p>観た・読んだ作品を<br>記録しましょう</p></div>`}</div>
  `;
  setFloat(fab('作品を追加'));
  view.querySelectorAll('.work-list').forEach((ul) => enableDrag(ul, 'li', (ids) => {
    ids.forEach((id, k) => { const w = db.works.find((x) => x.id === id); if (w) w.sortOrder = k; });
    persist();
  }));
  // 選択中のジャンルを見える位置へ
  view.querySelector('.chip.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  const setCat = (k) => {
    if (k === cat) return;
    tap();
    state.workCat = k;
    render();
    // 一覧の先頭から見せる（ジャンルの帯は上に貼りついたまま）
    const y = $('#chipsAnchor').offsetTop - topBar.offsetHeight;
    if (window.scrollY > y) window.scrollTo(0, y);
    slide($('#workBody'), shown.indexOf(k) - shown.indexOf(cat));
  };
  renderWorks.swipe = (n) => {
    const k = shown[shown.indexOf(cat) + n];
    if (k) setCat(k);
  };
  view.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.cat) setCat(b.dataset.cat);
    else if (b.dataset.act === 'add') editWork(null);
    else if (b.dataset.id) editWork(b.dataset.id);
  };
}
function groupOf(w) {
  return db.works.filter((x) => x.category === w.category && (x.rank || '') === (w.rank || '')).sort((a, b) => a.sortOrder - b.sortOrder);
}
function editWork(id) {
  const w = id ? db.works.find((x) => x.id === id) : { title: '', category: state.workCat, rank: '', review: '', sourceDate: '' };
  openSheet(`
    <h2>${id ? '作品を編集' : '作品を追加'}</h2>
    <input class="field big" name="title" placeholder="タイトル" value="${esc(w.title)}" required autocomplete="off">
    <div class="choice medals">
      ${RANKS.map(([k, l]) => `<label class="${(w.rank || '') === k ? 'on' : ''} r-${k || 'none'}"><input type="radio" name="rank" value="${k}" ${(w.rank || '') === k ? 'checked' : ''}><span class="medal ${k || 'none'}">${k ? l : '–'}</span>${k ? '' : '未評価'}</label>`).join('')}
    </div>
    <label class="field-row"><span>ジャンル</span><select name="category">${CATEGORIES.map(([k, l]) => `<option value="${k}" ${w.category === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <textarea class="field" name="review" rows="2" placeholder="感想（任意）">${esc(w.review)}</textarea>
    <label class="field-row"><span>観た・読んだ日</span><input type="date" name="sourceDate" value="${esc(w.sourceDate || '')}"></label>
    <div class="sheet-actions">
      ${id ? `<button class="icon-danger" value="delete" formnovalidate aria-label="削除">${I.trash}</button>` : ''}
      <button class="btn plain" value="cancel" formnovalidate>キャンセル</button>
      <button class="btn" value="save">保存</button>
    </div>`, (action, fd) => {
    if (action === 'delete') {
      undoable(`「${w.title}」を削除しました`, () => { db.works = db.works.filter((x) => x.id !== id); });
      return;
    }
    const title = fd.get('title').trim();
    if (!title) return true;
    const data = { title, category: fd.get('category'), rank: fd.get('rank') || '', review: fd.get('review').trim(), sourceDate: fd.get('sourceDate') || '' };
    const moved = !id || data.category !== w.category || data.rank !== (w.rank || '');
    if (id) Object.assign(w, data, { updatedAt: nowISO() });
    else db.works.push(Object.assign(w, data, { id: uid(), createdAt: nowISO(), updatedAt: nowISO() }));
    if (moved) w.sortOrder = Math.max(-1, ...groupOf(w).filter((x) => x !== w).map((x) => x.sortOrder)) + 1;
    state.workCat = data.category;
    persist();
    tap();
    toast('保存しました');
    render();
  });
  chipRadios();
}

/* ---------- 検索 ---------- */
function highlight(text, q) {
  const s = String(text ?? '');
  const i = s.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return esc(s);
  return esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length));
}
function renderSearch() {
  view.innerHTML = `
    <div class="search-box">
      <span class="search-field">${I.search}<input id="q" type="search" placeholder="日記・留めたこと・作品" value="${esc(state.query)}" enterkeyhint="search" autocomplete="off" autocapitalize="off"><button class="clear" data-act="clear" aria-label="入力を消す">${I.x}</button></span>
      <button class="link" data-act="close">キャンセル</button>
    </div>
    <div id="results"></div>`;
  const draw = () => {
    const q = state.query.trim();
    const r = $('#results');
    view.querySelector('.clear').hidden = !state.query;
    if (!q) { r.innerHTML = `<div class="empty">${I.search}<p>キーワードで全部を探せます</p></div>`; return; }
    const lq = q.toLowerCase();
    const has = (...xs) => xs.some((x) => String(x ?? '').toLowerCase().includes(lq));
    const es = sortedEntries().filter((e) => has(e.title, e.feelings, ...e.events.map((x) => x.text)));
    const hs = db.highlights.filter((h) => has(h.text));
    const ws = db.works.filter((w) => has(w.title, w.review));
    r.innerHTML = (es.length ? `<div class="section-label">日記<small>${es.length}</small></div><div class="entry-list">${es.map((e) => entryCard(e, q)).join('')}</div>` : '')
      + (hs.length ? `<div class="section-label">留める<small>${hs.length}</small></div>${hs.map((h) => hlCard(h, q)).join('')}` : '')
      + (ws.length ? `<div class="section-label">作品<small>${ws.length}</small></div><ul class="card work-list">${ws.map((w) => `<li class="work"><span class="medal ${w.rank || 'none'}">${w.rank ? RANK[w.rank] : '–'}</span><button class="open grow" data-work="${w.id}"><span class="ttl">${highlight(w.title, q)}</span><span class="rv">${CAT[w.category] || ''}${w.review ? ' ・ ' + highlight(w.review, q) : ''}</span></button></li>`).join('')}</ul>` : '')
      || `<div class="empty">${I.search}<p>「${esc(q)}」は見つかりませんでした</p></div>`;
  };
  draw();
  view.oninput = (ev) => { if (ev.target.id === 'q') { state.query = ev.target.value; draw(); } };
  view.onkeydown = (ev) => { if (isEnter(ev)) ev.target.blur(); };
  view.onclick = (ev) => {
    const b = ev.target.closest('button, .hl[data-id]');
    if (!b) return;
    if (b.dataset.act === 'close') setSearching(false);
    else if (b.dataset.act === 'clear') { state.query = ''; $('#q').value = ''; draw(); $('#q').focus(); }
    else if (b.dataset.date) openDay(b.dataset.date);
    else if (b.dataset.src) openDay(b.dataset.src);
    else if (b.dataset.work) editWork(b.dataset.work);
    else if (b.dataset.id) editHighlight(b.dataset.id);
  };
}

/* ---------- 設定・バックアップ ---------- */
function renderSettings() {
  const last = meta.lastBackup ? new Date(meta.lastBackup).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }) : 'まだありません';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  view.innerHTML = `
    ${largeTitle('設定')}
    <div class="stats">
      <div class="stat"><b>${db.entries.length}</b><span>日記</span></div>
      <div class="stat"><b>${db.highlights.length}</b><span>留める</span></div>
      <div class="stat"><b>${db.works.length}</b><span>作品</span></div>
    </div>
    ${iOS && !standalone ? `<div class="notice tall"><div><b>ホーム画面に追加しましょう</b><span>共有ボタン →「ホーム画面に追加」で、アプリのように全画面で開けます。Safariのままだと、しばらく使わないあいだにデータが消されることがあります。</span></div></div>` : ''}
    <div class="section-label">ルーティン</div>
    <div class="group">
      <button class="group-row" data-act="routines"><span class="gi good">${I.check}</span><span class="grow">ルーティンを編集<small>${db.routines.length ? `${db.routines.length}件` : 'まだありません'}</small></span>${I.right}</button>
    </div>
    <div class="section-label">バックアップ</div>
    <div class="group">
      <button class="group-row" data-act="export"><span class="gi accent">${I.share}</span><span class="grow">バックアップを保存<small>最終：${last}</small></span>${I.right}</button>
      <button class="group-row" data-act="import"><span class="gi">${I.download}</span><span class="grow">バックアップから読み込む<small>旧アプリ「日々」のファイルもOK</small></span>${I.right}</button>
    </div>
    <p class="foot-note">データはこの端末の中だけに保存されます。機種変更やSafariのデータ削除に備えて、「ファイル」アプリやGoogleドライブにバックアップしてください。</p>
    <div class="group">
      <button class="group-row danger" data-act="wipe"><span class="gi danger">${I.trash}</span><span class="grow">すべてのデータを消去</span></button>
    </div>
    <p class="foot-note center">日々 ・ オフライン日記</p>
  `;
  view.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'export') exportData();
    else if (act === 'import') $('#fileInput').click();
    else if (act === 'routines') manageRoutines();
    else if (act === 'wipe') {
      if (!confirm('すべての日記・留めたこと・作品・ルーティンを消去します。先にバックアップしましたか？')) return;
      undoable('すべて消去しました', () => { db = emptyDb(); });
    }
  };
}

async function exportData() {
  const payload = { app: 'hibi-diary', version: 10, exportedAt: nowISO(), ...db };
  const json = JSON.stringify(payload, null, 2);
  const name = `日々-${ymd()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    meta.lastBackup = nowISO();
    delete meta.snoozeUntil;
    saveMeta();
    toast('バックアップしました');
    render();
  } catch (err) {
    if (err.name !== 'AbortError') toast('保存できませんでした');
  }
}

function normalize(data) {
  if (!data || !Array.isArray(data.entries)) throw new Error('形式が違います');
  return {
    entries: data.entries.filter((e) => e && e.date).map((e) => ({
      date: e.date,
      title: e.title || '',
      rating: e.rating || '',
      events: (e.events || []).map((x) => (typeof x === 'string' ? { text: x, important: false } : { text: x.text || '', important: !!x.important })),
      feelings: e.feelings || '',
      updatedAt: e.updatedAt || nowISO(),
    })),
    highlights: (data.highlights || []).map((h) => ({ id: h.id || uid(), text: h.text || '', kind: h.kind || 'idea', sourceDate: h.sourceDate || '', createdAt: h.createdAt || nowISO() })),
    works: (data.works || []).map((w, i) => ({
      id: w.id || uid(), category: w.category || 'other', title: w.title || '', review: w.review || '',
      sourceDate: w.sourceDate || '', rank: w.rank || '', sortOrder: Number.isFinite(w.sortOrder) ? w.sortOrder : i,
      createdAt: w.createdAt || nowISO(), updatedAt: w.updatedAt || w.createdAt || nowISO(),
    })),
    routines: (data.routines || []).filter((r) => r && r.title).map((r, i) => ({
      id: r.id || uid(), title: r.title, days: Array.isArray(r.days) ? r.days.filter((d) => d >= 0 && d <= 6) : [],
      sortOrder: Number.isFinite(r.sortOrder) ? r.sortOrder : i, createdAt: r.createdAt || nowISO(),
    })),
    routineLog: data.routineLog && typeof data.routineLog === 'object' ? Object.fromEntries(
      Object.entries(data.routineLog).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, [...new Set(v)]])) : {},
  };
}

function importData(data, mode) {
  const inc = normalize(data);
  if (mode === 'replace') {
    db = inc;
  } else {
    const byDate = new Map(db.entries.map((e) => [e.date, e]));
    for (const e of inc.entries) {
      const cur = byDate.get(e.date);
      if (!cur || (e.updatedAt || '') > (cur.updatedAt || '')) byDate.set(e.date, e);
    }
    db.entries = [...byDate.values()];
    const hl = new Map(db.highlights.map((h) => [h.id, h]));
    inc.highlights.forEach((h) => { if (!hl.has(h.id)) hl.set(h.id, h); });
    db.highlights = [...hl.values()];
    const wk = new Map(db.works.map((w) => [w.id, w]));
    inc.works.forEach((w) => {
      const cur = wk.get(w.id);
      if (!cur || w.updatedAt > cur.updatedAt) wk.set(w.id, w);
    });
    db.works = [...wk.values()];
    const rt = new Map(db.routines.map((r) => [r.id, r]));
    inc.routines.forEach((r) => { if (!rt.has(r.id)) rt.set(r.id, r); });
    db.routines = [...rt.values()];
    for (const [d, ids] of Object.entries(inc.routineLog)) {
      db.routineLog[d] = [...new Set([...(db.routineLog[d] || []), ...ids])];
    }
  }
  persist();
  return inc;
}

$('#fileInput').addEventListener('change', async (ev) => {
  const f = ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  let data;
  try {
    data = JSON.parse(await f.text());
    normalize(data);
  } catch (_) {
    toast('読み込めないファイルです');
    return;
  }
  const empty = !db.entries.length && !db.highlights.length && !db.works.length;
  openSheet(`
    <h2>バックアップを読み込む</h2>
    <div class="import-file"><b>${esc(f.name)}</b>
      <div class="stats mini">
        <div class="stat"><b>${data.entries.length}</b><span>日記</span></div>
        <div class="stat"><b>${(data.highlights || []).length}</b><span>留める</span></div>
        <div class="stat"><b>${(data.works || []).length}</b><span>作品</span></div>
      </div>
    </div>
    ${empty ? '' : '<p class="muted">「追加」は今のデータを残して足します（同じ日の日記は新しい方を残します）。「置き換え」は今のデータと入れ替えます。</p>'}
    <div class="sheet-actions">
      <button class="btn plain" value="cancel" formnovalidate>やめる</button>
      ${empty ? '<button class="btn" value="merge">読み込む</button>' : '<button class="btn plain danger-text" value="replace">置き換え</button><button class="btn" value="merge">追加</button>'}
    </div>`, (action) => {
    const snapshot = structuredClone(db);
    importData(data, action);
    render();
    toast('読み込みました', empty ? null : () => { db = snapshot; persist(); render(); });
  }, { autofocus: false });
});

/* ---------- 開発中の自動更新 ----------
   アドレスの末尾に ?dev=1 を付けて一度開くと、Mac でファイルを保存するたびに
   この画面が自動で開き直す（見ていた場所に戻る）。?dev=0 を付けて開くと解除。
   ふだんの使い方では何も起きない */
const DEV = (() => {
  const q = new URLSearchParams(location.search);
  if (q.has('dev')) {
    if (q.get('dev') === '0') localStorage.removeItem('hibi-dev');
    else localStorage.setItem('hibi-dev', '1');
    history.replaceState(null, '', location.pathname);
  }
  return !!localStorage.getItem('hibi-dev');
})();
// サーバーはファイルが変わるまで返事をしない。変わったら書きかけを保存して開き直す。
// 前回の時刻を送るので、スマホを閉じているあいだの変更も取りこぼさない
let devStamp = '';
function devWatch() {
  fetch(`__wait?since=${devStamp}`, { cache: 'no-store' })
    .then((r) => r.text())
    .then((t) => {
      const [status, stamp] = t.trim().split(' ');
      devStamp = stamp || '';
      if (status !== 'changed') return devWatch();
      flushDay?.();
      sessionStorage.setItem('hibi-dev-back', JSON.stringify({ ...state, y: window.scrollY }));
      location.reload();
    })
    .catch(() => setTimeout(devWatch, 2000));
}

/* ---------- start ---------- */
onSwipe(view, (n) => {
  if (state.searching || sheet.open) return;
  if (state.tab === 'today') renderToday.changeDay?.(n);
  else if (state.tab === 'works') renderWorks.swipe?.(n);
}, '.no-swipe');
// 日付が変わったら「今日」を更新。アプリを閉じる前には書きかけを保存
let lastDay = ymd();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') return flushDay?.();
  if (ymd() !== lastDay) {
    if (state.tab === 'today' && state.date === lastDay && !state.from) state.date = ymd();
    lastDay = ymd();
    render();
  }
});
window.addEventListener('pagehide', () => flushDay?.());
// 画面の向きや幅が変わったら、入力欄の高さを測り直す
window.addEventListener('resize', () => document.querySelectorAll('#view textarea, #sheetForm textarea').forEach(autosize));
if (DEV) {
  // 開き直す前に見ていた画面・位置に戻す
  const back = sessionStorage.getItem('hibi-dev-back');
  sessionStorage.removeItem('hibi-dev-back');
  if (back) { try { Object.assign(state, JSON.parse(back)); } catch (_) {} }
  render();
  if (state.y) { window.scrollTo(0, state.y); onScroll(); }
  if (back) toast('更新しました');
  devWatch();
} else {
  render();
}
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // 開発中はキャッシュを使わない（古い画面が出ないように）
  if (DEV) navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  else navigator.serviceWorker.register('sw.js').catch(() => {});
}
// 端末の保存領域を消されにくくする
navigator.storage?.persist?.();
