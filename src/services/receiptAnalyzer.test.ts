import { describe, expect, it } from 'vitest';
import type { TextBlock } from '@capacitor-mlkit/text-recognition';
import { parseFuelText, parseReceiptText, reconstructReceiptRows } from './receiptAnalyzer';

const receiptText = `MERCADONA
31/08/2026 18:03
LECHE ENTERA 1,25
HUEVOS M 2,40
PAPEL HIGIENICO 3,20
IVA 0,48
TOTAL 6,85`;

describe('receiptAnalyzer', () => {
  it('extrae cabecera, líneas y total', () => {
    const receipt = parseReceiptText(receiptText);
    expect(receipt).toMatchObject({ store: 'Mercadona', date: '2026-08-31', time: '18:03', total: 6.85, tax: 0.48 });
    expect(receipt.lines).toHaveLength(3);
    expect(receipt.lines[0]).toMatchObject({ name: 'LECHE ENTERA', total: 1.25 });
  });

  it('extrae un repostaje', () => {
    const refuel = parseFuelText('REPSOL\n29/08/2026\nGASOLINA 95\n12,34 L\n1,123 €/L\nTOTAL 13,85', 'vehicle-car');
    expect(refuel).toMatchObject({ station: 'Repsol', fuelType: 'GASOLINA 95', liters: 12.34, pricePerLiter: 1.123, total: 13.85, vehicleId: 'vehicle-car' });
  });

  it('no confunde los tipos de IVA con productos', () => {
    const receipt = parseReceiptText('ALCAMPO SANT BOI\n31/08/2026\nLECHE 1,25\nPAN 1,10\nA IVA 21,00\nB IVA 10,00\nTOTAL 2,35');
    expect(receipt.lines.map(line => line.name)).toEqual(['LECHE', 'PAN']);
    expect(receipt.total).toBe(2.35);
  });

  it('reconstruye una fila cuando el OCR separa nombre y precio en columnas', () => {
    const blocks = [
      { text: 'LECHE ENTERA', lines: [{ text: 'LECHE ENTERA', elements: [], boundingBox: { left: 20, top: 100, right: 200, bottom: 120 } }] },
      { text: '1,25', lines: [{ text: '1,25', elements: [], boundingBox: { left: 350, top: 101, right: 405, bottom: 121 } }] },
      { text: 'HUEVOS M', lines: [{ text: 'HUEVOS M', elements: [], boundingBox: { left: 20, top: 140, right: 180, bottom: 160 } }] },
      { text: '2,40', lines: [{ text: '2,40', elements: [], boundingBox: { left: 350, top: 141, right: 405, bottom: 161 } }] }
    ] as TextBlock[];
    const rows = reconstructReceiptRows(blocks);
    expect(rows).toEqual(['LECHE ENTERA 1,25', 'HUEVOS M 2,40']);
    expect(parseReceiptText('ALCAMPO\nTOTAL 3,65', rows).lines).toHaveLength(2);
  });
});
