'use client';

import { Invoice, SupplierProfile } from '@/lib/types';
import AbaQrCode from './AbaQrCode';

const formatDisplayDate = (date: Date | string) => {
  if (!date) return '';
  let d: Date;
  if (typeof date === 'string' && date.includes('-')) {
    const parts = date.split('T')[0].split('-').map(Number);
    d = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    d = new Date(date);
  }
  const day = d.getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

interface CommercialInvoiceProps {
  invoice: Invoice;
  supplier: SupplierProfile;
  exchangeRate?: number;
  showKhmerItemNames?: boolean;
}

export default function CommercialInvoice({
  invoice,
  supplier,
  showKhmerItemNames = true,
}: CommercialInvoiceProps) {
  // Only display items with quantity > 0
  const activeItems = invoice.items.filter((item) => Number(item.quantity) > 0);

  const totalUSD = activeItems.reduce(
    (acc, it) => acc + Number(it.quantity) * Number(it.unitPrice),
    0
  );

  return (
    <div className="a4-preview-sheet text-black bg-white font-sans text-[11px] leading-tight select-text print:p-0 print:border-none">
      {/* 1. Centered Header Banner */}
      <div className="w-full bg-[#e9f2eb] py-2 mb-4 text-center rounded-xs border border-[#d8e6db] print:border-none">
        <h1 className="text-base font-bold text-black font-khmer tracking-wide">
          វិក្កយបត្រ / INVOICE
        </h1>
      </div>

      {/* 2. Supplier Info & Invoice Meta Grid */}
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

        {/* Right: Invoice Metadata */}
        <div className="space-y-1 text-right sm:text-left sm:pl-12">
          <div>
            <span className="font-khmer font-bold">លេខវិក្កយបត្រ / Invoice No: </span>
            <span className="font-bold font-mono text-[11px] ml-1">
              {invoice.invoiceNumber}
            </span>
          </div>
          <div>
            <span className="font-khmer font-bold">កាលបរិច្ឆេទ / Invoice Date: </span>
            <span className="font-bold ml-1 font-mono">
              {formatDisplayDate(invoice.invoiceDate)}
            </span>
          </div>
          <div>
            <span className="font-khmer font-bold">លក្ខខណ្ឌទូទាត់ / Credit Terms: </span>
            <span className="font-bold ml-1 font-mono">
              {formatDisplayDate(invoice.dueDate)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Customer Information Box (Left-aligned, ~54% width) */}
      <div className="w-full sm:w-[54%] border border-black mb-5 text-[10px]">
        <div className="bg-[#e9f2eb] border-b border-black px-2.5 py-1 font-bold font-khmer text-black">
          ព័ត៌មានអតិថិជន / BILL TO / CUSTOMER INFORMATION
        </div>
        <div className="p-2 space-y-1">
          <div>
            <span className="font-khmer font-bold">ឈ្មោះអតិថិជន / Customer Name: </span>
            <span className="font-bold">{invoice.customerName}</span>
          </div>
          <div>
            <span className="font-khmer font-bold">ដឹកទៅ / Ship To: </span>
            <span className="font-bold">{invoice.shipTo}</span>
          </div>
          <div className="font-khmer">
            <span className="font-bold">អាសយដ្ឋាន / Address: </span>
            <span>{invoice.address}</span>
          </div>
          <div>
            <span className="font-khmer font-bold">លេខទូរស័ព្ទ / Tel: </span>
            <span className="font-bold">{invoice.phone}</span>
          </div>
        </div>
      </div>

      {/* 4. Products Table (With Khmer Fruit Names) */}
      <table className="w-full border-collapse border border-black text-[10.5px] mb-4">
        <thead>
          <tr className="border-b border-black bg-white">
            <th className="border border-black py-1.5 px-2 text-center font-bold w-10">
              No
            </th>
            <th className="border border-black py-1.5 px-3 text-center font-bold w-36">
              Barcode
            </th>
            <th className="border border-black py-1.5 px-3 text-center font-bold">
              Item Name / មុខទំនិញ
            </th>
            <th className="border border-black py-1.5 px-2 text-center font-bold w-16">
              UOM (Pcs)
            </th>
            <th className="border border-black py-1.5 px-2 text-center font-bold w-14">
              QTY
            </th>
            <th className="border border-black py-1.5 px-3 text-center font-bold w-24">
              Unit Price ($)
            </th>
            <th className="border border-black py-1.5 px-3 text-center font-bold w-28">
              Total Amount ($)
            </th>
          </tr>
        </thead>
        <tbody>
          {activeItems.map((item, index) => {
            const lineTotal = Number(item.quantity) * Number(item.unitPrice);
            return (
              <tr key={item.id || index} className="border-b border-black">
                <td className="border border-black py-1.5 px-2 text-center">
                  {index + 1}
                </td>
                <td className="border border-black py-1.5 px-3 text-center font-mono text-[10px]">
                  {item.barcode}
                </td>
                <td className="border border-black py-1.5 px-3 text-left">
                  <div className="font-semibold text-black leading-tight">
                    {item.name}
                    {item.isCustom && (
                      <span className="ml-1 text-[9px] font-semibold text-slate-500">
                        (Custom)
                      </span>
                    )}
                  </div>
                  {/* Khmer Name */}
                  {showKhmerItemNames && item.khmerName && (
                    <div className="text-[10px] text-slate-700 font-khmer leading-tight mt-0.5">
                      {item.khmerName}
                    </div>
                  )}
                </td>
                <td className="border border-black py-1.5 px-2 text-center">
                  {item.uom}
                </td>
                <td className="border border-black py-1.5 px-2 text-center font-medium">
                  {item.quantity}
                </td>
                <td className="border border-black py-1.5 px-2.5">
                  <div className="flex justify-between w-full">
                    <span>$</span>
                    <span className="font-mono">{Number(item.unitPrice).toFixed(2)}</span>
                  </div>
                </td>
                <td className="border border-black py-1.5 px-2.5">
                  <div className="flex justify-between w-full font-medium">
                    <span>$</span>
                    <span className="font-mono">{lineTotal.toFixed(2)}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black font-bold">
            <td
              colSpan={5}
              className="border border-black py-2 px-3 text-center font-khmer font-bold"
            >
              សរុបរួម / Total Amount (USD)
            </td>
            <td className="border border-black py-2 px-2.5 text-center font-bold">
              $
            </td>
            <td className="border border-black py-2 px-2.5 text-right font-mono font-bold text-xs">
              {totalUSD.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* 5. Bank Payment Info Block */}
      <div className="text-center font-bold text-[10.5px] mt-4 mb-2">
        Payment Info: {supplier.bankName} | Account Name: {supplier.accountName} | Account No: {supplier.accountNumber} ({supplier.currency})
      </div>

      {/* 6. ABA KHQR Code */}
      <div className="flex justify-center mb-6">
        <AbaQrCode size={115} />
      </div>

      {/* 7. Dual Signature Section */}
      <div className="grid grid-cols-2 gap-12 pt-2 text-center text-[10.5px]">
        {/* Buyer Signature */}
        <div>
          <p className="font-khmer font-bold">ហត្ថលេខា និងឈ្មោះអ្នកទិញ</p>
          <p className="font-bold text-[10px]">Buyer&apos;s Signature and Name</p>
          <div className="h-14"></div>
          <p className="font-khmer text-[10px] text-slate-800">
            កាលបរិច្ឆេទ / Date: _____ / _____ / _________
          </p>
        </div>

        {/* Seller Signature */}
        <div>
          <p className="font-khmer font-bold">ហត្ថលេខា និងឈ្មោះអ្នកលក់</p>
          <p className="font-bold text-[10px]">Seller&apos;s Signature and Name</p>
          <div className="h-14"></div>
          <p className="font-khmer text-[10px] text-slate-800">
            កាលបរិច្ឆេទ / Date: _____ / _____ / _________
          </p>
        </div>
      </div>
    </div>
  );
}
