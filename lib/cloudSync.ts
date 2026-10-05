import { supabase, isSupabaseConfigured } from './supabase';
import {
  AppSettings,
  Store,
  Product,
  PackagingItem,
  PackagingCategoryRecord,
  Invoice,
  BatchCostRecord,
} from './types';

// Storage keys matching lib/storage.ts
const STORAGE_KEYS = {
  PRODUCTS: 'nhamnham_ops_products',
  PACKAGING: 'nhamnham_ops_packaging_inventory',
  CATEGORIES: 'nhamnham_ops_packaging_categories',
  STORES: 'nhamnham_ops_stores',
  SETTINGS: 'nhamnham_ops_settings',
  INVOICES: 'nhamnham_ops_invoices',
  BATCHES: 'nhamnham_ops_batches',
};

let syncInitialized = false;

// Safe client-side storage setter
function setLocal(key: string, value: any): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Error setting local ${key}:`, err);
  }
}

function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

/**
 * Initialize Cloud Synchronization:
 * 1. Pull latest cloud data into localStorage.
 * 2. If cloud is empty, seed cloud with local data.
 * 3. Subscribe to Realtime Postgres Changes across devices.
 */
export async function initCloudSync(): Promise<void> {
  if (!isSupabaseConfigured || typeof window === 'undefined') return;
  if (syncInitialized) return;
  syncInitialized = true;

  try {
    await pullAllFromCloud();
    setupRealtimeSubscription();
  } catch (err) {
    console.warn('Cloud sync init error (using local storage):', err);
  }
}

/**
 * Pull all data from Supabase and update local storage & UI state
 */
export async function pullAllFromCloud(): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    // 1. Settings
    const { data: settingsRow, error: settingsErr } = await supabase
      .from('nham_settings')
      .select('data')
      .eq('id', 'app_settings')
      .single();

    if (!settingsErr && settingsRow?.data) {
      setLocal(STORAGE_KEYS.SETTINGS, settingsRow.data);
      window.dispatchEvent(new Event('storage'));
    } else if (settingsErr && settingsErr.code === 'PGRST116') {
      // Row not found, push local settings to cloud
      const localSettings = getLocal<any>(STORAGE_KEYS.SETTINGS, null);
      if (localSettings) {
        await syncSettingsToCloud(localSettings);
      }
    }

    // 2. Stores
    const { data: storesRows, error: storesErr } = await supabase
      .from('nham_stores')
      .select('*')
      .order('code', { ascending: true });

    if (!storesErr && storesRows && storesRows.length > 0) {
      const stores: Store[] = storesRows.map((r) => ({
        id: r.id,
        code: r.code,
        customerName: r.customer_name || r.data?.customerName || '',
        shipTo: r.ship_to || r.data?.shipTo || '',
        address: r.address || r.data?.address || '',
        phone: r.phone || r.data?.phone || '',
        termsDays: Number(r.terms_days ?? r.data?.termsDays ?? 15),
        creditTermsDays: Number(r.terms_days ?? r.data?.termsDays ?? 15),
        isActive: r.is_active !== false,
      }));
      setLocal(STORAGE_KEYS.STORES, stores);
      window.dispatchEvent(new Event('stores_updated'));
    } else if (!storesErr && storesRows && storesRows.length === 0) {
      // Cloud stores empty, seed from local
      const localStores = getLocal<Store[]>(STORAGE_KEYS.STORES, []);
      for (const s of localStores) {
        await syncStoreToCloud(s);
      }
    }

    // 3. Products
    const { data: productsRows, error: prodErr } = await supabase
      .from('nham_products')
      .select('*')
      .order('name', { ascending: true });

    if (!prodErr && productsRows && productsRows.length > 0) {
      const products: Product[] = productsRows.map((r) => ({
        id: r.id,
        barcode: r.barcode,
        name: r.name,
        khmerName: r.khmer_name || r.data?.khmerName || '',
        nameEn: r.name_en || r.name,
        nameKh: r.name_kh || r.khmer_name || '',
        wholesalePrice: Number(r.wholesale_price ?? r.data?.wholesalePrice ?? 0),
        wholesalePriceUSD: Number(r.wholesale_price ?? r.data?.wholesalePrice ?? 0),
        uom: r.uom || 'Pcs',
        bom: r.bom || r.data?.bom || [],
      }));
      setLocal(STORAGE_KEYS.PRODUCTS, products);
      window.dispatchEvent(new Event('products_updated'));
    } else if (!prodErr && productsRows && productsRows.length === 0) {
      const localProducts = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, []);
      for (const p of localProducts) {
        await syncProductToCloud(p);
      }
    }

    // 4. Packaging Inventory
    const { data: pkgRows, error: pkgErr } = await supabase
      .from('nham_packaging')
      .select('*')
      .order('name', { ascending: true });

    if (!pkgErr && pkgRows && pkgRows.length > 0) {
      const items: PackagingItem[] = pkgRows.map((r) => ({
        id: r.id,
        name: r.name,
        khmerName: r.khmer_name || '',
        category: r.category || 'other',
        unitCostKHR: Number(r.unit_cost_khr ?? 0),
        costPerUnitKHR: Number(r.unit_cost_khr ?? 0),
        onHand: Number(r.on_hand ?? 0),
        lowStockThreshold: Number(r.low_stock_threshold ?? 25),
        barcodeRef: r.barcode_ref || undefined,
      }));
      setLocal(STORAGE_KEYS.PACKAGING, items);
      window.dispatchEvent(new Event('packaging_updated'));
      window.dispatchEvent(new Event('inventory_updated'));
    } else if (!pkgErr && pkgRows && pkgRows.length === 0) {
      const localPkg = getLocal<PackagingItem[]>(STORAGE_KEYS.PACKAGING, []);
      for (const item of localPkg) {
        await syncPackagingToCloud(item);
      }
    }

    // 5. Categories
    const { data: catRows, error: catErr } = await supabase
      .from('nham_categories')
      .select('*');

    if (!catErr && catRows && catRows.length > 0) {
      const categories: PackagingCategoryRecord[] = catRows.map((r) => ({
        id: r.id,
        name: r.name,
        isProtected: r.is_protected === true,
      }));
      setLocal(STORAGE_KEYS.CATEGORIES, categories);
      window.dispatchEvent(new Event('categories_updated'));
    } else if (!catErr && catRows && catRows.length === 0) {
      const localCats = getLocal<PackagingCategoryRecord[]>(STORAGE_KEYS.CATEGORIES, []);
      for (const c of localCats) {
        await syncCategoryToCloud(c);
      }
    }

    // 6. Invoices
    const { data: invRows, error: invErr } = await supabase
      .from('nham_invoices')
      .select('*')
      .order('invoice_date', { ascending: false });

    if (!invErr && invRows && invRows.length > 0) {
      const invoices: Invoice[] = invRows.map((r) => {
        const d = r.data || {};
        return {
          ...d,
          id: r.id,
          invoiceNumber: r.invoice_number || d.invoiceNumber || '',
          invoiceDate: r.invoice_date || d.invoiceDate || '',
          dueDate: r.due_date || d.dueDate || '',
          storeCode: r.store_code || d.storeCode || '',
          customerName: d.customerName || '',
          shipTo: d.shipTo || '',
          address: d.address || '',
          phone: d.phone || '',
          totalQuantity: Number(r.total_quantity ?? d.totalQuantity ?? 0),
          totalAmountUSD: Number(r.total_amount_usd ?? d.totalAmountUSD ?? 0),
          totalAmountKHR: Number(r.total_amount_khr ?? d.totalAmountKHR ?? 0),
          status: (r.status as any) || d.status || 'pending',
          paidAt: d.paidAt,
          notes: d.notes,
          items: r.items || d.items || [],
          createdAt: d.createdAt || r.created_at || new Date().toISOString(),
        } as Invoice;
      });
      setLocal(STORAGE_KEYS.INVOICES, invoices);
      window.dispatchEvent(new Event('invoices_updated'));
    } else if (!invErr && invRows && invRows.length === 0) {
      const localInvoices = getLocal<Invoice[]>(STORAGE_KEYS.INVOICES, []);
      for (const inv of localInvoices) {
        await syncInvoiceToCloud(inv);
      }
    }

    // 7. Batches
    const { data: batchRows, error: batchErr } = await supabase
      .from('nham_batches')
      .select('*')
      .order('date', { ascending: false });

    if (!batchErr && batchRows && batchRows.length > 0) {
      const batches: BatchCostRecord[] = batchRows.map((r) => {
        const d = r.data || {};
        return {
          ...d,
          id: r.id,
          batchNumber: r.batch_number || d.batchNumber || '',
          date: r.date || d.date || '',
          marketSpendKHR: Number(r.market_spend_khr ?? d.marketSpendKHR ?? 0),
          fuelExpenseKHR: Number(r.fuel_expense_khr ?? d.fuelExpenseKHR ?? 0),
          totalBoxesYielded: Number(r.total_boxes_yielded ?? d.totalBoxesYielded ?? 0),
          landedUnitCostKHR: Number(r.landed_unit_cost_khr ?? d.landedUnitCostKHR ?? 0),
          landedUnitCostUSD: Number(r.landed_unit_cost_usd ?? d.landedUnitCostUSD ?? 0),
          tubStickerBOMKHR: Number(d.tubStickerBOMKHR ?? 0),
          coldWashBOMKHR: Number(d.coldWashBOMKHR ?? 0),
          exchangeRate: Number(d.exchangeRate ?? 4050),
          yieldItems: d.yieldItems || [],
          rawFruitCostPerBoxKHR: Number(d.rawFruitCostPerBoxKHR ?? 0),
          fuelSharePerBoxKHR: Number(d.fuelSharePerBoxKHR ?? 0),
          deliveryRevenueUSD: Number(r.delivery_revenue_usd ?? d.deliveryRevenueUSD ?? 0),
          netProfitUSD: Number(d.netProfitUSD ?? 0),
          netProfitKHR: Number(d.netProfitKHR ?? 0),
          grossMarginPercent: Number(d.grossMarginPercent ?? 0),
          createdAt: d.createdAt || r.created_at || new Date().toISOString(),
          notes: d.notes || '',
        } as BatchCostRecord;
      });
      setLocal(STORAGE_KEYS.BATCHES, batches);
      window.dispatchEvent(new Event('batches_updated'));
    } else if (!batchErr && batchRows && batchRows.length === 0) {
      const localBatches = getLocal<BatchCostRecord[]>(STORAGE_KEYS.BATCHES, []);
      for (const b of localBatches) {
        await syncBatchToCloud(b);
      }
    }
  } catch (err) {
    console.warn('Pull from cloud encountered an error:', err);
  }
}

/**
 * Setup Supabase Realtime Channels to react to changes made on other devices
 */
function setupRealtimeSubscription(): void {
  try {
    supabase
      .channel('nham_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nham_settings' },
        (payload) => {
          if (payload.new && (payload.new as any).data) {
            setLocal(STORAGE_KEYS.SETTINGS, (payload.new as any).data);
            window.dispatchEvent(new Event('storage'));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nham_stores' },
        () => {
          pullAllFromCloud();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nham_products' },
        () => {
          pullAllFromCloud();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nham_packaging' },
        () => {
          pullAllFromCloud();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nham_invoices' },
        () => {
          pullAllFromCloud();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nham_batches' },
        () => {
          pullAllFromCloud();
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscription error:', err);
  }
}

// ==========================================
// PUSH / UPSERT HELPERS (Called from lib/storage.ts)
// ==========================================

export async function syncSettingsToCloud(settings: AppSettings): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('nham_settings').upsert({
      id: 'app_settings',
      data: settings,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Sync settings error:', err);
  }
}

export async function syncStoreToCloud(store: Store): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('nham_stores').upsert({
      id: store.id,
      code: store.code,
      customer_name: store.customerName,
      ship_to: store.shipTo,
      address: store.address,
      phone: store.phone,
      terms_days: store.termsDays || store.creditTermsDays || 15,
      is_active: store.isActive !== false,
      data: store,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Sync store error:', err);
  }
}

export async function deleteStoreFromCloud(idOrCode: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('nham_stores')
      .delete()
      .or(`id.eq.${idOrCode},code.eq.${idOrCode}`);
  } catch (err) {
    console.warn('Delete store error:', err);
  }
}

export async function syncProductToCloud(product: Product): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('nham_products').upsert({
      id: product.id,
      barcode: product.barcode,
      name: product.name,
      khmer_name: product.khmerName || '',
      name_en: product.nameEn || product.name,
      name_kh: product.nameKh || product.khmerName || '',
      wholesale_price: product.wholesalePriceUSD ?? product.wholesalePrice ?? 0,
      uom: product.uom || 'Pcs',
      bom: product.bom || [],
      data: product,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Sync product error:', err);
  }
}

export async function deleteProductFromCloud(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('nham_products').delete().eq('id', id);
  } catch (err) {
    console.warn('Delete product error:', err);
  }
}

export async function syncPackagingToCloud(item: PackagingItem): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('nham_packaging').upsert({
      id: item.id,
      name: item.name,
      khmer_name: item.khmerName || '',
      category: typeof item.category === 'string' ? item.category : (item.category as any)?.id || 'box',
      unit_cost_khr: item.unitCostKHR ?? item.costPerUnitKHR ?? 0,
      on_hand: item.onHand ?? 0,
      low_stock_threshold: item.lowStockThreshold ?? 25,
      barcode_ref: item.barcodeRef || null,
      data: item,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Sync packaging error:', err);
  }
}

export async function deletePackagingFromCloud(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('nham_packaging').delete().eq('id', id);
  } catch (err) {
    console.warn('Delete packaging error:', err);
  }
}

export async function syncCategoryToCloud(cat: PackagingCategoryRecord): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('nham_categories').upsert({
      id: cat.id,
      name: cat.name,
      is_protected: cat.isProtected === true,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Sync category error:', err);
  }
}

export async function deleteCategoryFromCloud(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('nham_categories').delete().eq('id', id);
  } catch (err) {
    console.warn('Delete category error:', err);
  }
}

export async function syncInvoiceToCloud(inv: Invoice): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('nham_invoices').upsert({
      id: inv.id,
      invoice_number: inv.invoiceNumber,
      invoice_date: inv.invoiceDate,
      due_date: inv.dueDate,
      store_code: inv.storeCode,
      total_quantity: inv.totalQuantity,
      total_amount_usd: inv.totalAmountUSD,
      total_amount_khr: inv.totalAmountKHR,
      status: inv.status || 'pending',
      items: inv.items || [],
      data: inv,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Sync invoice error:', err);
  }
}

export async function deleteInvoiceFromCloud(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('nham_invoices').delete().eq('id', id);
  } catch (err) {
    console.warn('Delete invoice error:', err);
  }
}

export async function syncBatchToCloud(batch: BatchCostRecord): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('nham_batches').upsert({
      id: batch.id,
      batch_number: batch.batchNumber,
      date: batch.date,
      market_spend_khr: batch.marketSpendKHR,
      fuel_expense_khr: batch.fuelExpenseKHR,
      total_boxes_yielded: batch.totalBoxesYielded,
      landed_unit_cost_khr: batch.landedUnitCostKHR,
      landed_unit_cost_usd: batch.landedUnitCostUSD,
      delivery_revenue_usd: batch.deliveryRevenueUSD || 0,
      data: batch,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Sync batch error:', err);
  }
}

export async function deleteBatchFromCloud(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('nham_batches').delete().eq('id', id);
  } catch (err) {
    console.warn('Delete batch error:', err);
  }
}
