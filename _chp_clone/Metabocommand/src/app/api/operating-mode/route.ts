import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const modeSchema = z.object({
  mode: z.enum(["growth", "efficiency"]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = modeSchema.safeParse(body);
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

  // Fetch current mode to include in the log
  const { data: currentSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "operating_mode")
    .single();

  const prevMode = currentSetting?.value ?? "efficiency";
  const nextMode = parsed.data.mode;

  if (prevMode === nextMode) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const { error: updateError } = await supabase
    .from("app_settings")
    .update({
      value: nextMode,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("key", "operating_mode");

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log to agent_action_log (Harmony Agent mode change, visible in both queues)
  await supabase.from("agent_action_log").insert({
    agent_name: "Harmony Agent",
    queue: profile.role,
    action_type: "Mode Change Logged",
    description: `Operating mode switched from ${prevMode === "growth" ? "Growth" : "Efficiency"} to ${nextMode === "growth" ? "Growth" : "Efficiency"}`,
    outcome: "Logged",
    decided_by: `${profile.display_name} (${profile.email})`,
    reasoning_summary: `Mode change confirmed via confirmation modal by ${profile.display_name}`,
  });

  // Record activity history
  await supabase.from("activity_history").insert({
    user_id: profile.id,
    user_display_name: profile.display_name,
    user_email: profile.email,
    user_role: profile.role,
    activity_type: "Operating Mode Changed",
    description: `Changed operating mode from ${prevMode === "growth" ? "Growth" : "Efficiency"} to ${nextMode === "growth" ? "Growth" : "Efficiency"}`,
    contextual_reference: null,
  });

  return NextResponse.json({ ok: true, mode: nextMode });
}
