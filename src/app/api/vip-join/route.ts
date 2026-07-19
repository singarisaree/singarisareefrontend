import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api-origin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${API_BASE_URL}/storefront/vip-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Server not reachable. Please try again.' },
      { status: 503 },
    );
  }
}
