'use client';

import React from 'react';
import { Invoice, Store, SupplierProfile } from '@/lib/types';
import { formatDateDisplay } from '@/lib/storage';
import AbaQrCode from './AbaQrCode';

interface SummaryStatementProps {
  store: Store;
  invoices: Invoice[];
  supplier: SupplierProfile;
  periodLabel: string;
  exchangeRate?: number;
}

export default function SummaryStatement({
  store,
  invoices,
  supplier,
  periodLabel,
}: SummaryStatementProps) {
  const totalQty = invoices.reduce((acc, inv) => acc + (inv.totalQuantity || 0), 0);
  const totalUSD = invoices.reduce((acc, inv) => acc + (inv.totalAmountUSD || 0), 0);

  return (
    <div className="a4-preview-sheet text-black bg-white font-sans text-[11px] leading-tight select-text print:p-0 print:border-none">
      {/* 1. Centered Header Banner */}
      <div className="w-full bg-[#e9f2eb] py-2 mb-4 text-center rounded-xs border border-[#d8e6db] print:border-none">
        <h1 className="text-base font-bold text-black font-khmer tracking-wide">
          របាយការណ៍បូកសរុប / SUMMARY STATEMENT
        </h1>
      </div>

      {/* 2. Supplier Info & Period Meta Grid */}
      <div className="grid grid-cols-2 gap-6 mb-4 text-[10.5px]">
        {/* Left: Supplier Details */}
        <div className="space-y-1">
          <div>
            <span className="font-khmer font-bold">ឈ្មោះអ្នកផ្គត់ផ្គង់ / Supplier Name: </span>
            <span className="font-bold">{supplier.name}</span>
          </div>
          <div className="font-khmer">
            <span className="font-bold">អាសយដ្ឋាន / Address: </span>
            <span>{supplier.address}</span>
          </div>
          <div>
            <span className="font-khmer font-bold">លេខទូរស័ព្ទ / Tel: </span>
            <span className="font-bold">{supplier.phone}</span>
          </div>
        </div>

        {/* Right: Statement Metadata */}
        <div className="space-y-1 text-right sm:text-left sm:pl-12">
          <div>
            <span className="font-khmer font-bold">សម្រាប់ខែ / Billing Period: </span>
            <span className="font-bold font-mono ml-1 text-emerald-900">{periodLabel}</span>
          </div>
          <div>
            <span className="font-khmer font-bold">កាលបរិច្ឆេទចេញ / Issued Date: </span>
            <span className="font-bold ml-1">
              {new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <div>
            <span className="font-khmer font-bold">ចំនួនវិក្កយបត្រ / Invoices: </span>
            <span className="font-bold ml-1">{invoices.length} deliveries</span>
          </div>
        </div>
      </div>

      {/* 3. Customer Information Box */}
      <div className="w-full sm:w-[54%] border border-black mb-5 text-[10px]">
        <div className="bg-[#e9f2eb] border-b border-black px-2.5 py-1 font-bold font-khmer text-black">
          ព័ត៌មានអតិថិជន / BILL TO / CUSTOMER INFORMATION
        </div>
        <div className="p-2 space-y-1">
          <div>
            <span className="font-khmer font-bold">ឈ្មោះអតិថិជន / Customer Name: </span>
            <span className="font-bold">{store.customerName}</span>
          </div>
          <div>
            <span className="font-khmer font-bold">ដឹកទៅ / Ship To: </span>
            <span className="font-bold">{store.shipTo}</span>
          </div>
          <div className="font-khmer">
            <span className="font-bold">អាសយដ្ឋាន / Address: </span>
            <span>{store.address}</span>
          </div>
          <div>
            <span className="font-khmer font-bold">លេខទូរស័ព្ទ / Tel: </span>
            <span className="font-bold">{store.phone}</span>
          </div>
        </div>
      </div>

      {/* 4. Statement Invoices Table */}
      <table className="w-full border-collapse border border-black text-[10.5px] mb-4">
        <thead>
          <tr className="border-b border-black bg-white">
            <th className="border border-black py-1.5 px-2 text-center font-bold w-12">
              No
            </th>
            <th className="border border-black py-1.5 px-3 text-center font-bold w-44">
              Invoice No / លេខវិក្កយបត្រ
            </th>
            <th className="border border-black py-1.5 px-3 text-center font-bold">
              Date / កាលបរិច្ឆេទ
            </th>
            <th className="border border-black py-1.5 px-3 text-center font-bold w-28">
              QTY / ចំនួន
            </th>
            <th className="border border-black py-1.5 px-3 text-center font-bold w-36">
              Total Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={5} className="border border-black py-6 text-center italic text-slate-500">
                No deliveries recorded for this billing cycle.
              </td>
            </tr>
          ) : (
            invoices.map((inv, index) => (
              <tr key={inv.id || index} className="border-b border-black">
                <td className="border border-black py-1.5 px-2 text-center">
                  {index + 1}
                </td>
                <td className="border border-black py-1.5 px-3 text-center font-mono font-medium">
                  {inv.invoiceNumber}
                </td>
                <td className="border border-black py-1.5 px-3 text-center">
                  {formatDateDisplay(inv.invoiceDate)}
                </td>
                <td className="border border-black py-1.5 px-3 text-center font-medium">
                  {inv.totalQuantity}
                </td>
                <td className="border border-black py-1.5 px-3">
                  <div className="flex justify-between w-full font-medium">
                    <span>$</span>
                    <span className="font-mono">{inv.totalAmountUSD.toFixed(2)}</span>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black font-bold">
            <td
              colSpan={3}
              className="border border-black py-2 px-3 text-center font-khmer font-bold"
            >
              សរុប / Total Amount (USD)
            </td>
            <td className="border border-black py-2 px-3 text-center font-bold text-xs">
              {totalQty}
            </td>
            <td className="border border-black py-2 px-3">
              <div className="flex justify-between w-full font-mono font-bold text-xs">
                <span>$</span>
                <span>{totalUSD.toFixed(2)}</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* 5. Bank Payment Info */}
      <div className="text-center font-bold text-[10.5px] mt-4 mb-2">
        Payment Info: {supplier.bankName} | Account Name: {supplier.accountName} | Account No: {supplier.accountNumber} ({supplier.currency})
      </div>

      {/* 6. ABA QR Code */}
      <div className="flex justify-center mb-6">
        <AbaQrCode accountName={supplier.accountName} size={110} />
      </div>

      {/* 7. Dual Signature Section */}
      <div className="grid grid-cols-2 gap-12 pt-2 text-center text-[10.5px]">
        {/* Buyer Signature */}
        <div>
          <p className="font-khmer font-bold">ហត្ថលេខា និងឈ្មោះអ្នកទិញ</p>
          <p className="font-bold text-[10px]">Buyer&apos;s Signature and Name</p>
          <div className="h-16"></div>
          <p className="font-khmer text-[10px] text-slate-800">
            កាលបរិច្ឆេទ / Date: ............/............/............
          </p>
        </div>

        {/* Seller Signature */}
        <div>
          <p className="font-khmer font-bold">ហត្ថលេខា និងឈ្មោះអ្នកលក់</p>
          <p className="font-bold text-[10px]">Seller&apos;s Signature and Name</p>
          <div className="h-16"></div>
          <p className="font-khmer text-[10px] text-slate-800">
            កាលបរិច្ឆេទ / Date: ............/............/............
          </p>
        </div>
      </div>
    </div>
  );
}
