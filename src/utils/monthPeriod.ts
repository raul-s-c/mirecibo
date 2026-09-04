export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function moveMonth(value: string, offset: number) {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return monthKey();
  return monthKey(new Date(year, month - 1 + offset, 1, 12));
}

export function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  const label = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1, 12));
  return label.charAt(0).toLocaleUpperCase('es') + label.slice(1);
}
