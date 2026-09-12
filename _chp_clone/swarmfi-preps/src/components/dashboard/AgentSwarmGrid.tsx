'use client';

import { useSwarmStore, type SignalDirection, type AgentData } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, ArrowLeftRight, Fish, BarChart3,
  Percent, MessageCircle, LineChart, Activity, Link,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';

const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp,
  ArrowLeftRight,
  Fish,
  BarChart3,
  Percent,
  MessageCircle,
  LineChart,
  Activity,
  Link,
};

const signalStyles: Record<SignalDirection, { border: string; bg: string; text: string; badge: string }> = {
  LONG: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  SHORT: {
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5',
    text: 'text-rose-400',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
  NEUTRAL: {
    border: 'border-border/30',
    bg: 'bg-muted/30',
    text: 'text-muted-foreground',
    badge: 'bg-muted text-muted-foreground border-border/30',
  },
};

function AgentCard({ agent, index }: { agent: AgentData; index: number }) {
  const style = signalStyles[agent.lastVote];
  const Icon = ICON_MAP[agent.icon] ?? Activity;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        'rounded-lg border p-3 transition-all duration-300 hover:scale-[1.02]',
        style.border,
        style.bg
      )}
    >
      {/* Agent Name + Icon */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('p-1 rounded-md', style.bg)}>
            <Icon className={cn('w-3.5 h-3.5', style.text)} />
          </div>
          <span className="text-xs font-semibold truncate max-w-[100px]">{agent.displayName}</span>
        </div>
        <Badge variant="outline" className={cn('text-[10px] font-mono px-1.5 py-0', style.badge)}>
          {agent.lastVote}
        </Badge>
      </div>

      {/* Confidence Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Confidence</span>
          <span className={cn('text-[10px] font-mono font-bold', style.text)}>{agent.confidence}%</span>
        </div>
        <Progress
          value={agent.confidence}
          className={cn('h-1', agent.lastVote === 'LONG' && '[&>div]:bg-emerald-500', agent.lastVote === 'SHORT' && '[&>div]:bg-rose-500', agent.lastVote === 'NEUTRAL' && '[&>div]:bg-muted-foreground')}
        />
      </div>

      {/* Reasoning Snippet */}
      <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2 leading-tight">
        {agent.reasoning}
      </p>
    </motion.div>
  );
}

export function AgentSwarmGrid() {
  const agents = useSwarmStore((s) => s.agents);
  const isLoading = useSwarmStore((s) => s.isLoading);

  // Compute stigmergy connections (agents that agree)
  const longAgents = agents.filter((a) => a.lastVote === 'LONG');
  const shortAgents = agents.filter((a) => a.lastVote === 'SHORT');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          🐝 Agent Swarm Network
        </h3>
        <div className="flex gap-2">
          {longAgents.length > 0 && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono">
              {longAgents.length} LONG
            </Badge>
          )}
          {shortAgents.length > 0 && (
            <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-mono">
              {shortAgents.length} SHORT
            </Badge>
          )}
        </div>
      </div>

      {isLoading && agents.length === 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {agents.map((agent, i) => (
            <AgentCard key={agent.agentType} agent={agent} index={i} />
          ))}
        </div>
      )}

      {/* Stigmergy indicator */}
      {agents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>
            Stigmergy: {Math.max(longAgents.length, shortAgents.length)}/{agents.length} agents aligned
          </span>
        </div>
      )}
    </motion.div>
  );
}
