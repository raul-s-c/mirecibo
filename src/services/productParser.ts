import type { Category, NewShoppingItem } from '../types';

const QUANTITIES: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10
};

const FOOD = /leche|huevo|pollo|salm[oó]n|caf[eé]|pan|tostada|arroz|pasta|yogur|queso|fruta|pl[aá]tano|mel[oó]n|aceite|at[uú]n|carne|pescado|verdura/i;
const HOME = /papel|detergente|lej[ií]a|limpiador|bolsa|servilleta|lavavajillas|esponja/i;
const HYGIENE = /champ[uú]|gel|jab[oó]n|dent[ií]frico|desodorante|maquinilla|compresa/i;
const PETS = /pienso|gato|perro|mascota|arena/i;

export function guessCategory(name: string): Category {
  if (FOOD.test(name)) return 'Alimentación';
  if (HOME.test(name)) return 'Hogar';
  if (HYGIENE.test(name)) return 'Higiene';
  if (PETS.test(name)) return 'Mascotas';
  return 'Otros';
}

const cleanupName = (value: string) => value
  .replace(/^(?:a[nñ]ade|añadir|agrega|agregar|quiero|necesito|comprar|compra|pon|apunta)\s+/i, '')
  .replace(/\s+(?:a|en)\s+(?:mi\s+)?lista$/i, '')
  .trim();

const PRODUCT_START = /rollos?\s+(?:de\s+)?papel\s+de\s+cocina|paquetes?\s+(?:de\s+)?papel\s+higi[eé]nico|papel\s+(?:de\s+cocina|higi[eé]nico)|aceite\s+de\s+oliva(?:\s+virgen\s+extra)?|leche|huevos?|tostadas?|pan|caf[eé]|arroz|pasta|pollo|salm[oó]n|at[uú]n|queso|yogur|pl[aá]tanos?|mel[oó]n|detergente|lej[ií]a|servilletas?|champ[uú]|gel\s+de\s+ducha|jab[oó]n/gi;

function separateUndelimitedProducts(value: string) {
  if (/[,;.\n]|\s+(?:y|adem[aá]s|luego|despu[eé]s|tambi[eé]n)\s+/i.test(value)) return value;
  const matches = [...value.matchAll(PRODUCT_START)];
  if (matches.length < 2) return value;
  const starts = matches.map((match, index) => index === 0 && /^\s*(?:\d+(?:[.,]\d+)?|un[ao]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+/i.test(value.slice(0, match.index)) ? 0 : match.index ?? 0);
  return starts.map((start, index) => value.slice(start, starts[index + 1] ?? value.length).trim()).filter(Boolean).join(',');
}

export function parseShoppingText(text: string): NewShoppingItem[] {
  const normalized = separateUndelimitedProducts(text)
    .replace(/\s+y\s+/gi, ',')
    .replace(/\s+adem[aá]s\s+/gi, ',')
    .replace(/[.;]+/g, ',');

  return normalized.split(',').flatMap(raw => {
    const part = cleanupName(raw);
    if (!part) return [];
    const match = part.match(/^(?:(\d+(?:[.,]\d+)?|un[ao]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)?\s*(?:(kg|kilos?|g|gramos?|l|litros?|packs?|paquetes?|cartones?|botellas?|barras?|rollos?|uds?\.?|unidades?)\b)?\s*(?:de\s+)?)?(.+)$/i);
    if (!match) return [];
    const rawQuantity = (match[1] || '1').toLocaleLowerCase('es');
    const quantity = QUANTITIES[rawQuantity] ?? (Number(rawQuantity.replace(',', '.')) || 1);
    const rawUnit = (match[2] || 'ud.').toLocaleLowerCase('es');
    const unit = /kg|kilo/.test(rawUnit) ? 'kg' : /gramo|^g$/.test(rawUnit) ? 'g' : /litro|^l$/.test(rawUnit) ? 'L' : /paquete|pack/.test(rawUnit) ? 'paquete' : /cart[oó]n/.test(rawUnit) ? 'cartón' : /botella/.test(rawUnit) ? 'botella' : /barra/.test(rawUnit) ? 'barra' : /rollo/.test(rawUnit) ? 'rollo' : 'ud.';
    const name = match[3].trim().replace(/^./, value => value.toLocaleUpperCase('es'));
    return [{ name, quantity, unit, category: guessCategory(name) }];
  });
}
