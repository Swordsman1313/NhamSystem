'use client';

import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileCheck,
  Calendar,
  Store as StoreIcon,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Product, Store } from '@/lib/types';
import { parsePOContent, ParsedPOResult } from '@/lib/poParser';
import { formatUSD } from '@/lib/storage';

interface ImportPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  stores: Store[];
  currentDate: string;
  onApply: (result: ParsedPOResult) => void;
}

export default function ImportPOModal({
  isOpen,
  onClose,
  products,
  stores,
  currentDate,
  onApply,
}: ImportPOModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [parseStatus, setParseStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to import');
  const [pastedText, setPastedText] = useState<string>('');
  const [parsedResult, setParsedResult] = useState<ParsedPOResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setParseStatus('idle');
    setStatusMessage('Ready to import');
    setPastedText('');
    setParsedResult(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Process extracted text
  const processText = (text: string, sourceName?: string) => {
    if (!text || text.trim().length === 0) {
      setParseStatus('error');
      setStatusMessage('No readable text found in document');
      return;
    }

    try {
      const result = parsePOContent(text, products, stores, currentDate);
      if (result.items.length === 0) {
        setParseStatus('error');
        setStatusMessage('No fruit line items matching barcodes (201680...) found');
        setParsedResult(null);
      } else {
        setParseStatus('success');
        setStatusMessage(
          `Successfully parsed ${result.items.length} items (${result.totalQuantity} boxes, ${formatUSD(
            result.totalAmountUSD
          )})`
        );
        setParsedResult(result);
      }
    } catch (err: any) {
      setParseStatus('error');
      setStatusMessage(err?.message || 'Failed to parse PO content');
      setParsedResult(null);
    }
  };

  // Handle PDF file upload via API route /api/parse-po
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setParseStatus('error');
      setStatusMessage('Please upload a valid .pdf file');
      return;
    }

    setFileName(file.name);
    setParseStatus('parsing');
    setStatusMessage('Parsing PO PDF...');
    setParsedResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse-po', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server failed to parse PDF');
      }

      processText(data.text || '', file.name);
    } catch (err: any) {
      console.error('Error during PDF parsing:', err);
      setParseStatus('error');
      setStatusMessage(err?.message || 'Error parsing PDF. Try pasting PO text.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setParseStatus('error');
      setStatusMessage('Please paste the PO text first');
      return;
    }
    setParseStatus('parsing');
    setStatusMessage('Parsing PO text...');
    setTimeout(() => {
      processText(pastedText, 'Pasted text');
    }, 200);
  };

  const handleConfirmApply = () => {
    if (!parsedResult || parsedResult.items.length === 0) return;
    onApply(parsedResult);
    handleClose();
  };

  const matchedStore = stores.find((s) => s.code === parsedResult?.matchedStoreCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Import Store PO (PDF / Text)</h2>
              <p className="text-xs text-slate-500">
                Upload ON Mart Purchase Order or paste raw text to auto-fill line items
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Status Badge */}
            {parseStatus === 'idle' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Idle
              </span>
            )}
            {parseStatus === 'parsing' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Parsing PO...
              </span>
            )}
            {parseStatus === 'success' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Success
              </span>
            )}
            {parseStatus === 'error' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Error
              </span>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Tabs: Upload PDF vs Paste PO Text */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload PO PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>Paste PO Text</span>
            </button>
          </div>

          {/* Tab 1: File Dropzone */}
          {activeTab === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/60'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {fileName ? (
                    <span className="text-emerald-700 flex items-center justify-center gap-1.5">
                      <FileCheck className="w-4 h-4" /> {fileName}
                    </span>
                  ) : (
                    'Click to upload or drag & drop Store PO PDF'
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Supports digital Purchase Order PDFs from ON Mart
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Paste Raw Text */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Paste PO text here...\nExample:\nORDER DATE | 23-09-2026\nON Mart Tuol Kork (Street 592)\n2016800000025 Sweet Melon Cubes 300G 5 $1.00\n2016800000032 Baby Mango Bites 4 $0.76`}
                rows={5}
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs"
                >
                  Parse Pasted Text
                </button>
              </div>
            </div>
          )}

          {/* Status Feedback Banner */}
          {statusMessage && parseStatus !== 'idle' && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center space-x-2 border ${
                parseStatus === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : parseStatus === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {parseStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {parseStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {parseStatus === 'parsing' && <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />}
              <span className="font-medium">{statusMessage}</span>
            </div>
          )}

          {/* Parsed Preview Section */}
          {parsedResult && parsedResult.items.length > 0 && (
            <div className="space-y-3 pt-2">
              {/* Detected Meta: Destination & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <StoreIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Store Destination</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {matchedStore?.shipTo || parsedResult.matchedStoreCode}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    [{parsedResult.matchedStoreCode}] {matchedStore?.customerName}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Delivery Date</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 font-mono">
                    {parsedResult.orderDate}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Auto-extracted from PO header
                  </div>
                </div>
              </div>

              {/* Table of Parsed Line Items */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100/80 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Matched Line Items ({parsedResult.items.length})</span>
                  </div>
                  <span className="text-emerald-700 font-mono">
                    {parsedResult.totalQuantity} boxes • {formatUSD(parsedResult.totalAmountUSD)}
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {parsedResult.items.map((item, idx) => {
                    const price = item.unitPrice || item.matchedProduct?.wholesalePrice || 0;
                    const lineTotal = item.quantity * price;
                    return (
                      <div
                        key={`${item.barcode}-${idx}`}
                        className="px-3.5 py-2 flex items-center justify-between hover:bg-slate-50/80 transition"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{item.name}</span>
                            <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Matched
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {item.barcode}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-slate-900">
                            {item.quantity} {item.matchedProduct?.uom || 'Pcs'}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            @{formatUSD(price)} = {formatUSD(lineTotal)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmApply}
            disabled={!parsedResult || parsedResult.items.length === 0}
            className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs ${
              parsedResult && parsedResult.items.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <span>
              Apply {parsedResult?.items.length || 0} Items (
              {formatUSD(parsedResult?.totalAmountUSD || 0)})
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
