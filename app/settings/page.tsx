'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Coins,
  Package,
  Building2,
  Save,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Store as StoreIcon,
  Barcode,
  CreditCard,
  Phone,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import {
  getSettings,
  saveSettings,
  getStores,
  saveStores,
  getProducts,
  saveProducts,
  exportAllData,
  importAllData,
  resetAllData,
} from '@/lib/storage';
import { AppSettings, Store, Product } from '@/lib/types';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function SettingsPage() {
  const [settings, setSettingsState] = useState<AppSettings>(getSettings());
  const [stores, setStoresState] = useState<Store[]>([]);
  const [products, setProductsState] = useState<Product[]>([]);
  const [saveToast, setSaveToast] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Modal Dialog States
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
  }>({ isOpen: false, title: '', message: '' });

  const loadData = () => {
    setSettingsState(getSettings());
    setStoresState(getStores());
    setProductsState(getProducts());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = () => {
    saveSettings(settings);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  // Export JSON backup
  const handleExportJSON = () => {
    const dataStr = exportAllData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nhamnham-ops-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importAllData(content);
        if (success) {
          setImportStatus('Backup restored successfully!');
          loadData();
        } else {
          setImportStatus('Error importing JSON file. Please check format.');
        }
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  // Reset to seed data
  const handleResetToDefaults = () => {
    setConfirmResetOpen(true);
  };

  const executeReset = () => {
    resetAllData();
    loadData();
    setConfirmResetOpen(false);
    setAlertModal({
      isOpen: true,
      title: 'Database Reset Complete',
      message: 'All stores, fruit catalog SKUs, settings, and seed delivery invoices have been successfully restored to initial defaults.',
      variant: 'success',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              System Settings &amp; Master Data
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold uppercase">
              Configuration
            </span>
          </div>
          <p className="text-xs text-slate-700 font-khmer mt-0.5">
            កំណត់អត្រាប្តូរប្រាក់ ថ្លៃដើមសម្ភារៈវេចខ្ចប់ (BOM) គណនីធនាគារ ABA និងទិន្នន័យសាខា
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs transition transform active:scale-95 text-xs sm:text-sm self-start sm:self-auto"
        >
          {saveToast ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Settings Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Financial & BOM Defaults */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Financial &amp; BOM Defaults</span>
            </h2>

            <div className="space-y-3">
              {/* Exchange Rate */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Exchange Rate (KHR per 1 USD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.exchangeRate}
                    onChange={(e) =>
                      setSettingsState({
                        ...settings,
                        exchangeRate: parseInt(e.target.value, 10) || 4050,
                      })
                    }
                    className="w-full text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    KHR / $
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Default standard in Cambodia: 4,050 KHR
                </span>
              </div>

              {/* Tub + Sticker Cost */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Tub + UV Sticker Overhead (KHR / box)
                </label>
                <input
                  type="number"
                  value={settings.defaultTubStickerKHR}
                  onChange={(e) =>
                    setSettingsState({
                      ...settings,
                      defaultTubStickerKHR: parseInt(e.target.value, 10) || 500,
                    })
                  }
                  className="w-full text-sm font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Cold Wash Dip */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Cold Wash Dip Solution (KHR / box)
                </label>
                <input
                  type="number"
                  value={settings.defaultColdWashKHR}
                  onChange={(e) =>
                    setSettingsState({
                      ...settings,
                      defaultColdWashKHR: parseInt(e.target.value, 10) || 10,
                    })
                  }
                  className="w-full text-sm font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Route Fuel Expense */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Route Fuel Expense (KHR / batch run)
                </label>
                <input
                  type="number"
                  value={settings.defaultFuelKHR}
                  onChange={(e) =>
                    setSettingsState({
                      ...settings,
                      defaultFuelKHR: parseInt(e.target.value, 10) || 8000,
                    })
                  }
                  className="w-full text-sm font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Supplier Profile (Header & ABA Payment Footer) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Supplier Profile &amp; ABA Payment Footer</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supplier Name
                </label>
                <input
                  type="text"
                  value={settings.supplierProfile.name}
                  onChange={(e) =>
                    setSettingsState({
                      ...settings,
                      supplierProfile: { ...settings.supplierProfile, name: e.target.value },
                    })
                  }
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Khmer Name (Header)
                </label>
                <input
                  type="text"
                  value={settings.supplierProfile.khmerName}
                  onChange={(e) =>
                    setSettingsState({
                      ...settings,
                      supplierProfile: { ...settings.supplierProfile, khmerName: e.target.value },
                    })
                  }
                  className="w-full text-xs font-khmer font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Address (អាសយដ្ឋាន)
                </label>
                <input
                  type="text"
                  value={settings.supplierProfile.address}
                  onChange={(e) =>
                    setSettingsState({
                      ...settings,
                      supplierProfile: { ...settings.supplierProfile, address: e.target.value },
                    })
                  }
                  className="w-full text-xs font-khmer bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telephone
                  </label>
                  <input
                    type="text"
                    value={settings.supplierProfile.phone}
                    onChange={(e) =>
                      setSettingsState({
                        ...settings,
                        supplierProfile: { ...settings.supplierProfile, phone: e.target.value },
                      })
                    }
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={settings.supplierProfile.bankName}
                    onChange={(e) =>
                      setSettingsState({
                        ...settings,
                        supplierProfile: { ...settings.supplierProfile, bankName: e.target.value },
                      })
                    }
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={settings.supplierProfile.accountName}
                    onChange={(e) =>
                      setSettingsState({
                        ...settings,
                        supplierProfile: { ...settings.supplierProfile, accountName: e.target.value },
                      })
                    }
                    className="w-full text-xs font-bold uppercase bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={settings.supplierProfile.accountNumber}
                    onChange={(e) =>
                      setSettingsState({
                        ...settings,
                        supplierProfile: { ...settings.supplierProfile, accountNumber: e.target.value },
                      })
                    }
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Stores Directory & Catalog & Backup */}
        <div className="space-y-6">
          {/* Client Stores Overview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 mb-3">
              <StoreIcon className="w-4 h-4 text-emerald-600" />
              <span>Partner Stores Directory ({stores.length})</span>
            </h2>

            <div className="space-y-3">
              {stores.map((s) => (
                <div
                  key={s.code}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-emerald-800 text-sm">{s.code}</span>
                    <span className="font-bold text-slate-900">{s.shipTo}</span>
                  </div>
                  <div className="text-slate-700">Bill To: {s.customerName}</div>
                  <div className="text-[11px] text-slate-600 font-khmer">{s.address}</div>
                  <div className="text-[11px] text-slate-500">
                    Tel: <strong>{s.phone}</strong> • Terms: <strong>Net {s.creditTermsDays} Days</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Master 10 Fruit SKUs Catalog */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 mb-3">
              <Barcode className="w-4 h-4 text-teal-600" />
              <span>Master Fruit Catalog (10 SKUs - Watermelon Excluded)</span>
            </h2>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto text-xs">
              {products.map((p) => (
                <div key={p.barcode} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">{p.name}</span>
                    <span className="text-[11px] text-slate-600 font-khmer">{p.khmerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-800 block">
                      ${p.wholesalePrice.toFixed(2)}
                    </span>
                    <span className="font-mono text-[10px] text-slate-600">{p.barcode}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: JSON Backup & State Management */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Download className="w-4 h-4 text-slate-700" />
              <span>Data Backup &amp; Disaster Recovery</span>
            </h2>

            <p className="text-xs text-slate-600 leading-relaxed">
              Export all stored invoices, stores, production batches, and BOM settings to an encrypted JSON backup file, or restore from a previously exported backup.
            </p>

            {importStatus && (
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                {importStatus}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Backup</span>
              </button>

              <label className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer transition border border-slate-300">
                <Upload className="w-3.5 h-3.5" />
                <span>Restore JSON Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleResetToDefaults}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-bold text-xs transition border border-red-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Seed Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern UI Confirm Modal for Database Reset */}
      <ConfirmModal
        isOpen={confirmResetOpen}
        title="Reset All Data to Initial Seed?"
        khmerTitle="កំណត់ទិន្នន័យឡើងវិញទៅលំនាំដើម"
        message="Are you sure you want to reset all data? This will restore the default 10 fruit SKUs, 3 stores, initial BOM rates, and default seed delivery records. Any custom changes made will be lost."
        confirmText="Reset Everything"
        cancelText="Cancel"
        variant="danger"
        onConfirm={executeReset}
        onCancel={() => setConfirmResetOpen(false)}
      />

      {/* Modern UI Alert Modal */}
      <ConfirmModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="Done"
        variant={alertModal.variant || 'success'}
        isAlertOnly={true}
        onConfirm={() => setAlertModal({ isOpen: false, title: '', message: '' })}
        onCancel={() => setAlertModal({ isOpen: false, title: '', message: '' })}
      />
    </div>
  );
}

