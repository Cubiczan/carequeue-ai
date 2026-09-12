import { NextResponse } from 'next/server';
import { testRedditConnection, isRedditConfigured } from '@/lib/reddit';

export async function POST() {
  try {
    if (!isRedditConfigured()) {
      return NextResponse.json({ success: false, error: 'Reddit API credentials not set in .env (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD)' });
    }
    const success = await testRedditConnection();
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
