'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Package,
  Plus,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  Sparkles,
  Barcode,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  PlusCircle,
  Layers,
  ChevronRight,
  TrendingUp,
  Tag,
  Minus,
  Check,
  Filter,
  Copy,
  LayoutGrid,
  Columns,
  ArrowRight,
  Zap,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { Product, PackagingItem, BOMItem, PackagingCategory, PackagingCategoryRecord } from '@/lib/types';
import {
  getPackagingItems,
  deletePackagingItem,
  getProducts,
  saveProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getSettings,
  getCategories,
  formatUSD,
  formatKHR,
  INITIAL_PACKAGING_ITEMS,
  normalizeProduct,
} from '@/lib/storage';
import { INITIAL_PRODUCTS } from '@/lib/initialData';
import ConfirmModal from '@/components/ui/ConfirmModal';

const PRODUCT_STICKER_MAP: Record<string, string> = {
  '2016800000025': 'sticker-2016800000025',
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

const getMatchingStickerId = (prod: Product, items: PackagingItem[] = []): string => {
  if (PRODUCT_STICKER_MAP[prod.barcode]) return PRODUCT_STICKER_MAP[prod.barcode];
  const name = prod.name || prod.nameEn || '';
  const nameMatch = items.find(
    (p) =>
      p.category === 'sticker' &&
      name &&
      p.name.toLowerCase().includes(name.split(' ')[0].toLowerCase())
  );
  return nameMatch ? nameMatch.id : `sticker-${prod.barcode}`;
};

export default function ProductBOMBuilderPage() {
  // Studio Display Mode: 'split' (Left list, right active recipe canvas) | 'grid' (All products cards overview)
  const [studioViewMode, setStudioViewMode] = useState<'split' | 'grid'>('split');

  // Master Data initialized directly with storage getters (handles both SSR defaults and client localStorage)
  const [products, setProducts] = useState<Product[]>(getProducts);
  const [packagingItems, setPackagingItems] = useState<PackagingItem[]>(getPackagingItems);
  const [categories, setCategories] = useState<PackagingCategoryRecord[]>(getCategories);
  const [exchangeRate, setExchangeRate] = useState<number>(4050);

  // Selected Product in Studio (defaults to first product)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => {
    const list = getProducts();
    return list.length > 0 ? (list[0].id || list[0].barcode) : null;
  });

  // Search & Filter in Studio
  const [productSearch, setProductSearch] = useState<string>('');
  const [productFilterPreset, setProductFilterPreset] = useState<'all' | 'standard' | '300g' | 'custom'>('all');

  // Active BOM Builder sticker smart filter toggle
  const [showAllStickers, setShowAllStickers] = useState(false);

  // Inline Product Quick Edit inside the Studio
  const [isQuickEditingProduct, setIsQuickEditingProduct] = useState(false);
  const [editPriceUSD, setEditPriceUSD] = useState<number>(0.76);
  const [editNameEn, setEditNameEn] = useState<string>('');
  const [editNameKh, setEditNameKh] = useState<string>('');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- New Product Modal State ---
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [newBarcode, setNewBarcode] = useState<string>('');
  const [newNameEn, setNewNameEn] = useState<string>('');
  const [newNameKh, setNewNameKh] = useState<string>('');
  const [newPriceUSD, setNewPriceUSD] = useState<number>(0.76);
  const [newPresetChoice, setNewPresetChoice] = useState<'std' | '300g' | 'empty'>('std');


  // Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'product' | 'packaging';
    id: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'product',
    id: '',
    title: '',
    message: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = () => {
    let loadedProducts = getProducts();
    const loadedPackaging = getPackagingItems();
    const loadedCategories = getCategories();
    const loadedSettings = getSettings();

    // Ensure standard & 300g products have complete default recipes (Box + Matching Sticker + Skewer)
    let productsUpdated = false;
    loadedProducts = loadedProducts.map((p) => {
      const is300g =
        p.barcode === '2016800000025' ||
        p.barcode === '2016800000049' ||
        p.barcode === '2016800000117' ||
        (p.nameEn || p.name || '').toLowerCase().includes('300g');

      let bom = p.bom ? [...p.bom] : [];
      let bomChanged = false;

      // 1. Upgrade 300g products to box-big-300g and sticker-2016800000025
      if (is300g) {
        bom = bom.map((item) => {
          if (item.packagingItemId === 'box-small-std') {
            bomChanged = true;
            return { ...item, packagingItemId: 'box-big-300g' };
          }
          if (p.barcode === '2016800000025' && item.packagingItemId === 'sticker-sweet-melon') {
            bomChanged = true;
            return { ...item, packagingItemId: 'sticker-2016800000025' };
          }
          return item;
        });
      }

      // 2. Ensure container box exists (box-big-300g for 300g, box-small-std for others)
      const expectedBoxId = is300g ? 'box-big-300g' : 'box-small-std';
      const hasBox = bom.some((b) => b.packagingItemId.startsWith('box-'));
      if (!hasBox) {
        bom.unshift({ packagingItemId: expectedBoxId, quantity: 1 });
        bomChanged = true;
      }

      // 3. Ensure matching fruit sticker exists (especially Papaya Cubes & standard fruit items)
      const matchingSticker = getMatchingStickerId(p, loadedPackaging);
      const hasSticker = bom.some((b) => {
        const pkg = loadedPackaging.find((pk) => pk.id === b.packagingItemId);
        return pkg?.category === 'sticker' || b.packagingItemId.startsWith('sticker-');
      });

      if (!hasSticker && matchingSticker) {
        const boxIdx = bom.findIndex((b) => b.packagingItemId.startsWith('box-'));
        if (boxIdx !== -1) {
          bom.splice(boxIdx + 1, 0, { packagingItemId: matchingSticker, quantity: 1 });
        } else {
          bom.unshift({ packagingItemId: matchingSticker, quantity: 1 });
        }
        bomChanged = true;
      }

      // 4. Ensure skewer exists
      const hasSkewer = bom.some((b) => b.packagingItemId === 'skewer-wood' || b.packagingItemId.startsWith('skewer'));
      if (!hasSkewer) {
        bom.push({ packagingItemId: 'skewer-wood', quantity: 1 });
        bomChanged = true;
      }

      if (bomChanged) {
        productsUpdated = true;
        return { ...p, bom };
      }
      return p;
    });

    if (productsUpdated) {
      saveProducts(loadedProducts);
    }

    setProducts(loadedProducts);
    setPackagingItems(loadedPackaging);
    setCategories(loadedCategories);
    setExchangeRate(loadedSettings.exchangeRate || 4050);

    // If no product is currently selected, select the first product
    setSelectedProductId((curr) => {
      if (curr && loadedProducts.some((p) => p.id === curr || p.barcode === curr)) {
        return curr;
      }
      return loadedProducts.length > 0 ? (loadedProducts[0].id || loadedProducts[0].barcode) : null;
    });
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('products_updated', handleUpdate);
    window.addEventListener('packaging_updated', handleUpdate);
    window.addEventListener('categories_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('products_updated', handleUpdate);
      window.removeEventListener('packaging_updated', handleUpdate);
      window.removeEventListener('categories_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const isItemInBOM = (bom: BOMItem[] | undefined, pkg: PackagingItem) => {
    if (!bom) return undefined;
    return bom.find((b) => {
      if (b.packagingItemId === pkg.id) return true;
      if (pkg.barcodeRef && (b.packagingItemId === `sticker-${pkg.barcodeRef}` || b.packagingItemId === pkg.barcodeRef)) return true;
      if (
        (pkg.id === 'sticker-sweet-melon' || pkg.id === 'sticker-2016800000025' || pkg.barcodeRef === '2016800000025') &&
        (b.packagingItemId === 'sticker-sweet-melon' || b.packagingItemId === 'sticker-2016800000025')
      ) {
        return true;
      }
      if (
        (pkg.id === 'sticker-papaya' || pkg.id === 'sticker-papaya-cubes' || pkg.barcodeRef === '2016800000063') &&
        (b.packagingItemId === 'sticker-papaya' || b.packagingItemId === 'sticker-papaya-cubes' || b.packagingItemId === 'sticker-2016800000063')
      ) {
        return true;
      }
      return false;
    });
  };

  const packagingMap = useMemo(() => {
    const map = new Map<string, PackagingItem>(packagingItems.map((p) => [p.id, p]));
    // Harmonize sticker aliases so Sweet Melon, Papaya, Jackfruit, etc. reliably match
    packagingItems.forEach((p) => {
      if (p.barcodeRef) {
        map.set(`sticker-${p.barcodeRef}`, p);
        map.set(p.barcodeRef, p);
      }
      if (p.id === 'sticker-sweet-melon') {
        map.set('sticker-2016800000025', p);
      }
      if (p.id === 'sticker-2016800000025') {
        map.set('sticker-sweet-melon', p);
      }
      if (p.id === 'sticker-papaya') {
        map.set('sticker-papaya-cubes', p);
        map.set('sticker-2016800000063', p);
      }
      if (p.id === 'sticker-papaya-cubes') {
        map.set('sticker-papaya', p);
        map.set('sticker-2016800000063', p);
      }
    });
    return map;
  }, [packagingItems]);

  // Dynamic category mapping from storage
  const boxCat = useMemo(() => {
    return categories.find((c) => c.id === 'box' || c.name.toLowerCase() === 'box');
  }, [categories]);

  const stickerCat = useMemo(() => {
    return categories.find((c) => c.id === 'sticker' || c.name.toLowerCase().includes('sticker'));
  }, [categories]);

  const accessoryCats = useMemo(() => {
    return categories.filter((c) => c.id !== 'box' && !c.name.toLowerCase().includes('sticker'));
  }, [categories]);

  const accessoryCat = accessoryCats[0];

  // Selected product object
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === selectedProductId || p.barcode === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Sync quick edit inputs when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      setEditPriceUSD(selectedProduct.wholesalePriceUSD ?? selectedProduct.wholesalePrice ?? 0.76);
      setEditNameEn(selectedProduct.nameEn || selectedProduct.name || '');
      setEditNameKh(selectedProduct.nameKh || selectedProduct.khmerName || '');
      setIsQuickEditingProduct(false);
      setShowAllStickers(false);
    }
  }, [selectedProductId, selectedProduct]);

  // --- Auto-generate valid EAN-13 Barcode ---
  const generateEan13Barcode = () => {
    const prefix = '20168';
    const randomBody = Math.floor(1000000 + Math.random() * 9000000).toString().slice(0, 7);
    const candidate12 = `${prefix}${randomBody}`;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(candidate12[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return `${candidate12}${checkDigit}`;
  };

  // --- Calculate Product BOM Cost ---
  const calculateBOMMetrics = (prod: Product | null) => {
    if (!prod) {
      return {
        costKHR: 0,
        costUSD: 0,
        priceUSD: 0,
        priceKHR: 0,
        marginUSD: 0,
        marginPercent: 0,
        itemCount: 0,
      };
    }

    let bomItems = prod.bom;
    if (!bomItems || bomItems.length === 0) {
      const is300g =
        prod.barcode === '2016800000025' ||
        prod.barcode === '2016800000049' ||
        prod.barcode === '2016800000117' ||
        (prod.nameEn || prod.name || '').includes('300g');
      const boxId = is300g ? 'box-big-300g' : 'box-small-std';
      const stickerId = getMatchingStickerId(prod);
      bomItems = [
        { packagingItemId: boxId, quantity: 1 },
        { packagingItemId: stickerId, quantity: 1 },
        { packagingItemId: 'skewer-wood', quantity: 1 },
      ];
    }

    const costKHR = bomItems.reduce((sum, item) => {
      const pkg = packagingMap.get(item.packagingItemId) ||
        packagingItems.find((p) =>
          p.id === item.packagingItemId ||
          (p.barcodeRef && (item.packagingItemId === `sticker-${p.barcodeRef}` || item.packagingItemId.includes(p.barcodeRef))) ||
          (item.packagingItemId === 'sticker-sweet-melon' && (p.id === 'sticker-2016800000025' || p.barcodeRef === '2016800000025')) ||
          (item.packagingItemId === 'sticker-2016800000025' && p.id === 'sticker-sweet-melon')
        );
      return sum + (pkg ? (pkg.unitCostKHR ?? pkg.costPerUnitKHR ?? 0) : 0) * item.quantity;
    }, 0);
    const costUSD = costKHR / (exchangeRate || 4050);
    const priceUSD = prod.wholesalePriceUSD ?? prod.wholesalePrice ?? 0;
    const marginUSD = Math.max(0, priceUSD - costUSD);
    const marginPercent = priceUSD > 0 ? Math.round((marginUSD / priceUSD) * 100) : 0;

    return {
      costKHR,
      costUSD,
      priceUSD,
      priceKHR: Math.round(priceUSD * exchangeRate),
      marginUSD,
      marginPercent,
      itemCount: bomItems.length,
    };
  };

  // Selected Product BOM Metrics
  const activeMetrics = useMemo(() => {
    return calculateBOMMetrics(selectedProduct);
  }, [selectedProduct, packagingMap, exchangeRate]);

  // --- Smart Recipe BOM Updates (Instant 1-Click Operations) ---
  const handleUpdateActiveBOM = (newBOM: BOMItem[], successMessage?: string) => {
    if (!selectedProduct) return;
    const updatedProd: Product = {
      ...selectedProduct,
      bom: newBOM,
    };
    updateProduct(updatedProd);
    loadData();
    if (successMessage) {
      showToast(successMessage);
    }
  };

  // Adjust item quantity in recipe
  const handleAdjustItemQty = (packagingItemId: string, delta: number) => {
    if (!selectedProduct) return;
    const currentBOM = selectedProduct.bom ? [...selectedProduct.bom] : [];
    const pkg = packagingMap.get(packagingItemId);
    const existing = isItemInBOM(currentBOM, pkg || ({ id: packagingItemId } as PackagingItem));
    const targetId = existing ? existing.packagingItemId : packagingItemId;
    const itemIndex = currentBOM.findIndex((b) => b.packagingItemId === targetId);

    if (itemIndex === -1 && delta > 0) {
      handleUpdateActiveBOM([...currentBOM, { packagingItemId: targetId, quantity: 1 }]);
      return;
    }

    if (itemIndex !== -1) {
      const newQty = currentBOM[itemIndex].quantity + delta;
      if (newQty <= 0) {
        // Remove item
        const filtered = currentBOM.filter((b) => b.packagingItemId !== targetId);
        handleUpdateActiveBOM(filtered, 'Removed from recipe');
      } else {
        currentBOM[itemIndex] = { ...currentBOM[itemIndex], quantity: newQty };
        handleUpdateActiveBOM(currentBOM);
      }
    }
  };

  // Remove single item from recipe
  const handleRemoveFromBOM = (packagingItemId: string) => {
    if (!selectedProduct) return;
    const currentBOM = selectedProduct.bom ? [...selectedProduct.bom] : [];
    const pkg = packagingMap.get(packagingItemId);
    const existing = isItemInBOM(currentBOM, pkg || ({ id: packagingItemId } as PackagingItem));
    const targetId = existing ? existing.packagingItemId : packagingItemId;
    const filtered = currentBOM.filter((b) => b.packagingItemId !== targetId);
    handleUpdateActiveBOM(filtered, `Removed "${pkg?.name || packagingItemId}" from recipe`);
  };

  // Toggle item in recipe with single-choice auto-swap for boxes and stickers
  const handleToggleMaterialInBOM = (pkg: PackagingItem) => {
    if (!selectedProduct) return;
    const currentBOM = selectedProduct.bom ? [...selectedProduct.bom] : [];
    const existing = isItemInBOM(currentBOM, pkg);

    // Rule 4: Clicking an already-selected card removes it from the recipe
    if (existing) {
      const filtered = currentBOM.filter((b) => b.packagingItemId !== existing.packagingItemId);
      handleUpdateActiveBOM(filtered, `Removed "${pkg.name}" from recipe`);
      return;
    }

    const pkgCat = typeof pkg.category === 'string' ? pkg.category.toLowerCase() : '';
    const isBox =
      pkgCat === 'box' ||
      (boxCat && (pkgCat === boxCat.id.toLowerCase() || pkgCat === boxCat.name.toLowerCase())) ||
      pkg.id.startsWith('box-');

    // Rule 2: Single-choice auto-swap for Containers (box)
    if (isBox) {
      const existingBoxIndex = currentBOM.findIndex((b) => {
        const p = packagingMap.get(b.packagingItemId);
        const pCat = typeof p?.category === 'string' ? p.category.toLowerCase() : '';
        return (
          pCat === 'box' ||
          (boxCat && (pCat === boxCat.id.toLowerCase() || pCat === boxCat.name.toLowerCase())) ||
          b.packagingItemId.startsWith('box-')
        );
      });

      if (existingBoxIndex !== -1) {
        const updatedBOM = [...currentBOM];
        updatedBOM[existingBoxIndex] = { packagingItemId: pkg.id, quantity: 1 };
        handleUpdateActiveBOM(updatedBOM, `Swapped container to "${pkg.name}"`);
        return;
      }
    }

    const isSticker =
      pkgCat === 'sticker' ||
      (stickerCat && (pkgCat === stickerCat.id.toLowerCase() || pkgCat === stickerCat.name.toLowerCase())) ||
      pkg.id.startsWith('sticker-');

    // Rule 3: Single-choice auto-swap for Fruit Stickers (sticker)
    if (isSticker) {
      const existingStickerIndex = currentBOM.findIndex((b) => {
        const p = packagingMap.get(b.packagingItemId);
        const pCat = typeof p?.category === 'string' ? p.category.toLowerCase() : '';
        return (
          pCat === 'sticker' ||
          (stickerCat && (pCat === stickerCat.id.toLowerCase() || pCat === stickerCat.name.toLowerCase())) ||
          b.packagingItemId.startsWith('sticker-')
        );
      });

      if (existingStickerIndex !== -1) {
        const updatedBOM = [...currentBOM];
        updatedBOM[existingStickerIndex] = { packagingItemId: pkg.id, quantity: 1 };
        handleUpdateActiveBOM(updatedBOM, `Assigned sticker "${pkg.name}"`);
        return;
      }
    }

    // Default: Add item (Accessories or first box/sticker)
    handleUpdateActiveBOM(
      [...currentBOM, { packagingItemId: pkg.id, quantity: 1 }],
      `Added "${pkg.name}" to recipe`
    );
  };

  // --- Quick Edit Product Details ---
  const handleSaveProductDetails = () => {
    if (!selectedProduct) return;
    if (!editNameEn.trim()) {
      showToast('English fruit name cannot be empty');
      return;
    }
    const updated: Product = {
      ...selectedProduct,
      name: editNameEn.trim(),
      khmerName: editNameKh.trim() || editNameEn.trim(),
      nameEn: editNameEn.trim(),
      nameKh: editNameKh.trim() || editNameEn.trim(),
      wholesalePrice: Math.max(0, editPriceUSD),
      wholesalePriceUSD: Math.max(0, editPriceUSD),
    };
    updateProduct(updated);
    setIsQuickEditingProduct(false);
    loadData();
    showToast(`Saved changes to "${updated.nameEn}"`);
  };

  // --- Create New Product Submission ---
  const handleOpenNewProductModal = () => {
    setNewBarcode(generateEan13Barcode());
    setNewNameEn('');
    setNewNameKh('');
    setNewPriceUSD(0.76);
    setNewPresetChoice('std');
    setNewProductModalOpen(true);
  };

  const handleCreateNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarcode.trim()) {
      showToast('Please enter or generate a barcode.');
      return;
    }
    if (!newNameEn.trim()) {
      showToast('Please enter an English fruit name.');
      return;
    }

    let initialBOM: BOMItem[] = [];
    if (newPresetChoice === 'std') {
      initialBOM = [
        { packagingItemId: 'box-small-std', quantity: 1 },
        { packagingItemId: 'skewer-wood', quantity: 1 },
      ];
    } else if (newPresetChoice === '300g') {
      initialBOM = [
        { packagingItemId: 'box-big-300g', quantity: 1 },
        { packagingItemId: 'skewer-wood', quantity: 1 },
      ];
    }

    const newProd: Product = {
      id: `prod-${newBarcode.trim()}`,
      barcode: newBarcode.trim(),
      name: newNameEn.trim(),
      khmerName: newNameKh.trim() || newNameEn.trim(),
      nameEn: newNameEn.trim(),
      nameKh: newNameKh.trim() || newNameEn.trim(),
      uom: 'Pcs',
      wholesalePrice: Math.max(0, newPriceUSD),
      wholesalePriceUSD: Math.max(0, newPriceUSD),
      bom: initialBOM,
    };

    addProduct(newProd);
    setNewProductModalOpen(false);
    loadData();
    setSelectedProductId(newProd.id || newProd.barcode);
    showToast(`Created fruit product "${newProd.nameEn}". Select ingredients below!`);
  };


  // Filtered Products in Studio
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = productSearch.toLowerCase();
      const nameEn = (p.nameEn || p.name || '').toLowerCase();
      const nameKh = (p.nameKh || p.khmerName || '').toLowerCase();
      const matchQuery = nameEn.includes(q) || nameKh.includes(q) || p.barcode.includes(q);

      if (!matchQuery) return false;

      if (productFilterPreset === 'all') return true;
      if (productFilterPreset === '300g') {
        return (
          p.barcode === '2016800000025' ||
          p.barcode === '2016800000049' ||
          p.barcode === '2016800000117' ||
          nameEn.includes('300g')
        );
      }
      if (productFilterPreset === 'standard') {
        return (
          p.barcode !== '2016800000025' &&
          p.barcode !== '2016800000049' &&
          p.barcode !== '2016800000117' &&
          !nameEn.includes('300g')
        );
      }
      if (productFilterPreset === 'custom') {
        return !p.bom || p.bom.length === 0;
      }
      return true;
    });
  }, [products, productSearch, productFilterPreset]);

  // Categorized packaging items for the Studio sections
  const boxItems = useMemo(() => {
    return packagingItems.filter((pkg) => {
      const cat = typeof pkg.category === 'string' ? pkg.category.toLowerCase() : '';
      return (
        cat === 'box' ||
        (boxCat && (cat === boxCat.id.toLowerCase() || cat === boxCat.name.toLowerCase())) ||
        pkg.id.startsWith('box-')
      );
    });
  }, [packagingItems, boxCat]);

  const stickerItems = useMemo(() => {
    return packagingItems.filter((pkg) => {
      const cat = typeof pkg.category === 'string' ? pkg.category.toLowerCase() : '';
      return (
        cat === 'sticker' ||
        (stickerCat && (cat === stickerCat.id.toLowerCase() || cat === stickerCat.name.toLowerCase())) ||
        pkg.id.startsWith('sticker-')
      );
    });
  }, [packagingItems, stickerCat]);

  const matchingStickerId = selectedProduct ? getMatchingStickerId(selectedProduct, packagingItems) : '';

  const displayedStickerItems = useMemo(() => {
    if (showAllStickers) return stickerItems;
    if (!selectedProduct) return stickerItems;

    const matching = stickerItems.filter((p) => {
      if (p.id === matchingStickerId) return true;
      if (p.barcodeRef && p.barcodeRef === selectedProduct.barcode) return true;
      if (
        (selectedProduct.barcode === '2016800000025' ||
          (selectedProduct.nameEn || selectedProduct.name || '').includes('Sweet Melon')) &&
        (p.id === 'sticker-2016800000025' || p.id === 'sticker-sweet-melon' || p.name.includes('Sweet Melon'))
      ) {
        return true;
      }
      if (
        (selectedProduct.barcode === '2016800000063' ||
          (selectedProduct.nameEn || selectedProduct.name || '').includes('Papaya')) &&
        (p.id === 'sticker-papaya' || p.id === 'sticker-papaya-cubes' || p.barcodeRef === '2016800000063' || p.name.includes('Papaya'))
      ) {
        return true;
      }
      const firstName = (selectedProduct.nameEn || selectedProduct.name || '').split(' ')[0].toLowerCase();
      if (firstName && firstName.length > 2 && p.name.toLowerCase().includes(firstName)) {
        return true;
      }
      return false;
    });

    return matching.length > 0 ? matching : stickerItems;
  }, [stickerItems, showAllStickers, selectedProduct, matchingStickerId]);

  const accessoryItems = useMemo(() => {
    return packagingItems.filter((pkg) => {
      const cat = typeof pkg.category === 'string' ? pkg.category.toLowerCase() : '';
      const isBox =
        cat === 'box' ||
        (boxCat && (cat === boxCat.id.toLowerCase() || cat === boxCat.name.toLowerCase())) ||
        pkg.id.startsWith('box-');
      const isSticker =
        cat === 'sticker' ||
        (stickerCat && (cat === stickerCat.id.toLowerCase() || cat === stickerCat.name.toLowerCase())) ||
        pkg.id.startsWith('sticker-');
      return !isBox && !isSticker;
    });
  }, [packagingItems, boxCat, stickerCat]);

  const renderMaterialCard = (pkg: PackagingItem) => {
    const existingInBOM = isItemInBOM(selectedProduct?.bom, pkg);
    const isAttached = Boolean(existingInBOM);

    return (
      <div
        key={pkg.id}
        onClick={() => handleToggleMaterialInBOM(pkg)}
        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
          isAttached
            ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-500/20 shadow-2xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
        }`}
      >
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition ${
              isAttached ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {isAttached ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Plus className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-900 truncate">
              {pkg.name}
            </div>
            <div className="text-[10px] font-mono text-emerald-800 font-semibold">
              {formatKHR(pkg.unitCostKHR)} • {pkg.onHand} in stock
            </div>
          </div>
        </div>

        {isAttached ? (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
            ✓ {existingInBOM?.quantity}x in BOM
          </span>
        ) : (
          <span className="text-slate-400 hover:text-slate-600 text-sm px-1.5 py-0.5 shrink-0 font-bold">
            +
          </span>
        )}
      </div>
    );
  };

  // Color helper for categories
  const getCategoryBadge = (cat: PackagingCategory) => {
    const catStr = typeof cat === 'string' ? cat : (cat as any)?.id || (cat as any)?.name || '';
    const matched = categories.find(
      (c) => c.id.toLowerCase() === catStr.toLowerCase() || c.name.toLowerCase() === catStr.toLowerCase()
    );

    if (
      catStr.toLowerCase() === 'box' ||
      (boxCat && (catStr.toLowerCase() === boxCat.id.toLowerCase() || catStr.toLowerCase() === boxCat.name.toLowerCase()))
    ) {
      return {
        label: matched?.name || boxCat?.name || 'Box',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: Boxes,
      };
    }
    if (
      catStr.toLowerCase() === 'sticker' ||
      (stickerCat && (catStr.toLowerCase() === stickerCat.id.toLowerCase() || catStr.toLowerCase() === stickerCat.name.toLowerCase()))
    ) {
      return {
        label: matched?.name || stickerCat?.name || 'UV Sticker',
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        icon: Tag,
      };
    }
    if (catStr.toLowerCase() === 'skewer' || matched?.id === 'skewer') {
      return {
        label: matched?.name || 'Skewer',
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: Layers,
      };
    }
    return {
      label: matched?.name || (typeof cat === 'string' ? cat : 'Other'),
      bg: 'bg-purple-50 text-purple-800 border-purple-200',
      icon: Package,
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950 text-white shadow-2xl flex items-center justify-between border border-emerald-700 animate-in fade-in slide-in-from-top-3 duration-200 z-50 fixed bottom-6 right-6 max-w-md">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center text-emerald-300 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Product &amp; Recipe Studio
              </div>
              <div className="text-sm font-semibold">{toastMessage}</div>
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white p-1.5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Products &amp; Packaging BOM Studio
          </h1>
        </div>

        {/* Quick Action Buttons & View Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setStudioViewMode('split')}
              className={`p-1.5 rounded-lg transition ${
                studioViewMode === 'split' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Split Workbench: Click a product to edit its recipe on the right"
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              onClick={() => setStudioViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                studioViewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid Overview: View all products side-by-side"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleOpenNewProductModal}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl shadow-xs transition transform active:scale-95 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Fruit Product</span>
          </button>
        </div>
      </div>

      {/* Interactive Recipe & BOM Studio (Split Workbench & Grid) */}
      <div className="space-y-4">
        {/* ---------------------------------------------------- */}
        {/* VIEW 1: SPLIT MASTER-DETAIL STUDIO WORKBENCH         */}
        {/* ---------------------------------------------------- */}
        {studioViewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Constrained Search, Filters, and Product Selection List (5 cols on desktop) */}
            <div className="lg:col-span-5 space-y-3 max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
              {/* Constrained Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search fruit name or barcode..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-2xs"
                />
                {productSearch && (
                  <button
                    onClick={() => setProductSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Constrained Filter Pills */}
              <div className="flex items-center space-x-1 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: `All (${products.length})` },
                  { id: 'standard', label: 'Standard Pack' },
                  { id: '300g', label: '300G Big Tub' },
                  { id: 'custom', label: 'No Recipe' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setProductFilterPreset(chip.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      productFilterPreset === chip.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-bold pt-1">
                <span>SELECT FRUIT TO EDIT RECIPE</span>
                <span>{filteredProducts.length} items</span>
              </div>

                {filteredProducts.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400 space-y-2">
                    <p className="text-xs">No products match your search or filter.</p>
                    <button
                      onClick={() => {
                        setProductSearch('');
                        setProductFilterPreset('all');
                      }}
                      className="text-xs text-emerald-600 font-bold hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  filteredProducts.map((prod) => {
                    const isSelected = selectedProduct?.barcode === prod.barcode || selectedProduct?.id === prod.id;
                    const metrics = calculateBOMMetrics(prod);
                    const is300g =
                      prod.barcode === '2016800000025' ||
                      prod.barcode === '2016800000049' ||
                      prod.barcode === '2016800000117' ||
                      (prod.nameEn || prod.name || '').includes('300g');

                    return (
                      <div
                        key={prod.id || prod.barcode}
                        onClick={() => setSelectedProductId(prod.id || prod.barcode)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer text-left flex items-center justify-between gap-3 relative overflow-hidden ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600" />
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {prod.barcode.slice(-5)}
                            </span>
                            {is300g ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                300G Big Tub
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                Standard Box
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-sm text-slate-900 truncate">
                            {prod.nameEn || prod.name}
                          </h3>
                          {((prod as any).subtitle || prod.nameKh || prod.khmerName) && (
                            <p className="text-xs text-slate-500 font-medium truncate">
                              {(prod as any).subtitle || prod.nameKh || prod.khmerName}
                              {((prod as any).subtitle && (prod.nameKh || prod.khmerName)) ? ` (${prod.nameKh || prod.khmerName})` : ''}
                            </p>
                          )}

                          {/* Quick recipe summary badges */}
                          <div className="flex items-center space-x-2 pt-1">
                            <span className="text-[11px] font-mono font-bold text-slate-700">
                              {formatUSD(metrics.priceUSD)}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100/70 px-1.5 py-0.5 rounded">
                              BOM: {formatKHR(metrics.costKHR)}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px] text-slate-500">
                              {metrics.itemCount} items
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center space-x-1">
                          {isSelected ? (
                            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                              <Check className="w-4 h-4" />
                            </div>
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Active Recipe Canvas & Live Builder (7 cols on desktop) */}
              <div className="lg:col-span-7 space-y-4">
                {selectedProduct ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
                    {/* Top: Selected Product Header Card */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-xs relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded-md bg-white/10 text-emerald-300 font-mono text-[10px] font-bold">
                              EAN-13: {selectedProduct.barcode}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(selectedProduct.barcode);
                                showToast(`Copied barcode: ${selectedProduct.barcode}`);
                              }}
                              className="text-slate-400 hover:text-white p-1 rounded"
                              title="Copy Barcode"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>

                          <h2 className="text-xl font-black text-white tracking-tight">
                            {selectedProduct.nameEn || selectedProduct.name}
                          </h2>
                          {((selectedProduct as any).subtitle || selectedProduct.nameKh || selectedProduct.khmerName) && (
                            <p className="text-xs text-slate-300 font-medium">
                              {(selectedProduct as any).subtitle || selectedProduct.nameKh || selectedProduct.khmerName}
                              {((selectedProduct as any).subtitle && (selectedProduct.nameKh || selectedProduct.khmerName)) ? ` (${selectedProduct.nameKh || selectedProduct.khmerName})` : ''}
                            </p>
                          )}
                        </div>

                        {/* Price & Action */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setIsQuickEditingProduct(!isQuickEditingProduct)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center space-x-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-citrus-300" />
                            <span>{isQuickEditingProduct ? 'Close Edit' : 'Edit Info'}</span>
                          </button>

                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                type: 'product',
                                id: selectedProduct.id || selectedProduct.barcode,
                                title: 'Delete Product?',
                                message: `Are you sure you want to delete "${selectedProduct.nameEn || selectedProduct.name}"?`,
                              })
                            }
                            className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-slate-300 hover:text-white transition"
                            title="Delete this product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Quick Edit Form */}
                      {isQuickEditingProduct && (
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-3 bg-white/5 p-3 rounded-xl animate-in fade-in duration-150">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-300 mb-1">
                                English Name
                              </label>
                              <input
                                type="text"
                                value={editNameEn}
                                onChange={(e) => setEditNameEn(e.target.value)}
                                className="w-full text-xs font-bold text-slate-900 bg-white rounded-lg px-2.5 py-1.5 focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-300 mb-1">
                                Khmer Name
                              </label>
                              <input
                                type="text"
                                value={editNameKh}
                                onChange={(e) => setEditNameKh(e.target.value)}
                                className="w-full text-xs font-khmer text-slate-900 bg-white rounded-lg px-2.5 py-1.5 focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-300 mb-1">
                                Price ($ USD)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editPriceUSD || ''}
                                onChange={(e) => setEditPriceUSD(parseFloat(e.target.value) || 0)}
                                className="w-full text-xs font-mono font-bold text-slate-900 bg-white rounded-lg px-2.5 py-1.5 focus:outline-hidden"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setIsQuickEditingProduct(false)}
                              className="px-3 py-1 rounded-lg text-xs text-slate-300 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveProductDetails}
                              className="px-3.5 py-1 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition flex items-center space-x-1"
                            >
                              <Save className="w-3 h-3" />
                              <span>Save Details</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Live Recipe KPI Bar with Correct Terminology */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Wholesale Price
                          </span>
                          <span className="text-base font-black text-white font-mono">
                            {formatUSD(activeMetrics.priceUSD)}
                          </span>
                          <span className="text-[10px] text-slate-300 block">
                            ({formatKHR(activeMetrics.priceKHR)})
                          </span>
                        </div>

                        <div className="sm:border-l sm:border-white/10 sm:pl-3">
                          <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                            Packaging BOM Cost
                          </span>
                          <span className="text-base font-black text-emerald-300 font-mono">
                            {formatKHR(activeMetrics.costKHR)}
                          </span>
                          <span className="text-[10px] text-slate-300 block">
                            (~{formatUSD(activeMetrics.costUSD)})
                          </span>
                        </div>

                        <div className="sm:border-l sm:border-white/10 sm:pl-3">
                          <span className="text-[10px] text-citrus-300 uppercase font-bold block">
                            Gross Spread after Packaging
                          </span>
                          <span className="text-base font-black text-citrus-300 font-mono">
                            {formatKHR(Math.max(0, activeMetrics.priceKHR - activeMetrics.costKHR))}
                          </span>
                          <span className="text-[10px] text-slate-300 block font-mono">
                            (~{formatUSD(activeMetrics.marginUSD)} remaining for fruit &amp; labor)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active Recipe Ingredients (BOM) Section */}
                    {selectedProduct.bom && selectedProduct.bom.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Active Recipe Ingredients (BOM)
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {selectedProduct.bom.length} items linked
                          </span>
                        </div>

                        <div className="space-y-2">
                          {selectedProduct.bom.map((bomItem) => {
                            const material =
                              packagingItems.find((p) => p.id === bomItem.packagingItemId) ||
                              packagingMap.get(bomItem.packagingItemId);
                            if (!material) return null;

                            const badge = getCategoryBadge(material.category);
                            const unitCost = material.unitCostKHR ?? material.costPerUnitKHR ?? 0;
                            const lineTotalKHR = unitCost * bomItem.quantity;

                            return (
                              <div
                                key={bomItem.packagingItemId}
                                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-3 transition"
                              >
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                      badge ? badge.bg : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {badge ? <badge.icon className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-extrabold text-xs text-slate-900 truncate">
                                        {material.name}
                                      </span>
                                      {badge && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase bg-white border border-slate-200 text-slate-600">
                                          {badge.label}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-mono">
                                      Unit: {formatKHR(unitCost)} • Stock: {material.onHand ?? 0} pcs
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-3 shrink-0">
                                  {/* Touch-friendly 44px Stepper */}
                                  <div className="flex items-center space-x-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustItemQty(bomItem.packagingItemId, -1)}
                                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition text-base active:scale-95 touch-manipulation"
                                      title="Decrease quantity"
                                      aria-label="Decrease quantity"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-8 text-center font-mono font-black text-sm text-slate-900">
                                      {bomItem.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustItemQty(bomItem.packagingItemId, 1)}
                                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold transition text-base active:scale-95 touch-manipulation"
                                      title="Increase quantity"
                                      aria-label="Increase quantity"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {/* Subtotal KHR */}
                                  <div className="text-right min-w-[70px]">
                                    <div className="font-mono font-bold text-xs text-slate-900">
                                      {formatKHR(lineTotalKHR)}
                                    </div>
                                    <div className="font-mono text-[9px] text-slate-400">
                                      ≈ {formatUSD(lineTotalKHR / (exchangeRate || 4050))}
                                    </div>
                                  </div>

                                  {/* Trash Delete Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromBOM(bomItem.packagingItemId)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                    title="Remove from recipe"
                                    aria-label="Remove from recipe"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Packaging Materials Slots & Recipe Builder */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Add Packaging Materials to Recipe
                        </h4>
                      </div>

                      {/* Slot 1: Box */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                            <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                            <span>1. {boxCat?.name || 'Box'}</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {boxItems.map(renderMaterialCard)}
                        </div>
                      </div>

                      {/* Slot 2: Fruit Sticker */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                            <Tag className="w-3.5 h-3.5 text-indigo-600" />
                            <span>2. {stickerCat?.name || 'UV Sticker'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAllStickers(!showAllStickers)}
                            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 hover:underline transition cursor-pointer"
                          >
                            {showAllStickers ? '← Show recommended sticker' : 'Browse other stickers →'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {displayedStickerItems.map(renderMaterialCard)}
                        </div>
                      </div>

                      {/* Slot 3+: Skewers / Accessories / Custom Categories */}
                      {accessoryCats.length > 0 ? (
                        accessoryCats.map((cat, idx) => {
                          const slotNum = 3 + idx;
                          const catItems = packagingItems.filter((pkg) => {
                            const c = typeof pkg.category === 'string' ? pkg.category.toLowerCase() : '';
                            const isMatch = c === cat.id.toLowerCase() || c === cat.name.toLowerCase();
                            if (isMatch) return true;
                            // If this is the last category in accessoryCats, also include any orphaned/unassigned items
                            if (idx === accessoryCats.length - 1) {
                              const isBox =
                                c === 'box' ||
                                (boxCat && (c === boxCat.id.toLowerCase() || c === boxCat.name.toLowerCase())) ||
                                pkg.id.startsWith('box-');
                              const isSticker =
                                c === 'sticker' ||
                                (stickerCat && (c === stickerCat.id.toLowerCase() || c === stickerCat.name.toLowerCase())) ||
                                pkg.id.startsWith('sticker-');
                              const matchedEarlier = accessoryCats.slice(0, idx).some((prev) => {
                                return c === prev.id.toLowerCase() || c === prev.name.toLowerCase();
                              });
                              return !isBox && !isSticker && !matchedEarlier;
                            }
                            return false;
                          });

                          if (catItems.length === 0 && idx > 0) return null;

                          return (
                            <div key={cat.id} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{slotNum}. {cat.name}</span>
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {catItems.map(renderMaterialCard)}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                              <Layers className="w-3.5 h-3.5 text-amber-600" />
                              <span>3. {accessoryCat?.name || 'Skewer'}</span>
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {accessoryItems.map(renderMaterialCard)}
                          </div>
                        </div>
                      )}

                      {/* Missing a packaging item? Link to Warehouse */}
                      <div className="pt-2 flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span>Need a new packaging item?</span>
                        <Link
                          href="/inventory"
                          className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center space-x-1 text-xs"
                        >
                          <span>Add in Warehouse &rarr;</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
                    <Boxes className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">Select a Fruit Product</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Choose any fruit product from the left roster to view and customize its packaging recipe.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* VIEW 2: CATALOG CARDS GRID (ALL PRODUCTS OVERVIEW)   */}
          {/* ---------------------------------------------------- */}
          {studioViewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((prod) => {
                const metrics = calculateBOMMetrics(prod);
                return (
                  <div
                    key={prod.id || prod.barcode}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between group space-y-3"
                  >
                    <div>
                      {/* Barcode & Studio jump button */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {prod.barcode}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedProductId(prod.id || prod.barcode);
                            setStudioViewMode('split');
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition flex items-center space-x-1"
                        >
                          <Zap className="w-3 h-3 text-emerald-600" />
                          <span>Open in Studio</span>
                        </button>
                      </div>

                      {/* Name */}
                      <div className="mt-2">
                        <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-emerald-900 transition-colors">
                          {prod.nameEn || prod.name}
                        </h3>
                        {(prod.nameKh || prod.khmerName) && (
                          <p className="text-xs text-slate-500 font-khmer mt-0.5">
                            {prod.nameKh || prod.khmerName}
                          </p>
                        )}
                      </div>

                      {/* Financial tile */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-3 text-xs mt-3">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Wholesale Price
                          </span>
                          <div className="font-mono font-black text-slate-900 text-base">
                            {formatUSD(metrics.priceUSD)}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            ≈ {formatKHR(metrics.priceKHR)}
                          </span>
                        </div>

                        <div className="border-l border-slate-200 pl-3">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Packaging Cost
                          </span>
                          <div className="font-mono font-bold text-emerald-800 text-base">
                            {formatKHR(metrics.costKHR)}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            ≈ {formatUSD(metrics.costUSD)} ({metrics.marginPercent}% margin)
                          </span>
                        </div>
                      </div>

                      {/* Ingredients chips */}
                      <div className="mt-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Packaging Recipe:</span>
                          <span className="text-slate-500">{metrics.itemCount} items</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {prod.bom && prod.bom.length > 0 ? (
                            prod.bom.map((bom) => {
                              const pkg = packagingMap.get(bom.packagingItemId);
                              return (
                                <span
                                  key={bom.packagingItemId}
                                  className="inline-flex items-center text-[11px] font-medium bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-800 shadow-2xs"
                                >
                                  <span className="font-bold text-emerald-800 mr-1">
                                    {bom.quantity}x
                                  </span>
                                  <span className="truncate max-w-[130px]">
                                    {pkg ? pkg.name : bom.packagingItemId}
                                  </span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              No recipe linked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      {/* ======================================================== */}
      {/* MODAL: CREATE NEW FRUIT PRODUCT                          */}
      {/* ======================================================== */}
      {newProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Create New Fruit Product
                  </h3>
                  <p className="text-xs text-slate-500 font-khmer">
                    បន្ថែមមុខទំនិញផ្លែឈើថ្មី និងជ្រើសរើសរូបមន្ត
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNewProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    English Fruit Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Crispy Guava Slices"
                    value={newNameEn}
                    onChange={(e) => setNewNameEn(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Khmer Name (ឈ្មោះខ្មែរ)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ត្របែកស្រួយស្រស់"
                    value={newNameKh}
                    onChange={(e) => setNewNameKh(e.target.value)}
                    className="w-full text-xs font-khmer border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Barcode (EAN-13) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewBarcode(generateEan13Barcode())}
                      className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Re-Gen</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Wholesale Price ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newPriceUSD || ''}
                    onChange={(e) => setNewPriceUSD(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              {/* Initial Packaging Preset Selection */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Initial Packaging Template (គំរូរូបមន្តវេចខ្ចប់)
                </label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center space-x-2.5 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-emerald-500 transition">
                    <input
                      type="radio"
                      name="preset"
                      value="std"
                      checked={newPresetChoice === 'std'}
                      onChange={() => setNewPresetChoice('std')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Standard Small Box Pack</span>
                      <span className="text-[11px] text-slate-500">Includes 1x Standard Box + 1x Skewer</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-emerald-500 transition">
                    <input
                      type="radio"
                      name="preset"
                      value="300g"
                      checked={newPresetChoice === '300g'}
                      onChange={() => setNewPresetChoice('300g')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">300G Big Tub Pack</span>
                      <span className="text-[11px] text-slate-500">Includes 1x Big Box 300G + 1x Skewer</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-emerald-500 transition">
                    <input
                      type="radio"
                      name="preset"
                      value="empty"
                      checked={newPresetChoice === 'empty'}
                      onChange={() => setNewPresetChoice('empty')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Custom / Empty Recipe</span>
                      <span className="text-[11px] text-slate-500">Start with 0 materials and build manually</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setNewProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition active:scale-95 flex items-center space-x-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Product &amp; Open Studio</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirm.type === 'product') {
            deleteProduct(deleteConfirm.id);
            showToast('Product deleted.');
          } else {
            deletePackagingItem(deleteConfirm.id);
            showToast('Packaging material deleted.');
          }
          loadData();
          setDeleteConfirm({ isOpen: false, type: 'product', id: '', title: '', message: '' });
        }}
        onCancel={() =>
          setDeleteConfirm({ isOpen: false, type: 'product', id: '', title: '', message: '' })
        }
      />
    </div>
  );
}
