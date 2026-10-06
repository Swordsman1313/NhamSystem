import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    return NextResponse.json({ text: result.text || '' });
  } catch (err: any) {
    console.error('Error parsing PO PDF:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to parse PDF document' },
      { status: 500 }
    );
  }
}
