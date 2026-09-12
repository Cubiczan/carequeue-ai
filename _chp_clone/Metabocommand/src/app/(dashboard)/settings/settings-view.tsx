"use client";

import { useState } from "react";
import { Check, CheckCircle2, Circle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import type { Agent, ApprovalQueueName } from "@/lib/supabase/types";

interface SlackSetting {
  queue: ApprovalQueueName;
  webhook_url: string | null;
  enabled: boolean;
  updated_at: string;
}

interface DataSource {
  id: string;
  name: string;
  status: "connected" | "dummy" | "coming_soon";
  lastSync: string | null;
}

const dataSources: DataSource[] = [
  { id: "shopify",     name: "Shopify",     status: "dummy",       lastSync: "2026-04-19 00:00" },
  { id: "quickbooks",  name: "QuickBooks",  status: "dummy",       lastSync: "2026-04-19 00:00" },
  { id: "magento",     name: "Magento",     status: "coming_soon", lastSync: null },
  { id: "bigcommerce", name: "BigCommerce", status: "coming_soon", lastSync: null },
  { id: "amazon",      name: "Amazon",      status: "coming_soon", lastSync: null },
];

interface SettingsViewProps {
  agents: Agent[];
  slackSettings: SlackSetting[];
}

export function SettingsView({ agents, slackSettings }: SettingsViewProps) {
  return (
    <div className="space-y-8">
      <DataSourcesSection />
      <AgentThresholdsSection agents={agents} />
      <SlackSection slackSettings={slackSettings} />
    </div>
  );
}

function DataSourcesSection() {
  return (
    <section>
      <h2 className="text-base font-semibold text-slate-900 mb-3">Data Source Configuration</h2>
      <p className="text-sm text-slate-500 mb-4">
        Integrations feed agent dashboards with live data. MVP uses dummy data by default; live integrations will sync daily.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dataSources.map((ds) => (
          <Card key={ds.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{ds.name}</div>
                  <div className="mt-1">
                    <StatusBadge status={ds.status} />
                  </div>
                </div>
              </div>
              {ds.lastSync && (
                <div className="mt-3 text-xs text-slate-500">
                  Last sync: <span className="font-mono">{ds.lastSync}</span>
                </div>
              )}
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={ds.status === "coming_soon"}
                >
                  {ds.status === "coming_soon" ? "Not yet available" : "Configure"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: DataSource["status"] }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Connected
      </span>
    );
  }
  if (status === "dummy") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        <Circle className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
        Using dummy data
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
      Coming soon
    </span>
  );
}

function AgentThresholdsSection({ agents }: { agents: Agent[] }) {
  const [edits, setEdits] = useState<Record<string, { autonomous_limit: string; approval_required_above: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  function getValue(agent: Agent, field: "autonomous_limit" | "approval_required_above"): string {
    const edit = edits[agent.id];
    if (edit) return edit[field];
    const val = agent[field];
    return val === null ? "" : String(val);
  }

  function updateField(agentId: string, field: "autonomous_limit" | "approval_required_above", value: string) {
    setEdits((prev) => {
      const current = prev[agentId] ?? {
        autonomous_limit: agents.find((a) => a.id === agentId)?.autonomous_limit?.toString() ?? "",
        approval_required_above: agents.find((a) => a.id === agentId)?.approval_required_above?.toString() ?? "",
      };
      return { ...prev, [agentId]: { ...current, [field]: value } };
    });
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(agentId);
      return next;
    });
  }

  async function saveAgent(agent: Agent) {
    const edit = edits[agent.id];
    if (!edit) return;
    setSavingId(agent.id);
    setErrors((e) => ({ ...e, [agent.id]: "" }));
    try {
      const res = await fetch("/api/agent-threshold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agent.id,
          autonomous_limit: edit.autonomous_limit === "" ? null : Number(edit.autonomous_limit),
          approval_required_above: edit.approval_required_above === "" ? null : Number(edit.approval_required_above),
        }),
      });
      if (res.ok) {
        setSavedIds((prev) => new Set(prev).add(agent.id));
        setTimeout(() => {
          setSavedIds((prev) => {
            const next = new Set(prev);
            next.delete(agent.id);
            return next;
          });
        }, 2500);
      } else {
        const body = await res.json().catch(() => ({}));
        setErrors((e) => ({ ...e, [agent.id]: body.error ?? "Save failed" }));
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-slate-900 mb-3">Agent Threshold Configuration</h2>
      <p className="text-sm text-slate-500 mb-4">
        Set autonomous execution limits per agent. Actions at or below the autonomous limit run automatically; anything above routes through the Approval Queue.
      </p>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Agent</th>
                <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Queue</th>
                <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Autonomous Limit ($)</th>
                <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Approval Above ($)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const hasEdit = !!edits[agent.id];
                const saved = savedIds.has(agent.id);
                const saving = savingId === agent.id;
                return (
                  <tr key={agent.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{agent.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={agent.queue === "finance" ? "reviewing" : "approved"}>{agent.queue}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        className="h-8 w-28 text-right ml-auto font-mono"
                        value={getValue(agent, "autonomous_limit")}
                        onChange={(e) => updateField(agent.id, "autonomous_limit", e.target.value)}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        className="h-8 w-28 text-right ml-auto font-mono"
                        value={getValue(agent, "approval_required_above")}
                        onChange={(e) => updateField(agent.id, "approval_required_above", e.target.value)}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {errors[agent.id] && (
                        <span className="text-xs text-rose-700 mr-2">{errors[agent.id]}</span>
                      )}
                      {saved && (
                        <span className="text-xs text-emerald-700 inline-flex items-center gap-1 mr-2">
                          <Check className="h-3.5 w-3.5" /> Saved
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!hasEdit || saving}
                        onClick={() => saveAgent(agent)}
                      >
                        {saving ? "Saving…" : "Save"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="text-xs text-slate-500 mt-2">
        Example: Sniper Agent cancels subscriptions up to $500/mo autonomously; anything above requires CFO approval.
      </p>
    </section>
  );
}

function SlackSection({ slackSettings }: { slackSettings: SlackSetting[] }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-slate-900 mb-3">Slack Integration</h2>
      <p className="text-sm text-slate-500 mb-4">
        Incoming webhook URLs for approval notifications. Outbound only in MVP — decisions happen in-app.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {slackSettings.map((s) => (
          <SlackChannelCard key={s.queue} setting={s} />
        ))}
      </div>
    </section>
  );
}

function SlackChannelCard({ setting }: { setting: SlackSetting }) {
  const [webhook, setWebhook] = useState(setting.webhook_url ?? "");
  const [enabled, setEnabled] = useState(setting.enabled);
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/slack-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queue: setting.queue,
          webhook_url: webhook || null,
          enabled,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTestStatus("sending");
    try {
      const res = await fetch("/api/slack-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue: setting.queue, webhook_url: webhook }),
      });
      setTestStatus(res.ok ? "ok" : "error");
      setTimeout(() => setTestStatus("idle"), 3500);
    } catch {
      setTestStatus("error");
      setTimeout(() => setTestStatus("idle"), 3500);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm capitalize flex items-center justify-between">
          {setting.queue} channel
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium", enabled ? "text-emerald-700" : "text-slate-500")}>
              {enabled ? "Enabled" : "Disabled"}
            </span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Webhook URL</label>
          <Input
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            value={webhook}
            onChange={(e) => setWebhook(e.target.value)}
            className="mt-1 font-mono text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : saved ? (
              <><Check className="h-3.5 w-3.5" /> Saved</>
            ) : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={testConnection}
            disabled={!webhook || testStatus === "sending"}
          >
            {testStatus === "sending" ? "Sending…" : "Test Connection"}
          </Button>
          {testStatus === "ok" && (
            <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Test message sent
            </span>
          )}
          {testStatus === "error" && (
            <span className="text-xs text-rose-700 inline-flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" /> Delivery failed
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
