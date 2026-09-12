import { NextResponse } from 'next/server';
import { testEmailConnection } from '@/lib/email-service';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ success: false, error: 'Email address required' });
    const success = await testEmailConnection(email);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
