import { Product, Store } from './types';

export interface ParsedPOItem {
  barcode: string;
  name: string;
  quantity: number;
  unitPrice: number;
  matchedProduct?: Product;
}

export interface ParsedPOResult {
  rawText: string;
  matchedStoreCode: string;
  storeName?: string;
  orderDate: string; // YYYY-MM-DD
  items: ParsedPOItem[];
  totalQuantity: number;
  totalAmountUSD: number;
}

/**
 * Identify store destination based on branch keywords in the PO text.
 */
export function detectStoreCode(text: string, stores: Store[]): string {
  const isTK592 = /Tuol Kork|Street 592|TK592|អង្គរ ប្រូថីថាយ|Angkor Prototype|St\.?592/i.test(text);
  const isOU3 = /OU 3|OU3|Heng Kimchy|Sihanoukville|សីហនុ/i.test(text);
  const isPDK = /Phsar Derm Thkov|PDK|Sambath Linda|ផ្សារដើមថ្កូវ/i.test(text);

  if (isOU3) {
    const s = stores.find((st) => st.code === 'ON-OU3');
    if (s) return s.code;
  }
  if (isPDK) {
    const s = stores.find((st) => st.code === 'ON-PDK');
    if (s) return s.code;
  }
  if (isTK592) {
    const s = stores.find((st) => st.code === 'ON-TK592');
    if (s) return s.code;
  }

  // Fallback: match by known store code or shipTo names
  for (const s of stores) {
    if (s.code && new RegExp(`\\b${s.code}\\b`, 'i').test(text)) return s.code;
    if (s.shipTo && text.toLowerCase().includes(s.shipTo.toLowerCase())) return s.code;
    if (s.customerName && text.toLowerCase().includes(s.customerName.toLowerCase())) return s.code;
  }

  return stores[0]?.code || 'ON-TK592';
}

/**
 * Extract Order or Delivery Date from text and return as YYYY-MM-DD.
 */
export function detectOrderDate(text: string): string | null {
  // 1. ORDER DATE | DD-MM-YYYY or ORDER DATE : DD-MM-YYYY
  const m1 =
    text.match(/ORDER DATE\s*\|\s*(\d{2}-\d{2}-\d{4})/i) ||
    text.match(/ORDER DATE\s*[:|]\s*(\d{2}[-/]\d{2}[-/]\d{4})/i) ||
    text.match(/DELIVERY DATE\s*[:|]\s*(\d{2}[-/]\d{2}[-/]\d{4})/i);
  if (m1) {
    const parts = m1[1].split(/[-/]/);
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // 2. YYYY-MM-DD format
  const m2 = text.match(/(?:ORDER DATE|DELIVERY DATE|DATE)\s*[:|]?\s*(\d{4}[-/]\d{2}[-/]\d{2})/i);
  if (m2) {
    return m2[1].replace(/\//g, '-');
  }

  // 3. Fallback DD-MM-YYYY pattern
  const m3 = text.match(/\b(\d{2})[-/](\d{2})[-/](\d{4})\b/);
  if (m3) {
    const day = m3[1];
    const month = m3[2];
    const year = m3[3];
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Parse line items by matching 13-digit barcodes and trailing order quantities.
 * Regex: (201680\d{7})\s+([A-Z0-9\s]+?)\s+(\d+)\s+\$([0-9.]+)
 */
export function parsePOLineItems(text: string, masterProducts: Product[]): ParsedPOItem[] {
  const itemMap = new Map<string, ParsedPOItem>();

  // 1. Primary Regex specified in specification
  const itemRegex = /(201680\d{7})\s+([A-Za-z0-9\s\.\-_]+?)\s+(\d+)\s+\$([0-9.]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(text)) !== null) {
    const barcode = match[1];
    const rawName = match[2].trim();
    const quantity = parseInt(match[3], 10);
    const unitPrice = parseFloat(match[4]);
    const matchedProduct = masterProducts.find((p) => p.barcode === barcode);

    if (quantity > 0) {
      itemMap.set(barcode, {
        barcode,
        name: matchedProduct?.name || rawName,
        quantity,
        unitPrice: isNaN(unitPrice) ? (matchedProduct?.wholesalePrice || 0) : unitPrice,
        matchedProduct,
      });
    }
  }

  // 2. Secondary line-by-line fallback for tabular/PDF text formatting
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const bMatch = line.match(/(201680\d{7})/);
    if (!bMatch) continue;
    const barcode = bMatch[1];
    if (itemMap.has(barcode)) continue;

    const matchedProduct = masterProducts.find((p) => p.barcode === barcode);

    // Check flexible format with tabs or parenthesized price:
    // e.g. "2016800000025 \t Sweet Melon Cubes 300G \t Pcs \t 3 \t ($ \t 1.00)"
    const flexMatch = line.match(
      /(201680\d{7})[\t ]+([^\t\n\r]+?)[\t ]+(?:(?:Pcs|Box|CTN|Pack|Kg)[\t ]+)?(\d+)[\t ]+(?:\(?\s*\$\s*|\$)?([0-9\.]+)/i
    );
    if (flexMatch) {
      const qty = parseInt(flexMatch[3], 10);
      const price = parseFloat(flexMatch[4]);
      if (qty > 0) {
        itemMap.set(barcode, {
          barcode,
          name: matchedProduct?.name || flexMatch[2].trim(),
          quantity: qty,
          unitPrice: isNaN(price) ? (matchedProduct?.wholesalePrice || 0) : price,
          matchedProduct,
        });
        continue;
      }
    }

    // Match quantity after barcode
    const afterBarcode = line.substring(line.indexOf(barcode) + barcode.length);
    const qtyMatch = afterBarcode.match(/(?:^|\s|\t)(?:(?:Pcs|Box|CTN)\s+)?(\d{1,4})(?:\s|\t|$|\$)/);
    if (qtyMatch) {
      const qty = parseInt(qtyMatch[1], 10);
      if (qty > 0) {
        itemMap.set(barcode, {
          barcode,
          name: matchedProduct?.name || 'Matched SKU',
          quantity: qty,
          unitPrice: matchedProduct?.wholesalePrice || 0,
          matchedProduct,
        });
      }
    }
  }

  return Array.from(itemMap.values());
}

/**
 * Main parser function to convert raw PO text into structured result.
 * Note: PO NUMBER is explicitly ignored as per specification.
 */
export function parsePOContent(
  text: string,
  masterProducts: Product[],
  stores: Store[],
  defaultDate: string
): ParsedPOResult {
  const matchedStoreCode = detectStoreCode(text, stores);
  const foundStore = stores.find((s) => s.code === matchedStoreCode);
  const orderDate = detectOrderDate(text) || defaultDate;
  const items = parsePOLineItems(text, masterProducts);

  const totalQuantity = items.reduce((acc, it) => acc + it.quantity, 0);
  const totalAmountUSD = items.reduce(
    (acc, it) => acc + it.quantity * (it.unitPrice || it.matchedProduct?.wholesalePrice || 0),
    0
  );

  return {
    rawText: text,
    matchedStoreCode,
    storeName: foundStore?.shipTo || foundStore?.customerName,
    orderDate,
    items,
    totalQuantity,
    totalAmountUSD,
  };
}
