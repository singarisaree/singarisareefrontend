import { NextResponse } from 'next/server';

/** Customer self-serve returns disabled — contact admin for damages. */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message:
        'Online returns are not available. For damages within 3 days of delivery, please contact +91 9490458789.',
    },
    { status: 403 },
  );
}
