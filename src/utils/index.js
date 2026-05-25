export const VALUE_BANDS = [
  { label: '$0 – $300', short: '<$300', min: 0, max: 300 },
  { label: '$300 – $750', short: '$300-750', min: 300, max: 750 },
  { label: '$750 – $1,200', short: '$750-1.2k', min: 750, max: 1200 },
  { label: '$1,200+', short: '$1.2k+', min: 1200, max: Infinity },
];

export const ROOM_SUGGESTIONS = [
  { name: 'Living Room', icon: '🛌' },
  { name: 'Kitchen', icon: '🍳' },
  { name: 'Dining Room', icon: '🍽️' },
  { name: 'Primary Bedroom', icon: '🛏️' },
  { name: 'Kids Bedroom', icon: '🧼' },
  { name: 'Guest Room', icon: '🛎️' },
  { name: 'Bathroom', icon: '🚿' },
  { name: 'Home Office', icon: '💼' },
  { name: 'Garage', icon: '🚗' },
  { name: 'Basement', icon: '🧱' },
  { name: 'Attic', icon: '🏠' },
  { name: 'Patio / Balcony', icon: '🌿' },
  { name: 'Laundry Room', icon: '🧳' },
  { name: 'Storage', icon: '📦' },
  { name: 'Miscellaneous', icon: '❇️' },
];

export const ROOM_ICONS = [
  '🛌', '🍳', '🍽️', '🛏️', '🧹', '🚿',
  '💼', '🚗', '🧱', '🏠', '🌿', '🧳',
  '📦', '🚪', '❇️', '🎮', '📺', '🎨',
];

/**
 * Returns array of 4 counts, one per VALUE_BAND, for the given items array.
 */
export function getSummary(items) {
  return VALUE_BANDS.map((_, i) => items.filter(it => it.valueBand === i).length);
}

/**
 * Validates box number: must be a positive integer OR the string "NA" (case-insensitive).
 * Returns true if valid.
 */
export function validateBoxNumber(val) {
  if (!val || !String(val).trim()) return false;
  const v = String(val).trim();
  if (v.toUpperCase() === 'NA') return true;
  const n = Number(v);
  return Number.isInteger(n) && n > 0;
}
