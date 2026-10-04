export type PackagingCategory = 'box' | 'sticker' | 'skewer' | 'other';
export type InventoryCategory = PackagingCategory;

export interface PackagingItem {
  id: string;
  name: string;
  khmerName?: string;
  category: PackagingCategory;
  unitCostKHR: number;
  costPerUnitKHR?: number; // alias for InventoryItem compatibility
  onHand: number;
  lowStockThreshold?: number;
  barcodeRef?: string;
}

export interface BOMItem {
  packagingItemId: string;
  quantity: number;
}

export interface Product {
  id?: string;
  barcode: string;
  name: string;
  khmerName: string;
  nameEn?: string;
  nameKh?: string;
  uom: string;
  wholesalePrice: number; // in USD
  wholesalePriceUSD?: number; // in USD
  bom?: BOMItem[];
}

export interface Store {
  code: string;
  customerName: string; // Bill To
  shipTo: string;
  address: string;
  phone: string;
  creditTermsDays: number; // default 15
}

export interface SupplierProfile {
  name: string;
  khmerName: string;
  address: string;
  phone: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
}

export interface InvoiceLineItem {
  id: string;
  barcode: string;
  name: string;
  khmerName: string;
  uom: string;
  quantity: number;
  unitPrice: number; // USD
  isCustom?: boolean;
}

export type InvoiceStatus = 'pending' | 'paid_aba' | 'paid_cash';

export interface DeductedInventoryItem {
  itemId: string;
  qty: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2610-001
  storeCode: string;
  customerName: string;
  shipTo: string;
  address: string;
  phone: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  items: InvoiceLineItem[];
  totalQuantity: number;
  totalAmountUSD: number;
  totalAmountKHR: number;
  status: InvoiceStatus;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  deductedItems?: DeductedInventoryItem[];
}

export interface BatchYieldItem {
  barcode: string;
  name: string;
  khmerName: string;
  boxes: number;
}

export interface BatchCostRecord {
  id: string;
  batchNumber: string;
  date: string;
  marketSpendKHR: number;
  fuelExpenseKHR: number;
  tubStickerBOMKHR: number;
  packagingBOMPerBoxKHR?: number; // Weighted dynamic packaging BOM per box
  totalPackagingBOMCostKHR?: number; // Total packaging cost for all yielded boxes
  isDynamicBOM?: boolean; // True if calculated from live product recipes
  coldWashBOMKHR: number;
  exchangeRate: number;
  yieldItems: BatchYieldItem[];
  totalBoxesYielded: number;
  rawFruitCostPerBoxKHR: number;
  fuelSharePerBoxKHR: number;
  landedUnitCostKHR: number;
  landedUnitCostUSD: number;
  deliveryRevenueUSD: number;
  netProfitUSD: number;
  netProfitKHR: number;
  grossMarginPercent: number;
  createdAt: string;
  notes?: string;
}

export interface AppSettings {
  exchangeRate: number; // KHR per 1 USD, default 4050
  defaultTubStickerKHR: number; // 500
  defaultColdWashKHR: number; // 10
  defaultFuelKHR: number; // 8000
  defaultCreditTermsDays: number; // 15
  supplierProfile: SupplierProfile;
}

export interface InventoryItem {
  id: string;
  name: string;
  khmerName?: string;
  category: PackagingCategory;
  onHand: number;
  costPerUnitKHR: number;
  unitCostKHR?: number; // alias for PackagingItem compatibility
  lowStockThreshold: number;
  barcodeRef?: string; // Links stickers to product barcode
}
