import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // Check if data already exists
    const existing = await db.businessProfile.count();
    if (existing > 0) {
      return NextResponse.json({ message: 'Database already seeded', count: existing });
    }

    // Create Impact Quadrant
    await db.businessProfile.create({
      data: {
        name: 'Impact Quadrant',
        website: 'https://www.impactquadrant.info/',
        email: 'sam@impactquadrant.info',
        description: 'Fractional CFO services for growth companies. Strategic planning, capital allocation, cash flow forecasting and capital raises.',
        buyerPersona: 'Founders and CEOs of growth-stage startups (seed to Series B) who need strategic financial guidance but cannot afford a full-time CFO. Typically 5-50 employees, $500K-$20M revenue, recently raised or raising capital.',
        painPoints: 'Cash runway uncertainty, messy books, cannot afford full-time CFO, need to raise capital, financial projections for investors, lack of financial strategy',
        valueProposition: 'We provide experienced fractional CFO services that give growth companies Fortune 500 financial leadership at a fraction of the cost. Strategic planning, capital allocation, cash flow forecasting and capital raises.',
        subreddits: JSON.stringify(['smallbusiness', 'startups', 'Entrepreneur', 'business', 'SaaS', 'Accounting', 'Bookkeeping']),
        keywords: JSON.stringify(['fractional cfo', 'cfo services', 'cash flow', 'financial planning', 'capital raise', 'startup finance', 'business finance', 'financial strategy', 'bookkeeping', 'accounting', 'tax planning', 'runway', 'burn rate', 'financial model', 'fundraising', 'series a', 'series b', 'seed round']),
        competitors: JSON.stringify(['Pilot', 'Bench', 'Kruze Consulting', 'Finta', 'Ramp', 'Brex', 'Mercury']),
        replyTone: 'helpful, knowledgeable, not salesy',
        scoreWeightComments: 20,
        scoreWeightUpvotes: 15,
        scoreWeightRecency: 25,
        scoreWeightKeywords: 40,
      },
    });

    // Create Cubic Zan
    await db.businessProfile.create({
      data: {
        name: 'Cubic Zan',
        website: 'https://www.cubiczan.com/',
        email: 'sam@cubiczan.com',
        description: 'Acquiring, optimizing, and exiting small businesses for maximum value. Leveraging automation and AI to unlock hidden value throughout the business lifecycle in the US market.',
        buyerPersona: 'First-time business buyers and experienced operators looking to acquire small businesses ($500K-$10M revenue) in the US market. Tech-savvy entrepreneurs interested in using automation and AI to optimize operations.',
        painPoints: 'Finding quality businesses to buy, due diligence complexity, overpaying for businesses, post-acquisition integration, operational inefficiencies, lack of systems/processes',
        valueProposition: 'We acquire, optimize, and exit small businesses for maximum value. Leveraging automation and AI to unlock hidden value throughout the business lifecycle in the US market.',
        subreddits: JSON.stringify(['Entrepreneur', 'smallbusiness', 'business', 'realestateinvesting', 'investing', 'startups', 'ExperiencedDevs', 'SaaS']),
        keywords: JSON.stringify(['buy a business', 'acquire business', 'business acquisition', 'small business for sale', 'buying an existing business', 'business broker', 'sell my business', 'business valuation', 'due diligence', 'M&A', 'roll up strategy', 'hold and grow', 'business exit', 'multiples', 'EBITDA']),
        competitors: JSON.stringify(['Acquire.com', 'Flippa', 'BizBuySell', 'Quiet Light Brokerage', 'FE International', 'Empire Flippers']),
        replyTone: 'helpful, knowledgeable, not salesy',
        scoreWeightComments: 20,
        scoreWeightUpvotes: 15,
        scoreWeightRecency: 25,
        scoreWeightKeywords: 40,
      },
    });

    return NextResponse.json({ message: 'Database seeded successfully', businesses: 2 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
