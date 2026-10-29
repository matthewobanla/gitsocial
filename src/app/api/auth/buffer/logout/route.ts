import { NextResponse } from 'next/server';
import { clearBufferSession } from '@/lib/session';

export async function POST() {
  await clearBufferSession();
  return NextResponse.json({ success: true });
}
