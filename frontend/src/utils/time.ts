/**
 * Adjusts a date to UTC+1 timezone.
 * @param {string | Date} isoOrDate - The date to adjust (ISO string or Date object)
 * @returns {Date} The adjusted date in UTC+1
 */
function toUTCPlus1Date(isoOrDate: string | Date): Date {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return new Date(d.getTime() + 60 * 60 * 1000);
}

/**
 * Creates a YYYY-MM-DD key from a date.
 * @param {Date} d - The date to format
 * @returns {string} The date key in YYYY-MM-DD format
 */
function ymdKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/**
 * Formats a date/time to HH:MM in UTC+1 timezone.
 * @param {string | Date} isoOrDate - The date/time to format
 * @returns {string} The formatted time string (HH:MM)
 */
export function formatToUTCPlus1(isoOrDate: string | Date): string {
  const adjusted = toUTCPlus1Date(isoOrDate);
  return adjusted.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formats a date/time to full datetime string in UTC+1 timezone.
 * @param {string | Date} isoOrDate - The date/time to format
 * @returns {string} The formatted datetime string
 */
export function formatToUTCPlus1DateTime(isoOrDate: string | Date): string {
  const adjusted = toUTCPlus1Date(isoOrDate);
  return adjusted.toLocaleString();
}

/**
 * Formats a timestamp for display in chat lists.
 * Shows time for today, 'Yesterday' for yesterday, or DD/MM/YYYY for older dates.
 * @param {string | Date} isoOrDate - The timestamp to format
 * @returns {string} The formatted timestamp string
 */
export function formatChatListTimestamp(isoOrDate: string | Date): string {
  const d = toUTCPlus1Date(isoOrDate);
  const now = toUTCPlus1Date(new Date());
  const key = ymdKey(d);
  const todayKey = ymdKey(now);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = ymdKey(yesterday);

  if (key === todayKey) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (key === yesterdayKey) return 'Yesterday';
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Generates a date header for chat messages.
 * Returns 'Today', 'Yesterday', or DD/MM/YYYY.
 * @param {string | Date} isoOrDate - The date to format
 * @returns {string} The date header string
 */
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

/**
 * Checks if two dates fall on the same day in UTC+1 timezone.
 * @param {string | Date} a - First date
 * @param {string | Date} b - Second date
 * @returns {boolean} True if same day, false otherwise
 */
export function isSameUTCPlus1Day(a: string | Date, b: string | Date): boolean {
  return ymdKey(toUTCPlus1Date(a)) === ymdKey(toUTCPlus1Date(b));
}

