export type Category = string;
export type AppPage = 'home' | 'list' | 'tickets' | 'fuel' | 'analysis' | 'pantry' | 'settings';

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
  category?: Category;
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

export interface CategoryDefinition {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  builtin?: boolean;
  aliases?: string[];
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';
export type RecurringMode = 'automatic' | 'reminder';

export interface RecurringExpense {
  id: string;
  concept: string;
  store: string;
  amount: number;
  category: Category;
  frequency: RecurringFrequency;
  nextDate: string;
  dayOfPeriod?: number;
  mode: RecurringMode;
  active: boolean;
  createdAt: string;
}

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: Category;
  sourceReceiptId?: string;
  updatedAt: string;
}

export type MealPlanMode = 'ideas' | 'week';
export type MealSlotSelection = 'lunch' | 'dinner' | 'both';

export interface MealIngredient {
  name: string;
  quantity: number;
  unit: string;
  source: 'pantry' | 'shopping';
}

export interface PlannedMeal {
  type: string;
  name: string;
  description: string;
  ingredients: MealIngredient[];
  steps: string[];
}

export interface MealPlanDay {
  label: string;
  date: string;
  meals: PlannedMeal[];
}

export interface MealPlan {
  id: string;
  title: string;
  summary: string;
  assumptions: string[];
  startDate: string;
  people: number;
  mode: MealPlanMode;
  mealSlots: MealSlotSelection;
  dietFilters: string[];
  notes: string;
  days: MealPlanDay[];
  shoppingItems: NewShoppingItem[];
  createdAt: string;
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
  categories: CategoryDefinition[];
  recurringExpenses: RecurringExpense[];
  pantryItems: PantryItem[];
  mealPlans: MealPlan[];
  postalCode: string;
  currency: 'EUR';
}

export type NewShoppingItem = Omit<ShoppingItem, 'id' | 'createdAt' | 'completed'>;
