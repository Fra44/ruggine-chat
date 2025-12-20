export function formatToUTCPlus1(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  // get time in milliseconds, then add one hour (3600000 ms) to convert UTC -> UTC+1
  const ms = d.getTime() + 60 * 60 * 1000;
  const adjusted = new Date(ms);
  return adjusted.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatToUTCPlus1DateTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const ms = d.getTime() + 60 * 60 * 1000;
  const adjusted = new Date(ms);
  return adjusted.toLocaleString();
}
