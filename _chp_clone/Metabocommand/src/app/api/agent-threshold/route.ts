import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const thresholdSchema = z.object({
  agent_id: z.string().uuid(),
  autonomous_limit: z.number().nullable(),
  approval_required_above: z.number().nullable(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = thresholdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, email, role")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("name, queue, autonomous_limit, approval_required_above")
    .eq("id", parsed.data.agent_id)
    .single();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Only allow editing agents in the user's own queue (matches RLS)
  if (agent.queue !== profile.role) {
    return NextResponse.json({ error: "Role/queue mismatch" }, { status: 403 });
  }

  const { error: updateError } = await supabase
    .from("agents")
    .update({
      autonomous_limit: parsed.data.autonomous_limit,
      approval_required_above: parsed.data.approval_required_above,
    })
    .eq("id", parsed.data.agent_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const prevLimit = agent.autonomous_limit;
  const nextLimit = parsed.data.autonomous_limit;

  await supabase.from("activity_history").insert({
    user_id: profile.id,
    user_display_name: profile.display_name,
    user_email: profile.email,
    user_role: profile.role,
    activity_type: "Threshold Updated",
    description: `Updated ${agent.name} autonomous limit from ${prevLimit === null ? "—" : `$${prevLimit}`} to ${nextLimit === null ? "—" : `$${nextLimit}`}`,
    contextual_reference: agent.name,
  });

  return NextResponse.json({ ok: true });
}
