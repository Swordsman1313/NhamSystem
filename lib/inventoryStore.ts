import {
  InventoryItem,
  InvoiceLineItem,
  DeductedInventoryItem,
} from './types';
import { INITIAL_PRODUCTS } from './initialData';

const INVENTORY_STORAGE_KEY = 'nhamnham_ops_packaging_inventory';

// Barcodes that use the Big 300G Box
export const BIG_BOX_BARCODES = new Set([
  '2016800000025', // Sweet Melon Cubes 300G
  '2016800000049', // Jackfruit Bites 300G
  '2016800000117', // Mixed Fresh Fruits 300G
]);

// Seed Data
export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'box-small-std',
    name: 'Standard Fruit Box (Small)',
    khmerName: 'ប្រអប់ផ្លែឈើស្តង់ដារតូច',
    category: 'box',
    onHand: 300,
    costPerUnitKHR: 380,
    lowStockThreshold: 50,
  },
  {
    id: 'box-big-300g',
    name: 'Big Fruit Box 300G',
    khmerName: 'ប្រអប់ផ្លែឈើធំ ៣០០ក្រាម',
    category: 'box',
    onHand: 200,
    costPerUnitKHR: 500,
    lowStockThreshold: 40,
  },
  {
    id: 'skewer-wood',
    name: 'Bamboo Fruit Skewer',
    khmerName: 'ឈើចាក់ផ្លែឈើឫស្សី',
    category: 'skewer',
    onHand: 1000,
    costPerUnitKHR: 30,
    lowStockThreshold: 200,
  },
  // 10 Fruit SKU UV Stickers
  ...INITIAL_PRODUCTS.map((prod) => ({
    id: `sticker-${prod.barcode}`,
    name: `UV Sticker - ${prod.name}`,
    khmerName: `ស្លាក UV ${prod.khmerName}`,
    category: 'sticker' as const,
    onHand: 100,
    costPerUnitKHR: 110,
    lowStockThreshold: 25,
    barcodeRef: prod.barcode,
  })),
];

import {
  getPackagingItems,
  savePackagingItems,
  INITIAL_PACKAGING_ITEMS,
  getProducts,
} from './storage';
import { Product } from './types';

// Safe client-side storage access via Unified Packaging Store
export function getInventory(): InventoryItem[] {
  return getPackagingItems() as unknown as InventoryItem[];
}

export function saveInventory(items: InventoryItem[]): void {
  savePackagingItems(items as unknown as any[]);
}

export function resetInventory(): void {
  savePackagingItems(INITIAL_PACKAGING_ITEMS);
}

/**
 * Calculates total packaging needed for a list of invoice line items.
 * Dynamically respects the configured Product BOM recipe (falling back to standard).
 */
export function calculateRequiredPackaging(
  items: InvoiceLineItem[]
): { itemId: string; qty: number }[] {
  const reqMap = new Map<string, number>();
  const allProducts = getProducts();
  const prodMap = new Map<string, Product>(allProducts.map((p) => [p.barcode, p]));

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    if (qty <= 0 || item.isCustom) continue;

    const matchedProduct = prodMap.get(item.barcode);

    // If product has an active BOM configured, consume that exact recipe!
    if (matchedProduct && matchedProduct.bom && matchedProduct.bom.length > 0) {
      for (const b of matchedProduct.bom) {
        reqMap.set(b.packagingItemId, (reqMap.get(b.packagingItemId) || 0) + b.quantity * qty);
      }
    } else {
      // Standard fallback if no recipe configured
      const boxId = BIG_BOX_BARCODES.has(item.barcode)
        ? 'box-big-300g'
        : 'box-small-std';
      reqMap.set(boxId, (reqMap.get(boxId) || 0) + qty);
      reqMap.set('skewer-wood', (reqMap.get('skewer-wood') || 0) + qty);
      const stickerId = `sticker-${item.barcode}`;
      reqMap.set(stickerId, (reqMap.get(stickerId) || 0) + qty);
    }
  }

  const result: { itemId: string; qty: number }[] = [];
  reqMap.forEach((qty, itemId) => {
    result.push({ itemId, qty });
  });

  return result;
}

/**
 * Checks if sufficient stock is available before creating an invoice.
 */
export function checkStockAvailability(items: InvoiceLineItem[]): {
  available: boolean;
  warnings: string[];
  required: { itemId: string; name: string; needed: number; onHand: number }[];
} {
  const inventory = getInventory();
  const invMap = new Map(inventory.map((i) => [i.id, i]));
  const needed = calculateRequiredPackaging(items);
  const warnings: string[] = [];
  const requiredList: { itemId: string; name: string; needed: number; onHand: number }[] = [];

  let allAvailable = true;

  for (const req of needed) {
    const item = invMap.get(req.itemId);
    const onHand = item ? item.onHand : 0;
    const name = item ? item.name : req.itemId;

    requiredList.push({
      itemId: req.itemId,
      name,
      needed: req.qty,
      onHand,
    });

    if (onHand < req.qty) {
      allAvailable = false;
      warnings.push(
        `Insufficient ${name}: Needs ${req.qty} pcs, but only ${onHand} pcs in stock (Short: ${req.qty - onHand} pcs).`
      );
    }
  }

  return {
    available: allAvailable,
    warnings,
    required: requiredList,
  };
}

/**
 * 1. deductForInvoice:
 * Calculates total small boxes, big boxes, skewers, and specific stickers needed.
 * Deducts those exact quantities from onHand.
 * Returns the deduction list to be saved with the invoice.
 */
export function deductForInvoice(
  items: InvoiceLineItem[]
): DeductedInventoryItem[] {
  const currentInventory = getInventory();
  const invMap = new Map(currentInventory.map((i) => [i.id, i]));
  const needed = calculateRequiredPackaging(items);

  const deductions: DeductedInventoryItem[] = [];

  for (const req of needed) {
    const item = invMap.get(req.itemId);
    if (item) {
      item.onHand = Math.max(0, item.onHand - req.qty);
      deductions.push({ itemId: req.itemId, qty: req.qty });
    }
  }

  saveInventory(Array.from(invMap.values()));
  return deductions;
}

/**
 * 2. rollbackInvoiceInventory:
 * Adds the exact deducted quantities back into onHand when an invoice is deleted or voided.
 */
export function rollbackInvoiceInventory(
  deductedItems?: DeductedInventoryItem[]
): { rolledBackCount: number; summary: string } {
  if (!deductedItems || deductedItems.length === 0) {
    return { rolledBackCount: 0, summary: 'No packaging items were logged for rollback.' };
  }

  const currentInventory = getInventory();
  const invMap = new Map(currentInventory.map((i) => [i.id, i]));

  let totalItemsRestored = 0;
  const parts: string[] = [];

  for (const record of deductedItems) {
    const item = invMap.get(record.itemId);
    if (item) {
      item.onHand += record.qty;
      totalItemsRestored += record.qty;
      parts.push(`${record.qty}x ${item.name}`);
    }
  }

  saveInventory(Array.from(invMap.values()));
  return {
    rolledBackCount: totalItemsRestored,
    summary: parts.join(', '),
  };
}

/**
 * 3. restockItem:
 * Manually increments onHand when new packaging arrives.
 */
export function restockItem(
  itemId: string,
  addedQty: number
): { success: boolean; newOnHand: number; item?: InventoryItem } {
  const currentInventory = getInventory();
  const item = currentInventory.find((i) => i.id === itemId);

  if (!item) {
    return { success: false, newOnHand: 0 };
  }

  const cleanAdd = Math.max(0, isNaN(addedQty) ? 0 : addedQty);
  item.onHand += cleanAdd;

  saveInventory(currentInventory);
  return {
    success: true,
    newOnHand: item.onHand,
    item,
  };
}

/**
 * 4. adjustItemStock:
 * Sets exact onHand (for physical stock take / audit count) or adjusts up/down.
 */
export function adjustItemStock(
  itemId: string,
  newOnHand: number,
  reason?: string
): { success: boolean; oldOnHand: number; newOnHand: number; diff: number; item?: InventoryItem } {
  const currentInventory = getInventory();
  const item = currentInventory.find((i) => i.id === itemId);

  if (!item) {
    return { success: false, oldOnHand: 0, newOnHand: 0, diff: 0 };
  }

  const oldOnHand = Number(item.onHand ?? item.currentStock ?? 0);
  const cleanOnHand = Math.max(0, isNaN(newOnHand) ? 0 : Math.round(newOnHand));
  const diff = cleanOnHand - oldOnHand;

  item.onHand = cleanOnHand;
  item.currentStock = cleanOnHand;

  saveInventory(currentInventory);
  return {
    success: true,
    oldOnHand,
    newOnHand: cleanOnHand,
    diff,
    item,
  };
}
