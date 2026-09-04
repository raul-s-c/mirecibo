export type Category = 'Alimentación' | 'Hogar' | 'Higiene' | 'Mascotas' | 'Otros';
export type AppPage = 'home' | 'list' | 'tickets' | 'fuel' | 'analysis' | 'alerts' | 'settings';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: Category;
  completed: boolean;
  store?: string;
  note?: string;
  createdAt: string;
}

export interface ReceiptLine {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  category: Category;
  confidence: number;
  lineType?: 'product' | 'discount' | 'deposit' | 'fee';
}

export interface Receipt {
  id: string;
  store: string;
  storeAddress?: string;
  storeMunicipality?: string;
  date: string;
  time?: string;
  total: number;
  tax?: number;
  lines: ReceiptLine[];
  imageUri?: string;
  ocrText?: string;
  analysisMethod?: 'ai-vision' | 'local-ocr' | 'manual';
  analysisWarnings?: string[];
  createdAt: string;
}

export interface Vehicle {
  id: string;
  name: string;
  description?: string;
}

export interface Refuel {
  id: string;
  station: string;
  date: string;
  fuelType: string;
  liters: number;
  pricePerLiter: number;
  total: number;
  vehicleId: string;
  odometer?: number;
  tags: string[];
}

export interface PriceAlert {
  id: string;
  product: string;
  store: string;
  previousPrice: number;
  currentPrice: number;
  unit: string;
  date: string;
  followed: boolean;
}

export interface PriceOffer {
  source: 'history' | 'mercadona' | 'consum' | 'esclat';
  store: string;
  address?: string;
  municipality?: string;
  locationLabel?: string;
  locationKind?: 'physical-store' | 'online-zone' | 'chain-nearby';
  chain?: string;
  distanceKm?: number;
  nearbyStoreName?: string;
  productName: string;
  price: number;
  unitPrice: number;
  basis: 'kg' | 'l' | 'unit';
  date: string;
  url?: string;
  imageUrl?: string;
  matchType: 'same' | 'equivalent';
  matchReason?: string;
}

export interface SupermarketLocation {
  id: string;
  chain: string;
  name: string;
  address?: string;
  municipality?: string;
  postalCode?: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
}

export interface ProductPriceGroup {
  id: string;
  canonicalName: string;
  memberNames: string[];
  basis: 'kg' | 'l' | 'unit';
  offers: PriceOffer[];
  bestOffer: PriceOffer;
  latestPaid?: PriceOffer;
  possibleSaving: number;
}

export interface PriceComparison {
  postalCode: string;
  updatedAt: string;
  coverage: string[];
  groups: ProductPriceGroup[];
  warnings: string[];
  nearbyStores?: SupermarketLocation[];
  otherNearbyStoreCount?: number;
  requestedChains?: string[];
  searchCenter?: { latitude: number; longitude: number; label: string };
  maxRadiusKm?: number;
  locationAttribution?: string;
}

export interface AppState {
  items: ShoppingItem[];
  receipts: Receipt[];
  refuels: Refuel[];
  vehicles: Vehicle[];
  alerts: PriceAlert[];
  postalCode: string;
  currency: 'EUR';
}

export type NewShoppingItem = Omit<ShoppingItem, 'id' | 'createdAt' | 'completed'>;
