import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api-origin';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const res = await fetch(`${API_BASE_URL}/return-requests`, {
      method: 'POST',
      body: formData,
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
