import type { RedditPost } from './reddit';

export interface ScoringConfig {
  keywords: string[];
  competitors: string[];
  weightComments: number;
  weightUpvotes: number;
  weightRecency: number;
  weightKeywords: number;
}

export interface ScoredThread {
  post: RedditPost;
  engagementScore: number;
  buyingIntentScore: number;
  totalScore: number;
  matchedKeywords: string[];
  matchedCompetitors: string[];
  intentSignals: string[];
}

const INTENT_SIGNALS = [
  { pattern: /\b(recommend|suggestion|advice|opinion)\b/i, label: 'Asking for recommendations' },
  { pattern: /\b(best|top|better|worst)\b/i, label: 'Comparing options' },
  { pattern: /\b(how do|how to|how can|what's the best way)\b/i, label: 'Seeking how-to guidance' },
  { pattern: /\b(tried|tested|used|using)\b/i, label: 'Evaluating tools/services' },
  { pattern: /\b(looking for|need|want|help)\b/i, label: 'Active need expressed' },
  { pattern: /\b(frustrat|struggling|hate|problem|issue|difficult)\b/i, label: 'Pain point expressed' },
  { pattern: /\b(cost|price|afford|budget|cheap|expensive|pricing)\b/i, label: 'Price sensitivity' },
  { pattern: /\b(switch|alternative|replace|instead of|vs|versus)\b/i, label: 'Open to alternatives' },
  { pattern: /\b(review|experience|thoughts|feedback)\b/i, label: 'Seeking reviews' },
  { pattern: /\b(start|new|launch|found|small business|startup)\b/i, label: 'New business context' },
  { pattern: /\b(fund|funding|raise|investor|capital|cash flow)\b/i, label: 'Financial need' },
  { pattern: /\b(hire|outsourc|consultant|fractional|cfo|advisor)\b/i, label: 'Seeking professional help' },
  { pattern: /\b(acquir|buy|sell|exit|valuation| multiples)\b/i, label: 'M&A interest' },
  { pattern: /\b(automat|workflow|process|scal|system|tool)\b/i, label: 'Looking for efficiency' },
];

function calculateEngagementScore(post: RedditPost, weights: ScoringConfig): number {
  // Normalize scores (logarithmic to prevent domination by viral posts)
  const commentScore = Math.min(Math.log(post.num_comments + 1) * 10, 100) * (weights.weightComments / 100);
  const upvoteScore = Math.min(Math.log(post.score + 1) * 8, 100) * (weights.weightUpvotes / 100);

  // Recency: newer posts score higher (posts from last 7 days)
  const ageInHours = (Date.now() / 1000 - post.created_utc) / 3600;
  const recencyScore = Math.max(0, 100 - (ageInHours / 168) * 100) * (weights.weightRecency / 100);

  return Math.round((commentScore + upvoteScore + recencyScore) / 3);
}

function calculateBuyingIntent(
  post: RedditPost,
  keywords: string[],
  competitors: string[]
): { score: number; matchedKeywords: string[]; matchedCompetitors: string[]; intentSignals: string[] } {
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  let intentScore = 0;
  const matchedKeywords: string[] = [];
  const matchedCompetitors: string[] = [];
  const intentSignals: string[] = [];

  // Check keyword matches (each match adds points)
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      intentScore += 15;
    }
  }

  // Check competitor mentions (high value signals)
  for (const competitor of competitors) {
    if (text.includes(competitor.toLowerCase())) {
      matchedCompetitors.push(competitor);
      intentScore += 25; // Competitor mentions are gold
    }
  }

  // Check intent signals
  for (const signal of INTENT_SIGNALS) {
    if (signal.pattern.test(text)) {
      intentSignals.push(signal.label);
      intentScore += 8;
    }
  }

  return {
    score: Math.min(intentScore, 100),
    matchedKeywords,
    matchedCompetitors,
    intentSignals,
  };
}

export function scoreThread(post: RedditPost, config: ScoringConfig): ScoredThread {
  const engagementScore = calculateEngagementScore(post, config);
  const { score: buyingIntentScore, matchedKeywords, matchedCompetitors, intentSignals } =
    calculateBuyingIntent(post, config.keywords, config.competitors);

  const totalWeight = config.weightComments + config.weightUpvotes + config.weightRecency + config.weightKeywords;
  const engagementWeight = config.weightComments + config.weightUpvotes + config.weightRecency;

  // Weighted total
  const totalScore = Math.round(
    engagementScore * (engagementWeight / totalWeight) +
    buyingIntentScore * (config.weightKeywords / totalWeight)
  );

  return {
    post,
    engagementScore,
    buyingIntentScore,
    totalScore: Math.min(totalScore, 100),
    matchedKeywords,
    matchedCompetitors,
    intentSignals,
  };
}

export function filterAndSort(scoredThreads: ScoredThread[], minScore: number = 30): ScoredThread[] {
  return scoredThreads
    .filter(t => t.totalScore >= minScore)
    .sort((a, b) => b.totalScore - a.totalScore);
}
