import {
  Product,
  Store,
  AppSettings,
  Invoice,
  BatchCostRecord,
  PackagingItem,
  BOMItem,
  CostingDraft,
  PackagingCategoryRecord,
} from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_STORES,
  INITIAL_SETTINGS,
  INITIAL_INVOICES,
  INITIAL_BATCH_COSTS,
} from './initialData';

const STORAGE_KEYS = {
  PRODUCTS: 'nhamnham_ops_products',
  PACKAGING: 'nhamnham_ops_packaging_inventory', // Unified Single Source of Truth
  CATEGORIES: 'nhamnham_ops_packaging_categories',
  STORES: 'nhamnham_ops_stores',
  SETTINGS: 'nhamnham_ops_settings',
  INVOICES: 'nhamnham_ops_invoices',
  BATCHES: 'nhamnham_ops_batches',
  COSTING_DRAFT: 'nhamnham_ops_costing_draft',
};

// Safe client-side storage access
function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to localStorage:`, err);
  }
}

// Initial Unified Packaging Items Seed
export const INITIAL_PACKAGING_ITEMS: PackagingItem[] = [
  {
    id: 'box-small-std',
    name: 'Standard Fruit Box (Small)',
    khmerName: 'ប្រអប់ផ្លែឈើស្តង់ដារតូច',
    category: 'box',
    unitCostKHR: 380,
    costPerUnitKHR: 380,
    onHand: 300,
    lowStockThreshold: 50,
  },
  {
    id: 'box-big-300g',
    name: 'Big Fruit Box 300G',
    khmerName: 'ប្រអប់ផ្លែឈើធំ ៣០០ក្រាម',
    category: 'box',
    unitCostKHR: 500,
    costPerUnitKHR: 500,
    onHand: 200,
    lowStockThreshold: 40,
  },
  {
    id: 'skewer-wood',
    name: 'Bamboo Fruit Skewer',
    khmerName: 'ឈើចាក់ផ្លែឈើឫស្សី',
    category: 'skewer',
    unitCostKHR: 30,
    costPerUnitKHR: 30,
    onHand: 1000,
    lowStockThreshold: 200,
  },
  {
    id: 'sticker-sweet-melon',
    name: 'UV Sticker - Sweet Melon 300G',
    khmerName: 'ស្លាក UV ត្រសក់ផ្អែមស្រស់',
    category: 'sticker',
    unitCostKHR: 110,
    costPerUnitKHR: 110,
    onHand: 100,
    lowStockThreshold: 25,
    barcodeRef: '2016800000025',
  },
  {
    id: 'sticker-baby-mango',
    name: 'UV Sticker - Baby Mango',
    khmerName: 'ស្លាក UV ក្តឹបស្វាយស្រស់',
    category: 'sticker',
    unitCostKHR: 110,
    costPerUnitKHR: 110,
    onHand: 100,
    lowStockThreshold: 25,
    barcodeRef: '2016800000032',
  },
  {
    id: 'sticker-jackfruit',
    name: 'UV Sticker - Jackfruit 300G',
    khmerName: 'ស្លាក UV ខ្នុរសាច់លឿងស្រស់',
    category: 'sticker',
    unitCostKHR: 110,
    costPerUnitKHR: 110,
    onHand: 100,
    lowStockThreshold: 25,
    barcodeRef: '2016800000049',
  },
  {
    id: 'sticker-guava',
    name: 'UV Sticker - Guava',
    khmerName: 'ស្លាក UV ត្របែកកាត់',
    category: 'sticker',
    unitCostKHR: 110,
    costPerUnitKHR: 110,
    onHand: 100,
    lowStockThreshold: 25,
    barcodeRef: '2016800000056',
  },
  {
    id: 'sticker-papaya',
    name: 'UV Sticker - Papaya Cubes',
    khmerName: 'ស្លាក UV ល្ហុងទុំស្រស់',
    category: 'sticker',
    unitCostKHR: 110,
    costPerUnitKHR: 110,
    onHand: 100,
    lowStockThreshold: 25,
    barcodeRef: '2016800000063',
  },
  {
    id: 'sticker-jicama',
    name: 'UV Sticker - Jicama',
    khmerName: 'ស្លាក UV ប៉ិកួក់ស្រស់',
    category: 'sticker',
    unitCostKHR: 110,
    costPerUnitKHR: 110,
    onHand: 100,
    lowStockThreshold: 25,
    barcodeRef: '2016800000070',
  },
  {
    id: 'sticker-jujube',
    name: 'UV Sticker - Jujube',
    khmerName: 'ស្លាក UV ពុទ្រាស្រស់',
    category: 'sticker',
    unitCostKHR: 110,
    costPerUnitKHR: 110,
    onHand: 100,
    lowStockThreshold: 25,
    barcodeRef: '2016800000087',
  },
  {
    id: 'sticker-mixed-sour',
    name: 'UV Sticker - Mixed Sour',
    khmerName: 'ស្លាក UV ម្ជូរចម្រុះ',
    category: 'sticker',
    unitCostKHR: 110,
    costPerUnitKHR: 110,
    onHand: 100,
    lowStockThreshold: 25,
    barcodeRef: '2016800000094',
  },
  {
    id: 'sticker-pickled-grapes',
    name: 'UV Sticker - Pickled Grapes',
    khmerName: 'ស្លាក UV ទំពាំងបាយជូរត្រាំ',
    category: 'sticker',
    unitCostKHR: 110,
    costPerUnitKHR: 110,
    onHand: 100,
    lowStockThreshold: 25,
    barcodeRef: '2016800000100',
  },
  {
    id: 'sticker-mixed-fresh',
    name: 'UV Sticker - Mixed Fresh 300G',
    khmerName: 'ស្លាក UV ផ្លែឈើស្រស់ចម្រុះ ៣០០ក្រាម',
    category: 'sticker',
    unitCostKHR: 110,
    costPerUnitKHR: 110,
    onHand: 100,
    lowStockThreshold: 25,
    barcodeRef: '2016800000117',
  },
  {
    id: 'chili-salt-sachet',
    name: 'Chili Salt Sachet (Dip)',
    khmerName: 'កញ្ចប់អំបិលម្ទេស (បន្ថែម)',
    category: 'other',
    unitCostKHR: 50,
    costPerUnitKHR: 50,
    onHand: 500,
    lowStockThreshold: 100,
  },
];

// Unified Packaging Items CRUD (Single Source of Truth)
export function getPackagingItems(): PackagingItem[] {
  // If legacy packaging items key exists and unified key does not, migrate it
  if (typeof window !== 'undefined') {
    const unifiedRaw = localStorage.getItem(STORAGE_KEYS.PACKAGING);
    const legacyRaw = localStorage.getItem('nhamnham_ops_packaging_items');
    if (!unifiedRaw && legacyRaw) {
      localStorage.setItem(STORAGE_KEYS.PACKAGING, legacyRaw);
    }
  }

  const rawList = getItem<any[]>(STORAGE_KEYS.PACKAGING, INITIAL_PACKAGING_ITEMS);
  return rawList.map((item) => {
    const unitCost = Number(item.unitCostKHR ?? item.costPerUnitKHR ?? 0);
    const name = item.id === 'sticker-papaya' && (item.name === 'UV Sticker - Papaya' || !item.name)
      ? 'UV Sticker - Papaya Cubes'
      : item.name;
    return {
      ...item,
      id: item.id,
      name: name,
      khmerName: item.khmerName || '',
      category: item.category || 'other',
      unitCostKHR: unitCost,
      costPerUnitKHR: unitCost,
      onHand: Number(item.onHand ?? 0),
      lowStockThreshold: Number(item.lowStockThreshold ?? 25),
      barcodeRef: item.barcodeRef,
    };
  });
}

export function savePackagingItems(items: PackagingItem[]): void {
  const normalized = items.map((item) => {
    const unitCost = Number(item.unitCostKHR ?? item.costPerUnitKHR ?? 0);
    return {
      ...item,
      unitCostKHR: unitCost,
      costPerUnitKHR: unitCost,
      onHand: Number(item.onHand ?? 0),
      lowStockThreshold: Number(item.lowStockThreshold ?? 25),
    };
  });
  setItem(STORAGE_KEYS.PACKAGING, normalized);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('packaging_updated'));
    window.dispatchEvent(new Event('inventory_updated'));
  }
}

export function addPackagingItem(item: PackagingItem): PackagingItem {
  const current = getPackagingItems();
  const exists = current.some((i) => i.id === item.id);
  const unitCost = Number(item.unitCostKHR ?? item.costPerUnitKHR ?? 0);
  const newItem: PackagingItem = {
    ...item,
    id: exists ? `${item.id}-${Date.now()}` : item.id,
    unitCostKHR: unitCost,
    costPerUnitKHR: unitCost,
    onHand: Number(item.onHand ?? 0),
    lowStockThreshold: Number(item.lowStockThreshold ?? 25),
  };
  const updated = [...current, newItem];
  savePackagingItems(updated);
  return newItem;
}

export function updatePackagingItem(item: PackagingItem): void {
  const current = getPackagingItems();
  const idx = current.findIndex((i) => i.id === item.id);
  if (idx !== -1) {
    const unitCost = Number(item.unitCostKHR ?? item.costPerUnitKHR ?? 0);
    current[idx] = {
      ...current[idx],
      ...item,
      unitCostKHR: unitCost,
      costPerUnitKHR: unitCost,
      onHand: Number(item.onHand ?? 0),
    };
    savePackagingItems([...current]);
  }
}

export function deletePackagingItem(id: string): void {
  const current = getPackagingItems();
  savePackagingItems(current.filter((i) => i.id !== id));
}

// Product Normalizer & Helper
function getInitialProductBOM(barcode: string): BOMItem[] {
  const isBigBox = ['2016800000025', '2016800000049', '2016800000117'].includes(barcode);
  const boxId = isBigBox ? 'box-big-300g' : 'box-small-std';
  const stickerMap: Record<string, string> = {
    '2016800000025': 'sticker-sweet-melon',
    '2016800000032': 'sticker-baby-mango',
    '2016800000049': 'sticker-jackfruit',
    '2016800000056': 'sticker-guava',
    '2016800000063': 'sticker-papaya',
    '2016800000070': 'sticker-jicama',
    '2016800000087': 'sticker-jujube',
    '2016800000094': 'sticker-mixed-sour',
    '2016800000100': 'sticker-pickled-grapes',
    '2016800000117': 'sticker-mixed-fresh',
  };
  const stickerId = stickerMap[barcode] || `sticker-${barcode}`;

  return [
    { packagingItemId: boxId, quantity: 1 },
    { packagingItemId: stickerId, quantity: 1 },
    { packagingItemId: 'skewer-wood', quantity: 1 },
  ];
}

export function normalizeProduct(p: Product): Product {
  const nameEn = p.nameEn || p.name || 'Unnamed Product';
  const nameKh = p.nameKh || p.khmerName || 'ផលិតផលគ្មានឈ្មោះ';
  const wholesalePriceUSD = p.wholesalePriceUSD ?? p.wholesalePrice ?? 0;
  return {
    ...p,
    id: p.id || `prod-${p.barcode}`,
    barcode: p.barcode,
    name: nameEn,
    khmerName: nameKh,
    nameEn,
    nameKh,
    uom: p.uom || 'Pcs',
    wholesalePrice: wholesalePriceUSD,
    wholesalePriceUSD,
    bom: p.bom && p.bom.length > 0 ? p.bom : getInitialProductBOM(p.barcode),
  };
}

// Products CRUD
export function getProducts(): Product[] {
  const rawList = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  return rawList.map(normalizeProduct);
}

export function saveProducts(products: Product[]): void {
  const normalized = products.map(normalizeProduct);
  setItem(STORAGE_KEYS.PRODUCTS, normalized);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('products_updated'));
  }
}

export function addProduct(product: Product): Product {
  const normalized = normalizeProduct(product);
  const current = getProducts();
  const updated = [normalized, ...current.filter((p) => p.barcode !== normalized.barcode && p.id !== normalized.id)];
  saveProducts(updated);
  return normalized;
}

export function updateProduct(product: Product): void {
  const normalized = normalizeProduct(product);
  const current = getProducts();
  const idx = current.findIndex((p) => p.id === normalized.id || p.barcode === normalized.barcode);
  if (idx !== -1) {
    current[idx] = normalized;
    saveProducts([...current]);
  } else {
    addProduct(normalized);
  }
}

export function deleteProduct(idOrBarcode: string): void {
  const current = getProducts();
  saveProducts(current.filter((p) => p.id !== idOrBarcode && p.barcode !== idOrBarcode));
}

// Packaging Categories CRUD
export const INITIAL_PACKAGING_CATEGORIES: PackagingCategoryRecord[] = [
  { id: 'box', name: 'Box', isProtected: true },
  { id: 'sticker', name: 'UV Sticker', isProtected: true },
  { id: 'skewer', name: 'Skewer', isProtected: true },
  { id: 'other', name: 'Other', isProtected: false },
];

export function getPackagingCategories(): PackagingCategoryRecord[] {
  const raw = getItem<any[]>(STORAGE_KEYS.CATEGORIES, INITIAL_PACKAGING_CATEGORIES);
  const map = new Map<string, PackagingCategoryRecord>();
  INITIAL_PACKAGING_CATEGORIES.forEach((c) => map.set(c.id, c));
  raw.forEach((c) => {
    if (c && c.id) {
      map.set(c.id, {
        id: c.id,
        name: c.name || c.id,
        isProtected: c.isProtected ?? (c.id === 'box' || c.id === 'sticker' || c.id === 'skewer'),
      });
    }
  });
  return Array.from(map.values());
}

export function savePackagingCategories(categories: PackagingCategoryRecord[]): void {
  setItem(STORAGE_KEYS.CATEGORIES, categories);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('categories_updated'));
  }
}

export const saveCategories = savePackagingCategories;
export const getCategories = getPackagingCategories;

export function addPackagingCategory(name: string): PackagingCategoryRecord | null {
  const cleanName = name.trim();
  if (!cleanName) return null;
  const current = getPackagingCategories();
  const existing = current.find((c) => c.name.toLowerCase() === cleanName.toLowerCase());
  if (existing) return null;

  const id =
    cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;
  const uniqueId = current.some((c) => c.id === id) ? `${id}-${Date.now().toString().slice(-4)}` : id;

  const newCat: PackagingCategoryRecord = {
    id: uniqueId,
    name: cleanName,
    isProtected: false,
  };
  const updated = [...current, newCat];
  savePackagingCategories(updated);
  return newCat;
}

export function updatePackagingCategory(cat: PackagingCategoryRecord): PackagingCategoryRecord {
  const current = getPackagingCategories();
  const updated = current.map((c) => (c.id === cat.id ? { ...c, name: cat.name.trim() } : c));
  savePackagingCategories(updated);
  return cat;
}

export function renamePackagingCategory(categoryId: string, newName: string): { success: boolean; error?: string; oldName?: string } {
  const cleanName = newName.trim();
  if (!cleanName) return { success: false, error: 'Category name cannot be blank.' };

  const current = getPackagingCategories();
  const cat = current.find((c) => c.id === categoryId);
  if (!cat) return { success: false, error: 'Category not found.' };

  const duplicate = current.find(
    (c) => c.id !== categoryId && c.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (duplicate) return { success: false, error: `Category "${cleanName}" already exists.` };

  const oldName = cat.name;
  cat.name = cleanName;
  savePackagingCategories(current);

  // Cascade update all items in packagingItems
  const items = getPackagingItems();
  let updatedAny = false;
  const updatedItems = items.map((item) => {
    const itemCat = typeof item.category === 'string' ? item.category : (item.category as any)?.id || (item.category as any)?.name;
    if (
      itemCat === oldName ||
      itemCat?.toLowerCase() === oldName.toLowerCase() ||
      (!cat.isProtected && (itemCat === categoryId || itemCat?.toLowerCase() === categoryId.toLowerCase()))
    ) {
      updatedAny = true;
      return {
        ...item,
        category: cleanName,
      };
    }
    return item;
  });

  if (updatedAny) {
    savePackagingItems(updatedItems);
  }

  return { success: true, oldName };
}

export function deletePackagingCategory(id: string): boolean {
  if (id === 'box' || id === 'sticker' || id === 'skewer') {
    return false;
  }
  const current = getPackagingCategories();
  const updated = current.filter((c) => c.id !== id);
  savePackagingCategories(updated);
  return true;
}

// Stores CRUD
export function getStores(): Store[] {
  const raw = getItem<any[]>(STORAGE_KEYS.STORES, INITIAL_STORES);
  return raw.map((s, idx) => ({
    id: s.id || `store-${(s.code || String(idx + 1)).toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    code: s.code || `STORE-${idx + 1}`,
    customerName: s.customerName || '',
    shipTo: s.shipTo || '',
    address: s.address || '',
    phone: s.phone || '',
    termsDays: Number(s.termsDays ?? s.creditTermsDays ?? 15),
    creditTermsDays: Number(s.creditTermsDays ?? s.termsDays ?? 15),
    isActive: s.isActive !== false,
  }));
}

export function saveStores(stores: Store[]): void {
  setItem(STORAGE_KEYS.STORES, stores);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('stores_updated'));
  }
}

export function addStore(storeData: Partial<Store>): Store {
  const current = getStores();
  const code = (storeData.code || `STORE-${current.length + 1}`).trim().toUpperCase();
  const id = storeData.id || `store-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const terms = Number(storeData.termsDays ?? storeData.creditTermsDays ?? 15);

  const newStore: Store = {
    id,
    code,
    customerName: (storeData.customerName || '').trim(),
    shipTo: (storeData.shipTo || '').trim(),
    address: (storeData.address || '').trim(),
    phone: (storeData.phone || '').trim(),
    termsDays: terms,
    creditTermsDays: terms,
    isActive: storeData.isActive !== false,
  };

  const existsIdx = current.findIndex((s) => s.id === id || s.code === code);
  let updated: Store[];
  if (existsIdx !== -1) {
    updated = [...current];
    updated[existsIdx] = newStore;
  } else {
    updated = [...current, newStore];
  }
  saveStores(updated);
  return newStore;
}

export function updateStore(store: Store): Store {
  const current = getStores();
  const terms = Number(store.termsDays ?? store.creditTermsDays ?? 15);
  const normalized: Store = {
    ...store,
    termsDays: terms,
    creditTermsDays: terms,
    isActive: store.isActive !== false,
  };
  const updated = current.map((s) => (s.id === store.id || s.code === store.code ? normalized : s));
  saveStores(updated);
  return normalized;
}

export function deleteStore(idOrCode: string): void {
  const current = getStores();
  const updated = current.filter((s) => s.id !== idOrCode && s.code !== idOrCode);
  saveStores(updated);
}

export function toggleStoreActive(idOrCode: string): Store | null {
  const current = getStores();
  const target = current.find((s) => s.id === idOrCode || s.code === idOrCode);
  if (!target) return null;
  const updatedStore: Store = { ...target, isActive: !target.isActive };
  const updated = current.map((s) => (s.id === target.id ? updatedStore : s));
  saveStores(updated);
  return updatedStore;
}

// Settings
export function getSettings(): AppSettings {
  return getItem<AppSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  setItem(STORAGE_KEYS.SETTINGS, settings);
}

// Invoices
export function getInvoices(): Invoice[] {
  return getItem<Invoice[]>(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
}

export function saveInvoices(invoices: Invoice[]): void {
  setItem(STORAGE_KEYS.INVOICES, invoices);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('invoices_updated'));
  }
}

export function addInvoice(invoice: Invoice): Invoice {
  const current = getInvoices();
  const updated = [invoice, ...current];
  saveInvoices(updated);
  return invoice;
}

export function updateInvoice(invoice: Invoice): void {
  const current = getInvoices();
  const idx = current.findIndex((i) => i.id === invoice.id);
  if (idx !== -1) {
    current[idx] = invoice;
    saveInvoices([...current]);
  }
}

export function deleteInvoice(id: string): void {
  const current = getInvoices();
  saveInvoices(current.filter((i) => i.id !== id));
}

// Batches
export function getBatches(): BatchCostRecord[] {
  return getItem<BatchCostRecord[]>(STORAGE_KEYS.BATCHES, INITIAL_BATCH_COSTS);
}

export function saveBatches(batches: BatchCostRecord[]): void {
  setItem(STORAGE_KEYS.BATCHES, batches);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('batches_updated'));
  }
}

export function addBatch(batch: BatchCostRecord): BatchCostRecord {
  const current = getBatches();
  const updated = [batch, ...current];
  saveBatches(updated);
  return batch;
}

export function deleteBatch(id: string): void {
  const current = getBatches();
  saveBatches(current.filter((b) => b.id !== id));
}

// Sequential Invoice Number Generator: INV-YYMM-XXX
export function generateNextInvoiceNumber(dateStr?: string): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${yy}${mm}-`;

  const invoices = getInvoices();
  const matchingInvoices = invoices.filter((inv) =>
    inv.invoiceNumber.startsWith(prefix)
  );

  let maxNum = 0;
  for (const inv of matchingInvoices) {
    const suffix = inv.invoiceNumber.replace(prefix, '');
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  const nextSeq = String(maxNum + 1).padStart(3, '0');
  return `${prefix}${nextSeq}`;
}

// Sequential Batch Number Generator: BATCH-YYMMDD-XXX
export function generateNextBatchNumber(dateStr?: string): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const prefix = `BATCH-${yy}${mm}${dd}-`;

  const batches = getBatches();
  const matching = batches.filter((b) => b.batchNumber.startsWith(prefix));

  let maxNum = 0;
  for (const b of matching) {
    const suffix = b.batchNumber.replace(prefix, '');
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  const nextSeq = String(maxNum + 1).padStart(2, '0');
  return `${prefix}${nextSeq}`;
}

// Date helpers
export function calculateDueDate(invoiceDateStr: string, days: number = 15): string {
  try {
    const [year, month, day] = invoiceDateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return invoiceDateStr;
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Formatting helpers
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatKHR(amount: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));
  return `${formatted} ៛`;
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    const formatted = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return formatted.replace(/\s+/g, '-');
  } catch {
    return dateStr;
  }
}

// Export / Import / Reset
export function exportAllData(): string {
  const data = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    stores: getStores(),
    products: getProducts(),
    invoices: getInvoices(),
    batches: getBatches(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.settings) saveSettings(parsed.settings);
    if (parsed.stores && Array.isArray(parsed.stores)) saveStores(parsed.stores);
    if (parsed.products && Array.isArray(parsed.products)) saveProducts(parsed.products);
    if (parsed.invoices && Array.isArray(parsed.invoices)) saveInvoices(parsed.invoices);
    if (parsed.batches && Array.isArray(parsed.batches)) saveBatches(parsed.batches);
    return true;
  } catch (err) {
    console.error('Failed to import backup data:', err);
    return false;
  }
}

export function resetAllData(): void {
  saveSettings(INITIAL_SETTINGS);
  saveStores(INITIAL_STORES);
  saveProducts(INITIAL_PRODUCTS);
  savePackagingCategories(INITIAL_PACKAGING_CATEGORIES);
  saveInvoices(INITIAL_INVOICES);
  saveBatches(INITIAL_BATCH_COSTS);
  clearCostingDraft();
}

// In-progress Batch Costing Draft (Auto-Save)
export function getCostingDraft(): CostingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COSTING_DRAFT);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading costing draft:', err);
    return null;
  }
}

export function saveCostingDraft(draft: CostingDraft): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.COSTING_DRAFT, JSON.stringify(draft));
  } catch (err) {
    console.error('Error saving costing draft:', err);
  }
}

export function clearCostingDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.COSTING_DRAFT);
  } catch (err) {
    console.error('Error clearing costing draft:', err);
  }
}

