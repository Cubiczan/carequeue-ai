"use client";

import { useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface NotificationPrefs {
  approvals: boolean;
  agent_updates: boolean;
  activity: boolean;
}

interface ProfileViewProps {
  displayName: string;
  email: string;
  role: string;
  notificationPrefs: NotificationPrefs;
}

export function ProfileView({ displayName, email, role, notificationPrefs }: ProfileViewProps) {
  return (
    <div className="space-y-6">
      <AccountSection displayName={displayName} email={email} role={role} />
      <PasswordSection />
      <NotificationPrefsSection initialPrefs={notificationPrefs} />
    </div>
  );
}

function AccountSection({ displayName, email, role }: { displayName: string; email: string; role: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Display name" value={displayName} />
        <Field label="Email" value={email} />
        <Field label="Role" value={role} mono />
      </CardContent>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={cn("text-sm text-slate-900 mt-1 capitalize", mono && "font-mono")}>{value}</div>
    </div>
  );
}

function PasswordSection() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("idle");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setStatus("error");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      setStatus("error");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setStatus("error");
        return;
      }

      // Record activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, email, role")
          .eq("id", user.id)
          .single();
        if (profile) {
          await supabase.from("activity_history").insert({
            user_id: user.id,
            user_display_name: profile.display_name,
            user_email: profile.email,
            user_role: profile.role,
            activity_type: "Password Changed",
            description: "User changed their account password",
          });
        }
      }

      setStatus("ok");
      setPassword("");
      setConfirm("");
      setTimeout(() => setStatus("idle"), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">New password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Confirm new password</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1"
              autoComplete="new-password"
            />
          </div>
          {error && status === "error" && (
            <div className="text-xs text-rose-700 bg-rose-50 rounded-md px-3 py-2 border border-rose-200">
              {error}
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving || !password || !confirm}>
              {saving ? "Saving…" : "Change password"}
            </Button>
            {status === "ok" && (
              <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Password updated
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function NotificationPrefsSection({ initialPrefs }: { initialPrefs: NotificationPrefs }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function savePrefs(next: NotificationPrefs) {
    setPrefs(next);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/notification-prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof NotificationPrefs) {
    savePrefs({ ...prefs, [key]: !prefs[key] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Notification preferences
          {saved && (
            <span className="text-xs font-normal text-emerald-700 inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          {saving && <span className="text-xs font-normal text-slate-500">Saving…</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PrefRow
          title="Approval requests"
          description="In-app notification when an agent queues a new item for your approval"
          checked={prefs.approvals}
          onChange={() => toggle("approvals")}
        />
        <PrefRow
          title="Agent status updates"
          description="Notify when agents are paused, resumed, or change operating mode"
          checked={prefs.agent_updates}
          onChange={() => toggle("agent_updates")}
        />
        <PrefRow
          title="Activity summaries"
          description="Daily digest of activity across your workspace"
          checked={prefs.activity}
          onChange={() => toggle("activity")}
        />
      </CardContent>
    </Card>
  );
}

function PrefRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900">{title}</div>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
