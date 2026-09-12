'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp, Target, MessageSquare, BarChart3, Plus, ExternalLink,
  RefreshCw, Mail, Search, CheckCircle2, AlertCircle, Globe, Shield,
  BookOpen, Send, Trash2, Edit, Eye, Clock, Zap, Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/* ─── TYPES ─── */
interface BusinessProfile {
  id: string; name: string; website: string; email: string; description: string;
  buyerPersona: string; painPoints: string; valueProposition: string;
  subreddits: string; keywords: string; competitors: string;
  replyTone: string;
  scoreWeightComments: number; scoreWeightUpvotes: number;
  scoreWeightRecency: number; scoreWeightKeywords: number;
  createdAt: string; updatedAt: string;
  _count?: { threads: number; scanRuns: number };
}

interface RedditThread {
  id: string; businessId: string; redditId: string; subreddit: string;
  title: string; author: string; selftext: string; url: string;
  score: number; numComments: number; createdAtReddit: string;
  engagementScore: number; buyingIntentScore: number; totalScore: number;
  matchedKeywords: string; matchedCompetitors: string; intentSignals: string;
  draftReply: string | null; replyStatus: string;
  isRelevant: boolean; isProcessed: boolean;
  createdAt: string;
}

interface ScanRun {
  id: string; businessId: string; status: string;
  threadsFound: number; threadsScored: number;
  errorMessage: string | null; startedAt: string; completedAt: string | null;
}

interface EmailDigest {
  id: string; businessId: string; sentAt: string;
  subject: string; threadCount: number; topThreads: string; status: string;
}

interface Stats {
  totalThreads: number; highIntent: number; pendingReplies: number;
  totalScans: number; completedScans: number; recentThreads: RedditThread[];
}

/* ─── DEFAULTS ─── */
const emptyBusiness = {
  name: '', website: '', email: '', description: '', buyerPersona: '',
  painPoints: '', valueProposition: '', subreddits: '', keywords: '',
  competitors: '', replyTone: 'helpful, knowledgeable, not salesy',
  scoreWeightComments: 20, scoreWeightUpvotes: 15,
  scoreWeightRecency: 25, scoreWeightKeywords: 40,
};

/* ─── HELPERS ─── */
function parseJSON(str: string): string[] {
  try { return JSON.parse(str || '[]'); } catch { return []; }
}
function scoreColor(s: number) { return s >= 60 ? 'bg-emerald-100 text-emerald-800' : s >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'; }
function statusColor(s: string) {
  const m: Record<string, string> = { pending: 'bg-gray-100 text-gray-800', approved: 'bg-emerald-100 text-emerald-800', posted: 'bg-blue-100 text-blue-800', skipped: 'bg-red-100 text-red-700' };
  return m[s] || 'bg-gray-100 text-gray-800';
}

/* ─── PAGE ─── */
export default function Home() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [threads, setThreads] = useState<RedditThread[]>([]);
  const [scanRuns, setScanRuns] = useState<ScanRun[]>([]);
  const [digests, setDigests] = useState<EmailDigest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBiz, setSelectedBiz] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scanning, setScanning] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);

  // Business form dialog
  const [bizDialogOpen, setBizDialogOpen] = useState(false);
  const [editingBiz, setEditingBiz] = useState<BusinessProfile | null>(null);
  const [bizForm, setBizForm] = useState(emptyBusiness);
  const [savingBiz, setSavingBiz] = useState(false);

  const fetchBusinesses = useCallback(async () => {
    try {
      const r = await fetch('/api/businesses');
      const d = await r.json();
      setBusinesses(d);
      if (d.length > 0 && !selectedBiz) setSelectedBiz(d[0].id);
    } catch { /* empty */ }
  }, [selectedBiz]);

  const fetchThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBiz) params.set('businessId', selectedBiz);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const r = await fetch(`/api/threads?${params}`);
      setThreads(await r.json());
    } catch { /* empty */ }
  }, [selectedBiz, statusFilter]);

  const fetchScanRuns = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBiz) params.set('businessId', selectedBiz);
      const r = await fetch(`/api/scan-runs?${params}`);
      setScanRuns(await r.json());
    } catch { /* empty */ }
  }, [selectedBiz]);

  const fetchDigests = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBiz) params.set('businessId', selectedBiz);
      const r = await fetch(`/api/digests?${params}`);
      setDigests(await r.json());
    } catch { /* empty */ }
  }, [selectedBiz]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch('/api/stats');
      setStats(await r.json());
    } catch { /* empty */ }
  }, []);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([fetchBusinesses(), fetchStats(), fetchThreads(), fetchScanRuns(), fetchDigests()])
      .finally(() => setLoading(false));
  }, [fetchBusinesses, fetchStats, fetchThreads, fetchScanRuns, fetchDigests]);

  useEffect(() => { fetchAll(); // eslint-disable-line react-hooks/set-state-in-effect -- intentional initial data fetch
  }, [fetchAll]);

  // ─── ACTIONS ───
  const handleSaveBiz = async () => {
    setSavingBiz(true);
    try {
      const data = {
        ...bizForm,
        subreddits: JSON.stringify(bizForm.subreddits.split('\n').map(s => s.trim()).filter(Boolean)),
        keywords: JSON.stringify(bizForm.keywords.split('\n').map(s => s.trim()).filter(Boolean)),
        competitors: JSON.stringify(bizForm.competitors.split('\n').map(s => s.trim()).filter(Boolean)),
      };
      if (editingBiz) {
        await fetch(`/api/businesses/${editingBiz.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        toast({ title: 'Business updated', description: `${data.name} saved successfully.` });
      } else {
        await fetch('/api/businesses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        toast({ title: 'Business created', description: `${data.name} added.` });
      }
      setBizDialogOpen(false);
      setEditingBiz(null);
      setBizForm(emptyBusiness);
      fetchAll();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setSavingBiz(false);
  };

  const handleDeleteBiz = async (id: string) => {
    try {
      await fetch(`/api/businesses/${id}`, { method: 'DELETE' });
      toast({ title: 'Deleted', description: 'Business removed.' });
      if (selectedBiz === id) setSelectedBiz('');
      fetchAll();
    } catch { /* empty */ }
  };

  const handleScan = async () => {
    if (!selectedBiz) { toast({ title: 'Select a business first', variant: 'destructive' }); return; }
    setScanning(true);
    try {
      const r = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: selectedBiz }) });
      const d = await r.json();
      if (d.success) toast({ title: 'Scan complete', description: `Found ${d.threadsFound} posts, ${d.threadsScored} scored.` });
      else toast({ title: 'Scan issue', description: d.error, variant: 'destructive' });
      fetchAll();
    } catch (e: any) { toast({ title: 'Scan failed', description: e.message, variant: 'destructive' }); }
    setScanning(false);
  };

  const handleDraftReply = async (threadId: string) => {
    setDraftingId(threadId);
    try {
      const r = await fetch(`/api/threads/${threadId}`, { method: 'POST' });
      const d = await r.json();
      if (d.draftReply) toast({ title: 'Reply drafted', description: 'AI reply generated successfully.' });
      else toast({ title: 'Error', description: d.error, variant: 'destructive' });
      fetchThreads();
    } catch { toast({ title: 'Error drafting reply', variant: 'destructive' }); }
    setDraftingId(null);
  };

  const handleUpdateThread = async (threadId: string, data: Partial<RedditThread>) => {
    try {
      await fetch(`/api/threads/${threadId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      toast({ title: 'Updated', description: `Thread marked as ${data.replyStatus}.` });
      fetchThreads();
      fetchStats();
    } catch { /* empty */ }
  };

  const handleSendDigest = async () => {
    if (!selectedBiz) { toast({ title: 'Select a business first', variant: 'destructive' }); return; }
    setSendingDigest(true);
    try {
      const r = await fetch('/api/digest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: selectedBiz }) });
      const d = await r.json();
      if (d.success) toast({ title: 'Digest sent', description: `${d.threadCount} threads sent via email.` });
      else toast({ title: 'Digest issue', description: d.error || d.message, variant: 'destructive' });
      fetchDigests();
    } catch { toast({ title: 'Failed to send digest', variant: 'destructive' }); }
    setSendingDigest(false);
  };

  const handleSeed = async () => {
    try {
      await fetch('/api/seed', { method: 'POST' });
      toast({ title: 'Database seeded', description: 'Demo data added.' });
      fetchAll();
    } catch { /* empty */ }
  };

  const handleTestReddit = async () => {
    try {
      const r = await fetch('/api/test-reddit', { method: 'POST' });
      const d = await r.json();
      toast({ title: d.success ? 'Reddit connected!' : 'Reddit connection failed', description: d.error || 'API credentials are working.', variant: d.success ? 'default' : 'destructive' });
    } catch { toast({ title: 'Reddit test failed', variant: 'destructive' }); }
  };

  const handleTestEmail = async (email: string) => {
    try {
      const r = await fetch('/api/test-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const d = await r.json();
      toast({ title: d.success ? 'Email test passed!' : 'Email test failed', description: d.error || `Test email sent to ${email}.`, variant: d.success ? 'default' : 'destructive' });
    } catch { toast({ title: 'Email test failed', variant: 'destructive' }); }
  };

  const openEditBiz = (biz: BusinessProfile) => {
    setEditingBiz(biz);
    setBizForm({
      ...biz,
      subreddits: parseJSON(biz.subreddits).join('\n'),
      keywords: parseJSON(biz.keywords).join('\n'),
      competitors: parseJSON(biz.competitors).join('\n'),
    });
    setBizDialogOpen(true);
  };

  /* ─── RENDER ─── */
  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Community Reply Assistant</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Helping experts give helpful answers on Reddit</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTestReddit}>
              <Zap className="w-3.5 h-3.5 mr-1" /> Test Reddit
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchAll()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full flex overflow-x-auto">
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4" /> <span className="hidden sm:inline">Dashboard</span></TabsTrigger>
            <TabsTrigger value="businesses" className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> <span className="hidden sm:inline">Businesses</span></TabsTrigger>
            <TabsTrigger value="opportunities" className="flex items-center gap-1.5"><Target className="w-4 h-4" /> <span className="hidden sm:inline">Opportunities</span></TabsTrigger>
            <TabsTrigger value="scan" className="flex items-center gap-1.5"><Search className="w-4 h-4" /> <span className="hidden sm:inline">Scan</span></TabsTrigger>
            <TabsTrigger value="digest" className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> <span className="hidden sm:inline">Digest</span></TabsTrigger>
            <TabsTrigger value="setup" className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> <span className="hidden sm:inline">Setup</span></TabsTrigger>
          </TabsList>

          {/* ═══ DASHBOARD ═══ */}
          <TabsContent value="dashboard">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
              </div>
            ) : businesses.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h2 className="text-xl font-semibold mb-2">No businesses configured yet</h2>
                  <p className="text-gray-500 mb-6">Add your businesses to start monitoring Reddit for opportunities.</p>
                  <Button onClick={handleSeed}>Seed Demo Data</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total Threads', value: stats?.totalThreads || 0, icon: <TrendingUp className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50' },
                    { label: 'High Intent', value: stats?.highIntent || 0, icon: <Target className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Pending Replies', value: stats?.pendingReplies || 0, icon: <MessageSquare className="w-5 h-5" />, color: 'text-orange-600 bg-orange-50' },
                    { label: 'Completed Scans', value: stats?.completedScans || 0, icon: <BarChart3 className="w-5 h-5" />, color: 'text-violet-600 bg-violet-50' },
                  ].map((s, i) => (
                    <Card key={i}>
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className={`p-2.5 rounded-lg ${s.color}`}>{s.icon}</div>
                        <div>
                          <p className="text-2xl font-bold">{s.value}</p>
                          <p className="text-xs text-gray-500">{s.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recent Opportunities</CardTitle>
                    <CardDescription>Top scored threads across all businesses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-96">
                      <div className="space-y-3">
                        {(stats?.recentThreads || []).map((t: RedditThread) => (
                          <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                            <Badge className={`${scoreColor(t.totalScore)} shrink-0 mt-0.5`}>{t.totalScore}</Badge>
                            <div className="flex-1 min-w-0">
                              <a href={t.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:text-amber-600 line-clamp-1">{t.title}</a>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <span>r/{t.subreddit}</span>
                                <span>&bull;</span>
                                <span>Intent: {t.buyingIntentScore}%</span>
                                {parseJSON(t.matchedCompetitors).length > 0 && (
                                  <Badge variant="outline" className="text-yellow-700 border-yellow-300 text-[10px] py-0">
                                    <AlertCircle className="w-3 h-3 mr-0.5" /> Competitor
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 shrink-0">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                        {(!stats?.recentThreads || stats.recentThreads.length === 0) && (
                          <p className="text-sm text-gray-400 text-center py-8">No threads yet. Run a scan to find opportunities.</p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ═══ BUSINESSES ═══ */}
          <TabsContent value="businesses">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Business Profiles</h2>
              <Dialog open={bizDialogOpen} onOpenChange={(open) => { setBizDialogOpen(open); if (!open) { setEditingBiz(null); setBizForm(emptyBusiness); } }}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-1" /> Add Business</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingBiz ? 'Edit' : 'Add'} Business</DialogTitle>
                    <DialogDescription>Configure your business profile for Reddit monitoring.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>Business Name</Label><Input value={bizForm.name} onChange={e => setBizForm({ ...bizForm, name: e.target.value })} placeholder="Impact Quadrant" /></div>
                      <div><Label>Website</Label><Input value={bizForm.website} onChange={e => setBizForm({ ...bizForm, website: e.target.value })} placeholder="https://..." /></div>
                      <div><Label>Email (for digests)</Label><Input value={bizForm.email} onChange={e => setBizForm({ ...bizForm, email: e.target.value })} placeholder="sam@..." /></div>
                      <div><Label>Reply Tone</Label><Input value={bizForm.replyTone} onChange={e => setBizForm({ ...bizForm, replyTone: e.target.value })} placeholder="helpful, not salesy" /></div>
                    </div>
                    <div><Label>Description</Label><Textarea value={bizForm.description} onChange={e => setBizForm({ ...bizForm, description: e.target.value })} placeholder="What your business does..." rows={2} /></div>
                    <div><Label>Buyer Persona</Label><Textarea value={bizForm.buyerPersona} onChange={e => setBizForm({ ...bizForm, buyerPersona: e.target.value })} placeholder="Who is your ideal buyer?" rows={2} /></div>
                    <div><Label>Pain Points</Label><Textarea value={bizForm.painPoints} onChange={e => setBizForm({ ...bizForm, painPoints: e.target.value })} placeholder="Key pain points your buyers face..." rows={2} /></div>
                    <div><Label>Value Proposition</Label><Textarea value={bizForm.valueProposition} onChange={e => setBizForm({ ...bizForm, valueProposition: e.target.value })} placeholder="Your unique value..." rows={2} /></div>
                    <Separator />
                    <div><Label>Subreddits (one per line)</Label><Textarea value={bizForm.subreddits} onChange={e => setBizForm({ ...bizForm, subreddits: e.target.value })} placeholder={"smallbusiness\nstartups\nEntrepreneur"} rows={3} /></div>
                    <div><Label>Keywords (one per line)</Label><Textarea value={bizForm.keywords} onChange={e => setBizForm({ ...bizForm, keywords: e.target.value })} placeholder={"fractional cfo\ncash flow\nstartup finance"} rows={4} /></div>
                    <div><Label>Competitors (one per line)</Label><Textarea value={bizForm.competitors} onChange={e => setBizForm({ ...bizForm, competitors: e.target.value })} placeholder={"Pilot\nBench\nMercury"} rows={3} /></div>
                    <Separator />
                    <p className="text-sm font-medium">Scoring Weights</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div><Label className="text-xs">Comments</Label><Input type="number" value={bizForm.scoreWeightComments} onChange={e => setBizForm({ ...bizForm, scoreWeightComments: +e.target.value })} /></div>
                      <div><Label className="text-xs">Upvotes</Label><Input type="number" value={bizForm.scoreWeightUpvotes} onChange={e => setBizForm({ ...bizForm, scoreWeightUpvotes: +e.target.value })} /></div>
                      <div><Label className="text-xs">Recency</Label><Input type="number" value={bizForm.scoreWeightRecency} onChange={e => setBizForm({ ...bizForm, scoreWeightRecency: +e.target.value })} /></div>
                      <div><Label className="text-xs">Keywords</Label><Input type="number" value={bizForm.scoreWeightKeywords} onChange={e => setBizForm({ ...bizForm, scoreWeightKeywords: +e.target.value })} /></div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBizDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveBiz} disabled={savingBiz || !bizForm.name}>{savingBiz ? 'Saving...' : 'Save'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {businesses.map(biz => (
                <Card key={biz.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{biz.name}</CardTitle>
                        <CardDescription className="mt-1">{biz.email}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditBiz(biz)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteBiz(biz.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-gray-600 line-clamp-2">{biz.description}</p>
                    <Separator />
                    <div className="flex items-center gap-4 text-gray-500 text-xs">
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {biz._count?.threads || 0} threads</span>
                      <span className="flex items-center gap-1"><Search className="w-3 h-3" /> {biz._count?.scanRuns || 0} scans</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {parseJSON(biz.subreddits).slice(0, 4).map(s => (
                        <Badge key={s} variant="secondary" className="text-[10px]">r/{s}</Badge>
                      ))}
                      {parseJSON(biz.subreddits).length > 4 && <Badge variant="secondary" className="text-[10px]">+{parseJSON(biz.subreddits).length - 4}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ═══ OPPORTUNITIES ═══ */}
          <TabsContent value="opportunities">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              <Select value={selectedBiz} onValueChange={setSelectedBiz}>
                <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Select business" /></SelectTrigger>
                <SelectContent>
                  {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchThreads} className="sm:ml-auto"><RefreshCw className="w-3.5 h-3.5" /></Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[70vh]">
                  {threads.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <Target className="w-10 h-10 mx-auto mb-3" />
                      <p>No threads found. Run a scan to discover opportunities.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {threads.map(t => {
                        const mKeys = parseJSON(t.matchedKeywords);
                        const mComps = parseJSON(t.matchedCompetitors);
                        const signals = parseJSON(t.intentSignals);
                        const isExpanded = expandedThread === t.id;
                        return (
                          <div key={t.id} className="p-4">
                            <div className="flex items-start gap-3">
                              <Badge className={`${scoreColor(t.totalScore)} shrink-0 mt-0.5 text-xs`}>{t.totalScore}</Badge>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:text-amber-600 line-clamp-2">{t.title}</a>
                                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 shrink-0"><ExternalLink className="w-3.5 h-3.5" /></a>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
                                  <span>r/{t.subreddit}</span>
                                  <span>&bull;</span>
                                  <span>Eng: {t.engagementScore}</span>
                                  <span>&bull;</span>
                                  <span className={t.buyingIntentScore >= 60 ? 'text-emerald-600 font-medium' : ''}>Intent: {t.buyingIntentScore}%</span>
                                  <Badge className={statusColor(t.replyStatus)}>{t.replyStatus}</Badge>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {mComps.map(c => <Badge key={c} variant="outline" className="text-yellow-700 border-yellow-300 text-[10px] py-0"><AlertCircle className="w-2.5 h-2.5 mr-0.5" />{c}</Badge>)}
                                  {mKeys.slice(0, 3).map(k => <Badge key={k} variant="secondary" className="text-[10px] py-0">{k}</Badge>)}
                                  {mKeys.length > 3 && <Badge variant="secondary" className="text-[10px] py-0">+{mKeys.length - 3}</Badge>}
                                </div>
                                {t.draftReply && (
                                  <div>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs p-0 px-2 mb-1" onClick={() => setExpandedThread(isExpanded ? null : t.id)}>
                                      <Eye className="w-3 h-3 mr-1" /> {isExpanded ? 'Hide' : 'View'} Reply
                                    </Button>
                                    {isExpanded && (
                                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm whitespace-pre-wrap">{t.draftReply}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                {!t.draftReply && (
                                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={draftingId === t.id} onClick={() => handleDraftReply(t.id)}>
                                    {draftingId === t.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3 mr-1" />} Draft
                                  </Button>
                                )}
                                {t.replyStatus === 'pending' && t.draftReply && (
                                  <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-700 border-emerald-300" onClick={() => handleUpdateThread(t.id, { replyStatus: 'approved' })}>
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                                  </Button>
                                )}
                                {t.replyStatus === 'pending' && (
                                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleUpdateThread(t.id, { replyStatus: 'skipped' })}>Skip</Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ SCAN ═══ */}
          <TabsContent value="scan">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              <Select value={selectedBiz} onValueChange={setSelectedBiz}>
                <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Select business" /></SelectTrigger>
                <SelectContent>
                  {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleScan} disabled={scanning || !selectedBiz}>
                {scanning ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Scanning...</> : <><Search className="w-4 h-4 mr-2" /> Run Scan Now</>}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4" /> Reddit API</CardTitle></CardHeader>
                <CardContent><Alert className={undefined}><CheckCircle2 className="w-4 h-4 text-emerald-500" /><AlertDescription>Reads from .env (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD)</AlertDescription></Alert></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Mail className="w-4 h-4" /> Email (SMTP)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">sam@impactquadrant.info</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleTestEmail('sam@impactquadrant.info')}>Test</Button>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">sam@cubiczan.com</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleTestEmail('sam@cubiczan.com')}>Test</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Scan History</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96">
                  {scanRuns.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No scan runs yet.</p>
                  ) : (
                    <div className="divide-y">
                      {scanRuns.map(sr => (
                        <div key={sr.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <Badge className={sr.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : sr.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}>{sr.status}</Badge>
                            <div>
                              <p className="text-sm font-medium">{sr.threadsFound} found &bull; {sr.threadsScored} scored</p>
                              <p className="text-xs text-gray-500">{new Date(sr.startedAt).toLocaleString()}</p>
                            </div>
                          </div>
                          {sr.errorMessage && <span className="text-xs text-red-500 max-w-[200px] truncate">{sr.errorMessage}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ DIGEST ═══ */}
          <TabsContent value="digest">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              <Select value={selectedBiz} onValueChange={setSelectedBiz}>
                <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Select business" /></SelectTrigger>
                <SelectContent>
                  {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleSendDigest} disabled={sendingDigest || !selectedBiz}>
                {sendingDigest ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Send Digest Email</>}
              </Button>
            </div>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Digest History</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96">
                  {digests.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No digests sent yet.</p>
                  ) : (
                    <div className="divide-y">
                      {digests.map(d => (
                        <div key={d.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <Badge className={d.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>{d.status}</Badge>
                            <div>
                              <p className="text-sm font-medium">{d.threadCount} threads</p>
                              <p className="text-xs text-gray-500">{new Date(d.sentAt).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ SETUP GUIDE ═══ */}
          <TabsContent value="setup">
            <div className="max-w-3xl space-y-6">
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>All credentials are stored in <code className="bg-gray-100 px-1 rounded">.env</code> and are never pushed to GitHub.</AlertDescription>
              </Alert>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Step 1: Create a Reddit App</CardTitle><CardDescription>Get your Reddit API credentials</CardDescription></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Go to <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-amber-600 underline">https://www.reddit.com/prefs/apps</a> and log in</li>
                    <li>Scroll to the bottom and click <strong>&ldquo;create another app&rdquo;</strong></li>
                    <li>Select <strong>&ldquo;script&rdquo;</strong> as the app type</li>
                    <li>Fill in a name (e.g. &ldquo;Community Reply Assistant&rdquo;) and description</li>
                    <li>Set <strong>redirect URI</strong> to <code className="bg-gray-100 px-1 rounded">http://localhost</code></li>
                    <li>Click <strong>&ldquo;create app&rdquo;</strong></li>
                    <li>Copy the <strong>client_id</strong> (shown under the app name) and <strong>client_secret</strong></li>
                  </ol>
                  <Separator />
                  <p className="font-medium">Add to your <code className="bg-gray-100 px-1 rounded">.env</code>:</p>
                  <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto">{`REDDIT_CLIENT_ID=your_client_id_here\nREDDIT_CLIENT_SECRET=your_client_secret_here\nREDDIT_USERNAME=your_reddit_username\nREDDIT_PASSWORD=your_reddit_password`}</pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Step 2: Set Up Email (App Passwords)</CardTitle><CardDescription>Already configured for both business emails</CardDescription></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> sam@impactquadrant.info &mdash; Configured</p>
                  <p className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> sam@cubiczan.com &mdash; Configured</p>
                  <Separator />
                  <p className="text-gray-600">Both emails use Gmail App Passwords stored in <code className="bg-gray-100 px-1 rounded">.env</code>. To generate new app passwords:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to Google Account &rarr; Security &rarr; 2-Step Verification</li>
                    <li>Scroll to &ldquo;App passwords&rdquo; and create one for &ldquo;Mail&rdquo;</li>
                    <li>Copy the 16-character password and update <code className="bg-gray-100 px-1 rounded">.env</code></li>
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Security Best Practices</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-600">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Never commit <code>.env</code> to GitHub (already blocked in <code>.gitignore</code>)</li>
                    <li>Use App Passwords, never real account passwords</li>
                    <li>Rotate your Reddit and email credentials regularly</li>
                    <li>Reddit rate limits: 60 requests/minute. The system auto-pauses between requests.</li>
                    <li>Test connections using the &ldquo;Test Reddit&rdquo; and &ldquo;Test&rdquo; buttons on the Scan tab.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* FOOTER */}
      <footer className="border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-gray-400">
          Community Reply Assistant &bull; Free & Open Source
        </div>
      </footer>
    </div>
  );
}
