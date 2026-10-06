import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const { text } = await extractText(uint8);
    const fullText = Array.isArray(text) ? text.join('\n') : (text || '');

    return NextResponse.json({ text: fullText });
  } catch (err: any) {
    console.error('Error parsing PO PDF:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to parse PDF document' },
      { status: 500 }
    );
  }
}
