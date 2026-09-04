export const money = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
export const shortDate = (value: string) => new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
export const percent = (value: number) => new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 }).format(value);
