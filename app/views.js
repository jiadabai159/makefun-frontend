// views.js — every surface as an HTML string. All API text goes through
// esc() first; nothing here fetches. The router in main.js owns the DOM.
import { esc, money, int, fmtDate, timeLeft, stillOpen, potOf, feeOf } from './format.js';
import { profilePicture } from './api.js';

// One bounty card on the board. The pot is the live one when the API
// reports it; the fee and the time left sit next to it, easy to find.
export function bountyCard(c) {
  const open = stillOpen(c);
  const pot = potOf(c);
  const fee = feeOf(c);
  const left = timeLeft(c.deadline);
  return '<article class="card' + (open ? '' : ' closed') + '">' +
    '<h3><a href="#/bounty/' + esc(c.slug) + '">' + esc(c.title) + '</a></h3>' +
    '<p class="meta"><span class="pill">' + esc(c.category || 'Bounty') + '</span>' +
    (open
      ? '<span class="pill live">Open</span>'
      : '<span class="pill done">Closed</span>') + '</p>' +
    '<p class="pot">' + (pot != null ? money(pot) : '—') +
    '<span class="pot-label">live pot</span></p>' +
    '<dl class="facts">' +
    '<div><dt>Entry fee</dt><dd>' + (fee != null ? money(fee) : 'Free') + '</dd></div>' +
    '<div><dt>Time left</dt><dd data-countdown="' + esc(c.deadline || '') + '">' + esc(left) + '</dd></div>' +
    '<div><dt>Entries</dt><dd>' + int(c.submissionCount) + '</dd></div>' +
    '</dl>' +
    '<p class="blurb">' + esc(blurb((c.summary || c.description || ''), 160)) + '</p>' +
    '</article>';
}

// Cut a blurb to at most n characters, at a word boundary, with an
// ellipsis when it was longer.
function blurb(text, n) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 1);
  const at = cut.lastIndexOf(' ');
  return (at > 40 ? cut.slice(0, at) : cut) + '…';
}

// The board: filter chips, sort, search results, paged cards.
export function boardView(comps, state) {
  const q = (state.q || '').toLowerCase();
  let list = comps.filter((c) => {
    if (state.filter === 'open' && !stillOpen(c)) return false;
    if (state.filter === 'closed' && stillOpen(c)) return false;
    if (state.filter === 'soon' && (!stillOpen(c) || new Date(c.deadline).getTime() - Date.now() > 48 * 3600e3)) return false;
    if (q && !(c.title + ' ' + (c.category || '') + ' ' + (c.skills || []).join(' ')).toLowerCase().includes(q)) return false;
    return true;
  });
  const sort = state.sort || 'deadline';
  list = list.slice().sort((a, b) => {
    if (sort === 'pot') return (potOf(b) || 0) - (potOf(a) || 0);
    if (sort === 'entries') return (b.submissionCount || 0) - (a.submissionCount || 0);
    // Deadline sort puts the still-open bounties first (nearest deadline),
    // then the closed ones — a board that opens on dead bounties is useless.
    const ao = stillOpen(a) ? 0 : 1;
    const bo = stillOpen(b) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return new Date(a.deadline || '9999').getTime() - new Date(b.deadline || '9999').getTime();
  });
  const per = 24;
  const pages = Math.max(1, Math.ceil(list.length / per));
  const page = Math.min(state.page || 1, pages);
  const slice = list.slice((page - 1) * per, page * per);
  const totalPot = comps.reduce((s, c) => s + (potOf(c) || 0), 0);
  const openCount = comps.filter(stillOpen).length;
  return '<section class="board-head">' +
    '<h1>Live bounties</h1>' +
    '<p class="lede">' + int(openCount) + ' open now · ' + int(comps.length) +
    ' listed · ' + money(totalPot) + ' in live pots</p>' +
    '<div class="controls" role="search">' +
    '<input id="q" type="search" placeholder="Search bounties, skills…" value="' + esc(state.q || '') + '" aria-label="Search bounties">' +
    '<div class="chips" role="group" aria-label="Filter">' +
    chip('all', 'All', state.filter) + chip('open', 'Open', state.filter) +
    chip('soon', 'Closing soon', state.filter) + chip('closed', 'Closed', state.filter) +
    '</div>' +
    '<label class="sort">Sort <select id="sort" aria-label="Sort bounties">' +
    '<option value="deadline"' + (sort === 'deadline' ? ' selected' : '') + '>Deadline</option>' +
    '<option value="pot"' + (sort === 'pot' ? ' selected' : '') + '>Biggest pot</option>' +
    '<option value="entries"' + (sort === 'entries' ? ' selected' : '') + '>Most entries</option>' +
    '</select></label>' +
    '</div></section>' +
    (slice.length
      ? '<div class="grid">' + slice.map(bountyCard).join('') + '</div>' +
        pager(page, pages, 'board')
      : '<p class="empty">No bounties match. Try another search or filter.</p>');
}

function chip(value, label, current) {
  const on = (current || 'all') === value;
  return '<button type="button" class="chip' + (on ? ' on' : '') +
    '" data-filter="' + value + '" aria-pressed="' + on + '">' + label + '</button>';
}

function pager(page, pages, kind) {
  if (pages <= 1) return '';
  return '<nav class="pager" aria-label="Pages">' +
    '<button type="button" data-page="' + (page - 1) + '" data-kind="' + kind + '"' +
    (page <= 1 ? ' disabled' : '') + '>← Prev</button>' +
    '<span>Page ' + page + ' of ' + pages + '</span>' +
    '<button type="button" data-page="' + (page + 1) + '" data-kind="' + kind + '"' +
    (page >= pages ? ' disabled' : '') + '>Next →</button></nav>';
}

// The description is markdown-lite: ## lines become headings, the rest
// becomes paragraphs. API text is escaped first, so no markup survives.
export function renderDescription(text) {
  const lines = String(text || '').split('\n');
  let out = '';
  let para = [];
  const flush = () => {
    if (para.length) out += '<p>' + esc(para.join(' ')) + '</p>';
    para = [];
  };
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('## ')) { flush(); out += '<h3>' + esc(t.slice(3)) + '</h3>'; }
    else if (t.startsWith('# ')) { flush(); out += '<h3>' + esc(t.slice(2)) + '</h3>'; }
    else if (t === '') flush();
    else para.push(t);
  }
  flush();
  return out || '<p>No description.</p>';
}

// A bounty's page: summary, rewards table with the live pot, dates,
// status, and its latest entries with links to their makers' profiles.
export function bountyView(c) {
  const open = stillOpen(c);
  const pot = potOf(c);
  const fee = feeOf(c);
  const rewards = c.rewards || {};
  const now = c.rewardsNow || [];
  const rows = Object.keys(rewards).sort((a, b) => +a - +b).map((place) => {
    const live = now.find((r) => String(r.place) === place);
    return '<tr><td>' + esc(place) + '</td><td>' + money(rewards[place]) + '</td>' +
      '<td>' + (live ? money(live.feeShareUsd) + ' fees' : '—') + '</td>' +
      '<td><strong>' + (live ? money(live.amountUsd) : money(rewards[place])) + '</strong></td></tr>';
  }).join('');
  const subs = (c.submissions || []).slice(0, 8).map((s) =>
    '<li><a href="#/u/' + esc(s.hunter) + '">' + esc(s.hunter) + '</a> — ' +
    esc(s.title || 'Untitled entry') +
    (s.status ? ' <span class="pill">' + esc(s.status) + '</span>' : '') + '</li>').join('');
  return '<article class="bounty">' +
    '<p class="crumbs"><a href="#/">Bounties</a> / ' + esc(c.category || '') + '</p>' +
    '<h1>' + esc(c.title) + '</h1>' +
    '<p class="lede">' + esc(c.summary || '') + '</p>' +
    '<p>' + (open
      ? '<span class="pill live">Open</span> <span data-countdown="' + esc(c.deadline || '') + '">' + esc(timeLeft(c.deadline)) + '</span>'
      : '<span class="pill done">Closed</span> — results pending') + '</p>' +
    '<dl class="facts big">' +
    '<div><dt>Live pot</dt><dd>' + (pot != null ? money(pot) : '—') + '</dd></div>' +
    '<div><dt>Entry fee</dt><dd>' + (fee != null ? money(fee) : 'Free') + '</dd></div>' +
    '<div><dt>Deadline</dt><dd>' + esc(fmtDate(c.deadline)) + '</dd></div>' +
    '<div><dt>Entries</dt><dd>' + int(c.submissionCount) + '</dd></div>' +
    '<div><dt>Sponsor</dt><dd>' + esc((c.sponsor && c.sponsor.name) || '—') + '</dd></div>' +
    '<div><dt>Skills</dt><dd>' + esc((c.skills || []).join(', ') || '—') + '</dd></div>' +
    '</dl>' +
    '<p><a class="btn" href="#/bounty/' + esc(c.slug) + '/leaderboard">View leaderboard →</a></p>' +
    (rows ? '<h2>Rewards</h2><table class="rewards"><thead><tr><th>Place</th><th>Base</th><th>Fee share</th><th>Total now</th></tr></thead><tbody>' + rows + '</tbody></table>' : '') +
    '<h2>About this bounty</h2>' + renderDescription(c.description) +
    (subs ? '<h2>Latest entries</h2><ul class="subs">' + subs + '</ul>' : '') +
    '</article>';
}

// A leaderboard: the API's own columns drive the table, so any
// competition's board renders — Elo, judge rate, wins, whatever it has.
export function leaderboardView(lb, state) {
  const comp = lb.competition || {};
  const cols = lb.columns || [];
  const entries = lb.entries || [];
  const per = 50;
  const pages = Math.max(1, Math.ceil(entries.length / per));
  const page = Math.min(state.page || 1, pages);
  const slice = entries.slice((page - 1) * per, page * per);
  const head = '<th>#</th><th>Entrant</th><th>Entry</th>' +
    cols.map((col) => '<th>' + esc(col.title || col.key) + '</th>').join('');
  const rows = slice.map((e) => {
    const vals = e.display || e.values || {};
    return '<tr><td>' + int(e.rank) + '</td>' +
      '<td><a href="#/u/' + esc(e.handle) + '">' + esc(e.handle) + '</a></td>' +
      '<td>' + esc(e.title || '—') + '</td>' +
      cols.map((col) => '<td>' + esc(vals[col.key] ?? '—') + '</td>').join('') + '</tr>';
  }).join('');
  return '<section><p class="crumbs"><a href="#/">Bounties</a> / ' +
    '<a href="#/bounty/' + esc(comp.slug) + '">' + esc(comp.title || comp.slug) + '</a> / Leaderboard</p>' +
    '<h1>' + esc(comp.title || 'Leaderboard') + '</h1>' +
    '<p class="lede">' + esc(lb.title || 'Results') +
    (lb.phase ? ' · ' + esc(lb.phase.title || '') : '') +
    ' · ' + int(entries.length) + ' ranked entries</p>' +
    (rows
      ? '<div class="table-wrap"><table class="lb"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        pager(page, pages, 'leaderboard')
      : '<p class="empty">No ranked entries yet.</p>') +
    '</section>';
}

// A public profile: picture, links, record, and the entries it made.
export function profileView(p) {
  const rec = p.record || {};
  const links = [];
  if (p.github_login) links.push('<a href="https://github.com/' + esc(p.github_login) + '">GitHub</a>');
  if (p.discord) links.push('<span>Discord: ' + esc(p.discord) + '</span>');
  if (p.x) links.push('<a href="https://x.com/' + esc(p.x) + '">X</a>');
  if (p.wallet && p.wallet.address) {
    links.push('<a href="' + esc(p.wallet.explorer_url || ('https://solscan.io/account/' + p.wallet.address)) + '">Wallet ' + esc(p.wallet.address.slice(0, 4) + '…' + p.wallet.address.slice(-4)) + '</a>');
  }
  const sols = (p.solutions || []).map((s) =>
    '<li><a href="#/bounty/' + esc(s.slug || s.competition_slug || '') + '">' +
    esc(s.competition_title || s.title || s.slug || 'Bounty') + '</a>' +
    (s.placement ? ' — placed #' + int(s.placement) : '') +
    (s.prize_usd ? ' · ' + money(s.prize_usd) : '') + '</li>').join('');
  return '<section class="profile">' +
    '<img class="avatar" src="' + esc(profilePicture(p.handle)) + '" crossorigin="anonymous" alt="" width="96" height="96">' +
    '<h1>' + esc(p.handle) + '</h1>' +
    (p.display_name ? '<p class="lede">' + esc(p.display_name) + '</p>' : '') +
    (p.bio ? '<p>' + esc(p.bio) + '</p>' : '<p class="muted">No bio yet.</p>') +
    (links.length ? '<p class="links">' + links.join(' · ') + '</p>' : '') +
    '<dl class="facts big">' +
    '<div><dt>Entered</dt><dd>' + int(rec.competitions_entered) + '</dd></div>' +
    '<div><dt>Placed</dt><dd>' + int(rec.competitions_placed) + '</dd></div>' +
    '<div><dt>Won</dt><dd>' + int(rec.competitions_won) + '</dd></div>' +
    '<div><dt>Prize money</dt><dd>' + money(rec.prize_usd) + '</dd></div>' +
    '<div><dt>Joined</dt><dd>' + esc(fmtDate(p.joined_at)) + '</dd></div>' +
    '</dl>' +
    (sols ? '<h2>Entries</h2><ul class="subs">' + sols + '</ul>' : '<p class="muted">No entries shown.</p>') +
    '</section>';
}

export function errorView(message) {
  return '<section class="error"><h1>Something went wrong</h1>' +
    '<p>' + esc(message || 'The request failed.') + '</p>' +
    '<p><button type="button" onclick="location.reload()">Try again</button> ' +
    '<a href="#/">Back to the board</a></p></section>';
}

export function loadingView(label) {
  return '<p class="loading" aria-busy="true">Loading ' + esc(label || '…') + '</p>';
}
