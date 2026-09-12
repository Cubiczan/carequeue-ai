import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const slackSchema = z.object({
  queue: z.enum(["finance", "operations"]),
  webhook_url: z.string().url().nullable(),
  enabled: z.boolean(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = slackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, email, role")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("slack_settings")
    .update({
      webhook_url: parsed.data.webhook_url,
      enabled: parsed.data.enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("queue", parsed.data.queue);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("activity_history").insert({
    user_id: profile.id,
    user_display_name: profile.display_name,
    user_email: profile.email,
    user_role: profile.role,
    activity_type: "Slack Settings Updated",
    description: `Updated ${parsed.data.queue} Slack channel — ${parsed.data.enabled ? "enabled" : "disabled"}, webhook ${parsed.data.webhook_url ? "set" : "cleared"}`,
    contextual_reference: parsed.data.queue,
  });

  return NextResponse.json({ ok: true });
}
