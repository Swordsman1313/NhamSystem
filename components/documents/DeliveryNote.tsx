'use client';

import { Invoice, SupplierProfile } from '@/lib/types';

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

interface DeliveryNoteProps {
  invoice: Invoice;
  supplier: SupplierProfile;
  showKhmerItemNames?: boolean;
}

export default function DeliveryNote({
  invoice,
  supplier,
  showKhmerItemNames = true,
}: DeliveryNoteProps) {
  // Only display items with quantity > 0
  const activeItems = invoice.items.filter((item) => Number(item.quantity) > 0);
  const totalQty = activeItems.reduce((acc, it) => acc + Number(it.quantity), 0);

  return (
    <div className="a4-preview-sheet text-black bg-white font-sans text-[11px] leading-tight select-text print:p-0 print:border-none">
      {/* 1. Centered Header Banner */}
      <div className="w-full bg-[#e9f2eb] py-2 mb-4 text-center rounded-xs border border-[#d8e6db] print:border-none">
        <h1 className="text-base font-bold text-black font-khmer tracking-wide">
          ប័ណ្ណដឹកទំនិញ / Delivery Note
        </h1>
      </div>

      {/* 2. Supplier Info & Delivery Meta Grid */}
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

        {/* Right: Delivery Metadata */}
        <div className="space-y-1 text-right sm:text-left sm:pl-12">
          <div>
            <span className="font-khmer font-bold">លេខដឹកជញ្ជូន / Delivery No: </span>
            <span className="font-bold font-mono text-[11px] ml-1">
              {invoice.invoiceNumber}
            </span>
          </div>
          <div>
            <span className="font-khmer font-bold">កាលបរិច្ឆេទ / Delivery Date: </span>
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

      {/* 4. Products Table (5 columns, with Khmer Fruit Names) */}
      <table className="w-full border-collapse border border-black text-[10.5px] mb-8">
        <thead>
          <tr className="border-b border-black bg-white">
            <th className="border border-black py-1.5 px-2 text-center font-bold w-12">
              No
            </th>
            <th className="border border-black py-1.5 px-4 text-center font-bold w-44">
              Barcode
            </th>
            <th className="border border-black py-1.5 px-4 text-center font-bold">
              Item Name / មុខទំនិញ
            </th>
            <th className="border border-black py-1.5 px-4 text-center font-bold w-24">
              UOM (Pcs)
            </th>
            <th className="border border-black py-1.5 px-4 text-center font-bold w-24">
              QTY
            </th>
          </tr>
        </thead>
        <tbody>
          {activeItems.map((item, index) => (
            <tr key={item.id || index} className="border-b border-black">
              <td className="border border-black py-2 px-2 text-center">
                {index + 1}
              </td>
              <td className="border border-black py-2 px-4 text-center font-mono text-[10.5px]">
                {item.barcode}
              </td>
              <td className="border border-black py-2 px-4 text-left">
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
              <td className="border border-black py-2 px-4 text-center">
                {item.uom}
              </td>
              <td className="border border-black py-2 px-4 text-center font-bold">
                {item.quantity}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black font-bold">
            <td
              colSpan={4}
              className="border border-black py-2 px-4 text-center font-khmer font-bold"
            >
              សរុបចំនួន / Total Quantity
            </td>
            <td className="border border-black py-2 px-4 text-center font-bold text-xs">
              {totalQty}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* 5. Dual Signature Section */}
      <div className="grid grid-cols-2 gap-12 pt-8 text-center text-[10.5px]">
        {/* Buyer Signature */}
        <div>
          <p className="font-khmer font-bold">ហត្ថលេខា និងឈ្មោះអ្នកទិញ</p>
          <p className="font-bold text-[10px]">Buyer&apos;s Signature and Name</p>
          <div className="h-16"></div>
          <p className="font-khmer text-[10px] text-slate-800">
            កាលបរិច្ឆេទ / Date: _____ / _____ / _________
          </p>
        </div>

        {/* Delivery Signature */}
        <div>
          <p className="font-khmer font-bold">ហត្ថលេខា និងឈ្មោះអ្នកដឹក</p>
          <p className="font-bold text-[10px]">Delivery&apos;s Signature and Name</p>
          <div className="h-16"></div>
          <p className="font-khmer text-[10px] text-slate-800">
            កាលបរិច្ឆេទ / Date: _____ / _____ / _________
          </p>
        </div>
      </div>
    </div>
  );
}
