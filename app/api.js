// api.js — the only place that talks to make.fun.
// Read-only GETs against https://make.fun/api, with ETag revalidation:
// the API's ETags are bound to the minute, so a revalidation inside the
// same minute answers 304 and costs no body at all.
export const API_BASE = 'https://make.fun/api';

// url -> { etag, body, at } — one entry per endpoint, in memory only.
const cache = new Map();

// How long a cached body is served without revalidating (ms).
const FRESH_MS = 45_000;

async function get(path) {
  const url = API_BASE + path;
  const hit = cache.get(url);
  const headers = { Accept: 'application/json' };
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  // A fresh hit is served without touching the network at all.
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.body;
  const res = await fetch(url, { headers });
  if (res.status === 304 && hit) {
    hit.at = Date.now();
    return hit.body;
  }
  if (!res.ok) {
    const err = new Error('make.fun answered ' + res.status + ' for ' + path);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  cache.set(url, { etag: res.headers.get('ETag'), body, at: Date.now() });
  return body;
}

// The bounty board. The list endpoint answers { items: [...] }.
export async function listCompetitions() {
  const data = await get('/competitions');
  return Array.isArray(data.items) ? data.items : [];
}

// One bounty: rewards, live pot, entry fee, deadline, submissions.
export async function getCompetition(slug) {
  return get('/competitions/' + encodeURIComponent(slug));
}

// A bounty's leaderboard: { competition, phase, columns, entries }.
export async function getLeaderboard(slug) {
  return get('/competitions/' + encodeURIComponent(slug) + '/leaderboard');
}

// An account's public profile: links, record, solutions, payouts.
export async function getProfile(handle) {
  return get('/profiles/' + encodeURIComponent(handle));
}

// A profile picture, served round as a 256 px PNG.
export function profilePicture(handle) {
  return API_BASE + '/profiles/' + encodeURIComponent(handle) + '/picture.png';
}

// Drop every cached body (used after a manual refresh).
export function clearCache() {
  cache.clear();
}
