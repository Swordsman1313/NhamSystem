'use client';

import React from 'react';

interface AbaQrCodeProps {
  size?: number; // width in pixels, default 115
  className?: string;
  accountName?: string;
}

export default function AbaQrCode({
  size = 115,
  className = '',
  accountName,
}: AbaQrCodeProps) {
  return (
    <div className={`flex flex-col items-center justify-center my-1 print:my-0.5 ${className}`}>
      {/* Real trimmed ABA Bank QR code image matching official PDF */}
      <img
        src="/aba-qr.png"
        alt="ABA Pay QR Code - NANCHING BO"
        width={size}
        height={Math.round(size * (939 / 792))}
        style={{ width: `${size}px`, height: 'auto' }}
        className="block rounded-xs shadow-2xs print:shadow-none"
      />
    </div>
  );
}
