// main.js — routing, fetching and rendering. The only module index.html
// loads; it pulls in api.js, format.js and views.js as static imports.
import { listCompetitions, getCompetition, getLeaderboard, getProfile, clearCache } from './api.js';
import { timeLeft } from './format.js';
import { boardView, bountyView, leaderboardView, profileView, errorView, loadingView } from './views.js';

// The starter's app sets window.__shotReady false as each route starts
// loading and true once its data has rendered, for any script that
// takes screenshots of it. This app does the same.
function shotReady(value) {
  window.__shotReady = value;
}

const view = document.getElementById('view');
const searchInput = document.getElementById('q-top');

// Board state lives in memory: filter, sort, page and search text.
// The list is fetched once and cached by api.js, so paging and
// filtering never refetch.
const boardState = { filter: 'all', sort: 'deadline', page: 1, q: '' };
const lbState = { page: 1 };
let boardData = null;

function setNav(route) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const on = (route === 'board' && a.dataset.nav === 'board') ||
      (route === 'profile' && a.dataset.nav === 'board');
    a.classList.toggle('on', on);
  });
}

// Update every countdown in place once a minute, without rebuilding
// the page (and without moving the reader's scroll position).
function tickCountdowns() {
  document.querySelectorAll('[data-countdown]').forEach((el) => {
    el.textContent = timeLeft(el.dataset.countdown);
  });
}
setInterval(tickCountdowns, 60_000);

async function showBoard() {
  setNav('board');
  shotReady(false);
  view.innerHTML = boardData ? boardView(boardData, boardState) : loadingView('the bounty board');
  wireBoard();
  try {
    if (!boardData) boardData = await listCompetitions();
    view.innerHTML = boardView(boardData, boardState);
    wireBoard();
  } catch (err) {
    view.innerHTML = errorView(err.message);
  }
  shotReady(true);
}

function wireBoard() {
  const q = document.getElementById('q');
  if (q) {
    q.addEventListener('input', () => {
      boardState.q = q.value;
      boardState.page = 1;
      const pos = q.selectionStart;
      view.innerHTML = boardView(boardData, boardState);
      wireBoard();
      const next = document.getElementById('q');
      next.focus();
      next.setSelectionRange(pos, pos);
    });
  }
  const sort = document.getElementById('sort');
  if (sort) {
    sort.addEventListener('change', () => {
      boardState.sort = sort.value;
      boardState.page = 1;
      view.innerHTML = boardView(boardData, boardState);
      wireBoard();
    });
  }
  view.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      boardState.filter = btn.dataset.filter;
      boardState.page = 1;
      view.innerHTML = boardView(boardData, boardState);
      wireBoard();
    });
  });
  view.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      boardState.page = Math.max(1, +btn.dataset.page || 1);
      view.innerHTML = boardView(boardData, boardState);
      wireBoard();
      window.scrollTo(0, 0);
    });
  });
}

async function showBounty(slug) {
  setNav('board');
  shotReady(false);
  view.innerHTML = loadingView('the bounty');
  try {
    const c = await getCompetition(slug);
    view.innerHTML = bountyView(c);
  } catch (err) {
    view.innerHTML = errorView(err.message);
  }
  shotReady(true);
}

async function showLeaderboard(slug) {
  setNav('board');
  shotReady(false);
  lbState.page = 1;
  view.innerHTML = loadingView('the leaderboard');
  try {
    const lb = await getLeaderboard(slug);
    view.innerHTML = leaderboardView(lb, lbState);
    view.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lbState.page = Math.max(1, +btn.dataset.page || 1);
        view.innerHTML = leaderboardView(lb, lbState);
        window.scrollTo(0, 0);
      });
    });
  } catch (err) {
    view.innerHTML = errorView(err.message);
  }
  shotReady(true);
}

async function showProfile(handle) {
  setNav('profile');
  shotReady(false);
  view.innerHTML = loadingView('the profile');
  try {
    const p = await getProfile(handle);
    view.innerHTML = profileView(p);
  } catch (err) {
    view.innerHTML = errorView(err.message);
  }
  shotReady(true);
}

// Hash routes: #/ the board, #/bounty/<slug>, #/bounty/<slug>/leaderboard,
// #/u/<handle>. Every surface is reachable by its own URL and by a link.
function route() {
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) return showBoard();
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') return showLeaderboard(parts[1]);
  if (parts[0] === 'bounty' && parts[1]) return showBounty(parts[1]);
  if (parts[0] === 'u' && parts[1]) return showProfile(decodeURIComponent(parts[1]));
  return showBoard();
}

window.addEventListener('hashchange', route);

// The header search jumps to a profile when it looks like a handle,
// and filters the board otherwise.
if (searchInput) {
  searchInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = searchInput.value.trim();
    if (/^[a-z0-9][a-z0-9-]{2,}$/i.test(v) && !v.includes(' ')) {
      location.hash = '#/u/' + encodeURIComponent(v);
    } else {
      boardState.q = v;
      boardState.page = 1;
      location.hash = '#/';
      showBoard();
    }
  });
}

document.getElementById('refresh').addEventListener('click', () => {
  clearCache();
  boardData = null;
  route();
});

route();
