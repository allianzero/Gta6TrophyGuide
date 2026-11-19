// Leonida Trophy Guide — offline tracker for the 55 GTA VI trophies.
// Loads its data from data/trophies.json and data/roadmap.json (same folder,
// no network), saves earned trophies in localStorage, and exports/imports
// that progress as a file. No libraries.
const EARNED_KEY = 'gta6-trophy-guide-earned-v1';
const REVEALED_KEY = 'gta6-trophy-guide-revealed-v1';
const KINDS = [
  ['all', 'All'],
  ['story', 'Story'],
  ['missable', 'Missable'],
  ['collectibles', 'Collectibles'],
  ['activities', 'Activities'],
  ['crime', 'Crime'],
  ['world', 'World'],
  ['online', 'Online'],
];

const state = {
  trophies: [],
  roadmap: null,
  earned: new Set(readStoredIds(EARNED_KEY)),
  revealed: new Set(readStoredIds(REVEALED_KEY)),
  kind: 'all',
  grade: 'all',
  query: '',
  earnedOnly: false,
  spoilers: true,
  selectedId: null,
};

const $ = (id) => document.getElementById(id);
const listEl = $('trophyList');
const detailEl = $('detail');

function readStoredIds(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

function saveEarnedProgress() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...state.earned].sort((a, b) => a - b)));
}

function saveRevealedProgress() {
  localStorage.setItem(REVEALED_KEY, JSON.stringify([...state.revealed].sort((a, b) => a - b)));
}

async function loadGuideData() {
  const [trophiesRes, roadmapRes] = await Promise.all([
    fetch('data/trophies.json'),
    fetch('data/roadmap.json'),
  ]);
  const trophiesDoc = await trophiesRes.json();
  state.trophies = trophiesDoc.trophies;
  state.roadmap = await roadmapRes.json();
}

function trophyById(id) {
  return state.trophies.find((t) => t.id === id);
}

function trophyIsMasked(trophy) {
  return state.spoilers && trophy.hidden && !state.earned.has(trophy.id) && !state.revealed.has(trophy.id);
}

function trophyMatchesFilters(trophy) {
  if (state.kind === 'missable' && !trophy.missable) return false;
  if (state.kind === 'online') return false; // the list has no online trophies
  if (state.kind !== 'all' && state.kind !== 'missable' && !trophy.kinds.includes(state.kind)) return false;
  if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
  if (state.earnedOnly && !state.earned.has(trophy.id)) return false;
  if (state.query) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.target ?? ''} ${trophy.guide}`.toLowerCase();
    if (!hay.includes(state.query)) return false;
  }
  return true;
}

function gradeLabel(grade) {
  return grade[0].toUpperCase() + grade.slice(1);
}

function renderKindChips() {
  const wrap = $('kindChips');
  wrap.replaceChildren();
  for (const [kind, label] of KINDS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(state.kind === kind));
    button.addEventListener('click', () => {
      state.kind = kind;
      renderKindChips();
      renderTrophyList();
    });
    wrap.append(button);
  }
}

function renderRoadmap() {
  $('roadmapIntro').textContent = state.roadmap.intro;
  const stagesEl = $('roadmapStages');
  stagesEl.replaceChildren();
  for (const stage of state.roadmap.stages) {
    const li = document.createElement('li');
    li.className = 'stage';
    const h3 = document.createElement('h3');
    h3.textContent = stage.title;
    const p = document.createElement('p');
    p.textContent = stage.text;
    li.append(h3, p);
    if (stage.trophies.length) {
      const chips = document.createElement('div');
      chips.className = 'stage-trophies';
      for (const id of stage.trophies) {
        const t = trophyById(id);
        if (!t) continue;
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = trophyIsMasked(t) ? 'Hidden trophy' : t.name;
        if (state.earned.has(id)) b.classList.add('done');
        b.addEventListener('click', () => openTrophyDetail(id));
        chips.append(b);
      }
      li.append(chips);
    }
    if (stage.note) {
      const note = document.createElement('p');
      note.className = 'stage-note';
      note.textContent = stage.note;
      li.append(note);
    }
    stagesEl.append(li);
  }
}

function renderTrophyList() {
  const visible = state.trophies.filter(trophyMatchesFilters);
  $('listCount').textContent = `— ${visible.length} of ${state.trophies.length} shown`;
  const empty = $('emptyState');
  if (state.kind === 'online') {
    empty.hidden = false;
    empty.textContent = 'No online trophies: the whole 55-trophy list is single-player (Push Square, via the official list). The Platinum needs no online play at all.';
  } else if (visible.length === 0) {
    empty.hidden = false;
    empty.textContent = 'No trophies match these filters. Clear the search or pick another kind.';
  } else {
    empty.hidden = true;
  }
  listEl.replaceChildren();
  for (const t of visible) {
    const masked = trophyIsMasked(t);
    const li = document.createElement('li');
    li.className = 'trophy' + (state.earned.has(t.id) ? ' earned' : '') + (state.selectedId === t.id ? ' selected' : '');
    li.dataset.trophyId = String(t.id);
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.earned.has(t.id);
    box.setAttribute('aria-label', `Earned: ${masked ? 'hidden trophy' : t.name}`);
    box.addEventListener('change', () => {
      if (box.checked) state.earned.add(t.id);
      else state.earned.delete(t.id);
      saveEarnedProgress();
      updateProgressBar();
      renderTrophyList();
      renderRoadmap();
      openTrophyDetail(t.id);
    });
    const body = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = masked ? 'Hidden trophy — earn it to reveal' : t.name;
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    desc.textContent = masked ? 'Hidden until earned.' : t.description;
    body.append(name, desc);
    if (!masked && t.target) {
      const target = document.createElement('div');
      target.className = 'trophy-target';
      target.textContent = `Target: ${t.target}`;
      body.append(target);
    }
    if (t.missable) {
      const flag = document.createElement('div');
      flag.className = 'trophy-target';
      flag.style.color = 'var(--danger)';
      flag.textContent = 'Possibly missable — do it early';
      body.append(flag);
    }
    const meta = document.createElement('div');
    meta.className = 'trophy-meta';
    const grade = document.createElement('span');
    grade.className = `grade grade-${t.grade}`;
    grade.textContent = gradeLabel(t.grade);
    meta.append(grade);
    if (t.hidden && !masked) {
      const tag = document.createElement('span');
      tag.className = 'tag hidden-tag';
      tag.textContent = 'Hidden on PSN';
      meta.append(tag);
    }
    if (t.missable) {
      const tag = document.createElement('span');
      tag.className = 'tag missable';
      tag.textContent = 'Missable';
      meta.append(tag);
    }
    li.append(box, body, meta);
    li.addEventListener('click', (event) => {
      if (event.target === box) return;
      openTrophyDetail(t.id);
    });
    listEl.append(li);
  }
}

function openTrophyDetail(id) {
  const t = trophyById(id);
  if (!t) return;
  state.selectedId = id;
  const masked = trophyIsMasked(t);
  detailEl.replaceChildren();

  const title = document.createElement('h3');
  title.textContent = masked ? 'Hidden trophy' : t.name;
  const grade = document.createElement('span');
  grade.className = `grade grade-${t.grade}`;
  grade.textContent = gradeLabel(t.grade);
  const desc = document.createElement('p');
  desc.className = 'trophy-desc';
  desc.textContent = masked ? 'This trophy stays hidden on PlayStation until you earn it. Its name and description are hidden here too while the spoiler setting is on.' : t.description;
  detailEl.append(title, grade, desc);

  if (masked) {
    const box = document.createElement('div');
    box.className = 'spoiler-box';
    box.textContent = 'Spoilers are hidden. Reveal this trophy to read its guide and sources.';
    const reveal = document.createElement('button');
    reveal.type = 'button';
    reveal.textContent = 'Reveal this trophy (spoiler)';
    reveal.addEventListener('click', () => {
      state.revealed.add(t.id);
      saveRevealedProgress();
      renderTrophyList();
      renderRoadmap();
      openTrophyDetail(t.id);
    });
    box.append(document.createElement('br'), reveal);
    detailEl.append(box);
  } else {
    if (t.target) {
      const target = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = 'Target: ';
      target.append(strong, document.createTextNode(t.target));
      detailEl.append(target);
    }
    if (t.missable && t.missable_note) {
      const warn = document.createElement('p');
      warn.style.color = 'var(--danger)';
      const strong = document.createElement('strong');
      strong.textContent = 'Possibly missable: ';
      warn.append(strong, document.createTextNode(t.missable_note));
      detailEl.append(warn);
    }
    const guideHeading = document.createElement('h4');
    guideHeading.textContent = 'Guide';
    const guide = document.createElement('p');
    guide.className = 'guide-text';
    guide.textContent = t.guide;
    detailEl.append(guideHeading, guide);
    const srcHeading = document.createElement('h4');
    srcHeading.textContent = 'Sources';
    const srcList = document.createElement('ul');
    for (const s of t.sources) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = s.label;
      li.append(a);
      srcList.append(li);
    }
    detailEl.append(srcHeading, srcList);
  }

  const row = document.createElement('div');
  row.className = 'earn-row';
  const earnBtn = document.createElement('button');
  earnBtn.type = 'button';
  earnBtn.textContent = state.earned.has(t.id) ? 'Mark as not earned' : 'Mark as earned';
  earnBtn.addEventListener('click', () => {
    if (state.earned.has(t.id)) state.earned.delete(t.id);
    else state.earned.add(t.id);
    saveEarnedProgress();
    updateProgressBar();
    renderTrophyList();
    renderRoadmap();
    openTrophyDetail(t.id);
  });
  row.append(earnBtn);
  detailEl.append(row);

  document.querySelectorAll('.trophy.selected').forEach((el) => el.classList.remove('selected'));
  renderTrophyListSelection();
}

function renderTrophyListSelection() {
  for (const li of listEl.children) {
    li.classList.toggle('selected', Number(li.dataset.trophyId) === state.selectedId);
  }
}

function updateProgressBar() {
  const total = state.trophies.length;
  const earned = state.earned.size;
  const pct = total ? Math.round((earned / total) * 100) : 0;
  $('progressText').textContent = `${earned} of ${total} earned`;
  $('progressPct').textContent = `${pct}% to Platinum`;
  $('progressFill').style.width = `${pct}%`;
  const byGrade = {};
  for (const t of state.trophies) {
    byGrade[t.grade] = byGrade[t.grade] ?? { got: 0, total: 0 };
    byGrade[t.grade].total += 1;
    if (state.earned.has(t.id)) byGrade[t.grade].got += 1;
  }
  $('progressGrades').textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${gradeLabel(g)} ${byGrade[g].got}/${byGrade[g].total}`)
    .join(' · ');
}

function exportProgressFile() {
  const payload = {
    guide: 'Leonida Trophy Guide — GTA VI',
    exported_at: new Date().toISOString(),
    earned: [...state.earned].sort((a, b) => a - b),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgressFile(file) {
  if (!file) return;
  try {
    const doc = JSON.parse(await file.text());
    const ids = Array.isArray(doc) ? doc : doc.earned;
    if (!Array.isArray(ids)) throw new Error('no earned list');
    const known = new Set(state.trophies.map((t) => t.id));
    const clean = ids.filter((n) => Number.isInteger(n) && known.has(n));
    if (!clean.length && ids.length) throw new Error('no known trophy ids');
    state.earned = new Set(clean);
    saveEarnedProgress();
    updateProgressBar();
    renderTrophyList();
    renderRoadmap();
  } catch {
    alert('That file is not a trophy-progress export from this guide.');
  }
}

function applyHashRoute() {
  const hash = location.hash.slice(1);
  if (!hash) return;
  // Forms: #trophy-17, #roadmap, or #kind=missable&spoilers=off&trophy=17
  const trophyMatch = hash.match(/^trophy-(\d+)$/);
  if (trophyMatch) {
    openTrophyDetail(Number(trophyMatch[1]));
    return;
  }
  if (hash === 'roadmap') {
    $('roadmap').scrollIntoView();
    return;
  }
  const params = new URLSearchParams(hash);
  if (params.has('kind')) {
    state.kind = params.get('kind');
    renderKindChips();
  }
  if (params.get('spoilers') === 'off') {
    state.spoilers = false;
    $('spoilerToggle').checked = false;
  }
  if (params.get('spoilers') === 'on') {
    state.spoilers = true;
    $('spoilerToggle').checked = true;
  }
  renderTrophyList();
  renderRoadmap();
  if (params.has('trophy')) openTrophyDetail(Number(params.get('trophy')));
}

function wireControls() {
  $('search').addEventListener('input', (e) => {
    state.query = e.target.value.trim().toLowerCase();
    renderTrophyList();
  });
  $('gradeFilter').addEventListener('change', (e) => {
    state.grade = e.target.value;
    renderTrophyList();
  });
  $('earnedOnly').addEventListener('change', (e) => {
    state.earnedOnly = e.target.checked;
    renderTrophyList();
  });
  $('spoilerToggle').addEventListener('change', (e) => {
    state.spoilers = e.target.checked;
    renderTrophyList();
    renderRoadmap();
    if (state.selectedId) openTrophyDetail(state.selectedId);
  });
  $('exportBtn').addEventListener('click', exportProgressFile);
  $('importFile').addEventListener('change', (e) => {
    importProgressFile(e.target.files[0]);
    e.target.value = '';
  });
  $('resetBtn').addEventListener('click', () => {
    if (!state.earned.size) return;
    if (!confirm('Clear all earned trophies?')) return;
    state.earned.clear();
    saveEarnedProgress();
    updateProgressBar();
    renderTrophyList();
    renderRoadmap();
  });
  window.addEventListener('hashchange', applyHashRoute);
}

await loadGuideData();
renderKindChips();
renderRoadmap();
wireControls();
updateProgressBar();
renderTrophyList();
applyHashRoute();
if (!state.selectedId && state.trophies.length) openTrophyDetail(1);
