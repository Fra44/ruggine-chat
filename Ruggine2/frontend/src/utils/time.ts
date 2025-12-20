function toUTCPlus1Date(isoOrDate: string | Date): Date {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return new Date(d.getTime() + 60 * 60 * 1000);
}

function ymdKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function formatToUTCPlus1(isoOrDate: string | Date): string {
  const adjusted = toUTCPlus1Date(isoOrDate);
  return adjusted.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatToUTCPlus1DateTime(isoOrDate: string | Date): string {
  const adjusted = toUTCPlus1Date(isoOrDate);
  return adjusted.toLocaleString();
}

export function formatChatListTimestamp(isoOrDate: string | Date): string {
  const d = toUTCPlus1Date(isoOrDate);
  const now = toUTCPlus1Date(new Date());
  const key = ymdKey(d);
  const todayKey = ymdKey(now);

  // Yesterday: subtract 1 day from now
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = ymdKey(yesterday);

  if (key === todayKey) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (key === yesterdayKey) return 'Yesterday';
  // otherwise show dd/mm/yyyy
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function chatMessageDateHeader(isoOrDate: string | Date): string {
  const d = toUTCPlus1Date(isoOrDate);
  const now = toUTCPlus1Date(new Date());
  const key = ymdKey(d);
  const todayKey = ymdKey(now);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = ymdKey(yesterday);
  if (key === todayKey) return 'Today';
  if (key === yesterdayKey) return 'Yesterday';
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function isSameUTCPlus1Day(a: string | Date, b: string | Date): boolean {
  return ymdKey(toUTCPlus1Date(a)) === ymdKey(toUTCPlus1Date(b));
}

