import { describe, expect, it } from 'vitest';
import { directoryFromOsm } from './supermarketLocator';

describe('directoryFromOsm', () => {
  it('fusiona el nodo y el edificio de una misma sucursal', () => {
    const result = directoryFromOsm('08800', { latitude: 41.22, longitude: 1.72, label: 'Vilanova' }, [
      { type: 'node', id: 1, lat: 41.221, lon: 1.721, tags: { name: 'Mercadona', brand: 'Mercadona' } },
      { type: 'way', id: 2, center: { lat: 41.2214, lon: 1.7214 }, tags: { name: 'Mercadona', brand: 'Mercadona' } }
    ]);
    expect(result.stores).toHaveLength(1);
  });
});
