// format.js — money, dates and safe HTML. No network, no DOM.

const moneyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const intFmt = new Intl.NumberFormat('en-US');

// $1,234.56 — and $500 for a whole number.
export function money(n) {
  if (n == null || Number.isNaN(+n)) return '—';
  return moneyFmt.format(+n);
}

export function int(n) {
  if (n == null || Number.isNaN(+n)) return '—';
  return intFmt.format(+n);
}

// "Nov 17, 20:30" in the viewer's own time zone.
export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// "2d 4h left", "36m left", or "Closed" once the deadline has passed.
export function timeLeft(deadline) {
  if (!deadline) return '—';
  const ms = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(ms)) return '—';
  if (ms <= 0) return 'Closed';
  const m = Math.floor(ms / 60000);
  if (m < 60) return m + 'm left';
  const h = Math.floor(m / 60);
  if (h < 48) return h + 'h ' + (m % 60) + 'm left';
  const d = Math.floor(h / 24);
  return d + 'd ' + (h % 24) + 'h left';
}

// A bounty still takes entries only while its deadline is ahead:
// the API may still read status "open" after the deadline.
export function stillOpen(c) {
  if (!c) return false;
  if (!c.deadline) return (c.status || 'open') === 'open';
  return new Date(c.deadline).getTime() > Date.now();
}

// The live pot when the API reports one, else the headline reward.
export function potOf(c) {
  if (c == null) return null;
  if (c.potUsd != null) return +c.potUsd;
  if (c.rewardAmount != null) return +c.rewardAmount;
  return null;
}

export function feeOf(c) {
  if (c == null || c.entryFeeUsd == null) return null;
  return +c.entryFeeUsd;
}

// Escape text the API hands us before it goes into innerHTML.
export function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
