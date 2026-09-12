-- MetaboCommand seed data
-- Run AFTER 0001_schema.sql in Supabase Dashboard -> SQL Editor
-- Run AFTER creating the two test users (see README)

-- ============================================================
-- AGENTS (Capital Reflex + Operations)
-- ============================================================
insert into public.agents (name, slug, system, queue, is_active, autonomous_limit, approval_required_above) values
  ('Pulse Agent', 'pulse', 'capital_reflex', 'finance', true, null, 0),
  ('Oracle Agent', 'oracle', 'capital_reflex', 'finance', true, null, 0),
  ('Sniper Agent', 'sniper', 'capital_reflex', 'finance', true, 500, 500),
  ('Conductor Agent', 'conductor', 'capital_reflex', 'finance', true, null, 0),
  ('Acquisition Agent', 'acquisition', 'revenue_velocity', 'operations', true, 500, 500),
  ('Conversion Agent', 'conversion', 'revenue_velocity', 'operations', true, null, 0),
  ('Retention Agent', 'retention', 'revenue_velocity', 'operations', true, null, 0),
  ('Demand Prophet Agent', 'demand-prophet', 'inventory_intelligence', 'operations', true, 10000, 10000),
  ('Logistics Conductor Agent', 'logistics-conductor', 'inventory_intelligence', 'operations', true, null, 0),
  ('Support Reflex Agent', 'support-reflex', 'customer_lifetime', 'operations', true, null, 0),
  ('Advocacy Agent', 'advocacy', 'customer_lifetime', 'operations', true, null, 0),
  ('Harmony Agent', 'harmony', 'operational_health', 'operations', true, null, 0)
on conflict (slug) do nothing;

-- ============================================================
-- FINANCE APPROVAL QUEUE SEED (section 4.7.1)
-- ============================================================
insert into public.approval_items (agent_name, queue, action_description, financial_impact, impact_amount, status, submitted_at, decided_at, slack_notified) values
  ('Conductor Agent', 'finance', 'Reallocate $18,500 from Google Ads (low velocity, score 0.42) to TikTok Ads (high velocity, score 1.87)', '+$18,500 reallocation', 18500, 'pending', '2026-04-14 09:15:00+00', null, true),
  ('Oracle Agent', 'finance', 'Approve Scenario B: Pre-purchase $240,000 inventory ahead of Q3 demand spike (probability 74%, break-even 38 days)', '$240,000 capital commitment', 240000, 'pending', '2026-04-14 11:42:00+00', null, true),
  ('Sniper Agent', 'finance', 'Cancel Klaviyo Pro subscription ($1,200/month) — velocity score 0.18, LTV contribution below threshold', '-$1,200/month', -1200, 'pending', '2026-04-13 16:30:00+00', null, true),
  ('Pulse Agent', 'finance', 'Intervene on margin erosion: renegotiate freight contract with Carrier Delta (shipping cost spike +34% over 14 days, velocity impact -0.61)', 'Est. -$9,200/month if unaddressed', -9200, 'pending', '2026-04-13 08:05:00+00', null, true),
  ('Conductor Agent', 'finance', 'Pause capital deployment to Influencer Program Alpha pending LTV recalculation (current velocity score 0.29, below 0.50 threshold)', '$6,000/month hold', 6000, 'approved', '2026-04-12 14:20:00+00', '2026-04-12 14:22:00+00', true),
  ('Sniper Agent', 'finance', 'Renegotiate Salesforce CRM contract ($3,800/month) — projected savings $1,140/month at revised tier', '-$1,140/month projected savings', -1140, 'rejected', '2026-04-11 10:55:00+00', '2026-04-11 11:00:00+00', true);

-- ============================================================
-- OPERATIONS APPROVAL QUEUE SEED (section 4.7.2)
-- ============================================================
insert into public.approval_items (agent_name, queue, action_description, financial_impact, impact_amount, status, submitted_at, decided_at, slack_notified) values
  ('Demand Prophet Agent', 'operations', 'Issue PO to Vendor Apex: 4,200 units SKU-0091 (Wireless Earbuds Pro) — stockout risk in 11 days, estimated cost $58,800', 'Prevents stockout, 11-day lead time', 58800, 'pending', '2026-04-14 10:30:00+00', null, true),
  ('Acquisition Agent', 'operations', 'Reallocate $7,500/month from Facebook Ads (LTV:CAC 1.2) to Google Shopping (LTV:CAC 3.1) — projected CAC reduction 28%', '+$7,500 channel shift', 7500, 'pending', '2026-04-14 08:55:00+00', null, true),
  ('Retention Agent', 'operations', 'Launch win-back campaign for High-Value Lapsed segment (2,340 customers, churn probability 71%) — 20% discount offer, projected reactivation rate 18%', 'Est. $41,200 recovered revenue', 41200, 'pending', '2026-04-13 15:10:00+00', null, true),
  ('Logistics Conductor Agent', 'operations', 'Switch 40% of West Coast shipments from Carrier Bravo to Carrier Echo — projected delivery cost reduction $1.82/order, on-time rate improvement +9%', '-$1.82/order on 40% of volume', null, 'pending', '2026-04-13 12:45:00+00', null, true),
  ('Support Reflex Agent', 'operations', 'Implement automated returns pre-approval for orders under $35 — reduces avg resolution time from 18h to 2h for 44% of return inquiries', 'Affects ~620 tickets/month', null, 'pending', '2026-04-12 17:20:00+00', null, true),
  ('Harmony Agent', 'operations', 'Resolve conflict: pause Acquisition Agent spend increase on Meta Ads pending Sniper Agent waste review of same channel (conflicting actions detected 2026-04-12)', 'Blocks $4,200 spend increase', 4200, 'pending', '2026-04-12 09:00:00+00', null, true),
  ('Demand Prophet Agent', 'operations', 'Issue PO to Vendor Meridian: 1,800 units SKU-0047 (Portable Charger 20K) — seasonal demand uplift forecast +62% in next 21 days, estimated cost $21,600', 'Prevents projected stockout', 21600, 'approved', '2026-04-11 11:30:00+00', '2026-04-11 11:35:00+00', true),
  ('Conversion Agent', 'operations', 'Roll out Variant B of checkout flow redesign to 100% of traffic — A/B test result: +14.3% conversion lift, 95% confidence, 12-day test duration', '+14.3% conversion lift', null, 'approved', '2026-04-10 16:45:00+00', '2026-04-10 16:50:00+00', true);

-- ============================================================
-- FINANCE AGENT ACTION LOG SEED (section 4.7.3)
-- ============================================================
insert into public.agent_action_log (timestamp, agent_name, queue, action_type, description, outcome, decided_by, reasoning_summary) values
  ('2026-04-14 09:15:00+00', 'Conductor Agent', 'finance', 'Reallocation Proposal', 'Proposed $18,500 reallocation from Google Ads to TikTok Ads', 'Pending Approval', '—', 'Velocity score differential 1.45; TikTok cohort LTV 2.3× Google cohort over 60-day window'),
  ('2026-04-14 11:42:00+00', 'Oracle Agent', 'finance', 'Scenario Submission', 'Submitted Scenario B for approval: $240,000 pre-purchase inventory commitment', 'Pending Approval', '—', '74% probability weighted; break-even modeled at 38 days under base demand assumptions'),
  ('2026-04-13 16:30:00+00', 'Sniper Agent', 'finance', 'Subscription Cancellation Proposal', 'Flagged Klaviyo Pro ($1,200/month) for cancellation — velocity score 0.18', 'Pending Approval', '—', 'LTV contribution $0.09 per $1 deployed over trailing 90 days; below 0.30 minimum threshold'),
  ('2026-04-13 08:05:00+00', 'Pulse Agent', 'finance', 'Anomaly Escalation', 'Escalated freight cost anomaly: Carrier Delta +34% over 14 days', 'Pending Approval', '—', 'Correlated with margin erosion on SKU-0091 and SKU-0047; velocity impact score -0.61'),
  ('2026-04-12 14:20:00+00', 'Conductor Agent', 'finance', 'Capital Hold', 'Paused capital deployment to Influencer Program Alpha', 'Approved', 'CFO (sarah.chen@metabo.io)', 'Velocity score 0.29 below 0.50 floor; LTV recalculation pending new cohort data'),
  ('2026-04-11 10:55:00+00', 'Sniper Agent', 'finance', 'Contract Renegotiation Proposal', 'Proposed Salesforce CRM renegotiation ($3,800/month → $2,660/month)', 'Rejected', 'CFO (sarah.chen@metabo.io)', 'CRM consolidation project in progress; renegotiation deferred to Q3 contract renewal window'),
  ('2026-04-10 07:30:00+00', 'Sniper Agent', 'finance', 'Auto-Execute', 'Cancelled Zapier Starter plan ($49/month) — velocity score 0.11, no active workflow dependencies detected', 'Auto-Executed', 'Autonomous', 'Monthly cost below $500 autonomous threshold; zero LTV contribution over trailing 60 days'),
  ('2026-04-09 14:15:00+00', 'Sniper Agent', 'finance', 'Auto-Execute', 'Cancelled redundant Loom Business seat ($12.50/month) — duplicate seat, zero usage in 45 days', 'Auto-Executed', 'Autonomous', 'Monthly cost below $500 autonomous threshold; usage data confirmed zero sessions'),
  ('2026-04-08 11:00:00+00', 'Pulse Agent', 'finance', 'Anomaly Resolved', 'Margin erosion on Vendor Bravo resolved after renegotiation confirmed', 'Resolved', 'CFO (sarah.chen@metabo.io)', 'Vendor confirmed revised pricing effective 2026-04-08; margin restored to 38% baseline'),
  ('2026-04-07 09:45:00+00', 'Oracle Agent', 'finance', 'Scenario Closed', 'Scenario A (conservative Q2 hold) closed — probability dropped below 15% threshold', 'Auto-Closed', 'Autonomous', 'Demand signals updated; scenario probability fell from 41% to 12% over 7-day window');

-- ============================================================
-- OPERATIONS AGENT ACTION LOG SEED (section 4.7.3)
-- ============================================================
insert into public.agent_action_log (timestamp, agent_name, queue, action_type, description, outcome, decided_by, reasoning_summary) values
  ('2026-04-14 10:30:00+00', 'Demand Prophet Agent', 'operations', 'Purchase Order Proposal', 'Proposed PO: 4,200 units SKU-0091 from Vendor Apex ($58,800)', 'Pending Approval', '—', 'Stockout risk in 11 days at current sell-through rate; reorder point breached 3 days ago'),
  ('2026-04-14 08:55:00+00', 'Acquisition Agent', 'operations', 'Spend Reallocation Proposal', 'Proposed $7,500/month shift from Facebook Ads to Google Shopping', 'Pending Approval', '—', 'LTV:CAC ratio 3.1 vs 1.2; 28% projected CAC reduction based on 60-day cohort comparison'),
  ('2026-04-13 15:10:00+00', 'Retention Agent', 'operations', 'Campaign Proposal', 'Win-back campaign for High-Value Lapsed segment (2,340 customers)', 'Pending Approval', '—', 'Churn probability 71%; 20% discount offer modeled at 18% reactivation, $41,200 recovered revenue'),
  ('2026-04-13 12:45:00+00', 'Logistics Conductor Agent', 'operations', 'Route Optimization Proposal', 'Shift 40% West Coast volume from Carrier Bravo to Carrier Echo', 'Pending Approval', '—', 'Carrier Echo on-time rate 96.2% vs Bravo 87.4%; cost delta -$1.82/order on shifted volume'),
  ('2026-04-12 17:20:00+00', 'Support Reflex Agent', 'operations', 'Process Improvement Proposal', 'Automated returns pre-approval for orders under $35', 'Pending Approval', '—', '44% of return tickets qualify; resolution time reduction from 18h to 2h modeled on historical volume'),
  ('2026-04-12 09:00:00+00', 'Harmony Agent', 'operations', 'Conflict Resolution Proposal', 'Paused Acquisition Agent Meta Ads spend increase pending Sniper review', 'Pending Approval', '—', 'Conflicting directives detected: Acquisition +$4,200 vs Sniper waste flag on same channel'),
  ('2026-04-11 11:30:00+00', 'Demand Prophet Agent', 'operations', 'Purchase Order Approved', 'PO issued: 1,800 units SKU-0047 from Vendor Meridian ($21,600)', 'Approved', 'Ops Lead (james.okafor@metabo.io)', 'Seasonal uplift forecast +62%; approved within 48h of submission'),
  ('2026-04-10 16:45:00+00', 'Conversion Agent', 'operations', 'A/B Test Rollout Approved', 'Variant B checkout redesign rolled out to 100% traffic', 'Approved', 'Ops Lead (james.okafor@metabo.io)', '+14.3% conversion lift at 95% confidence over 12-day test; above auto-rollout threshold'),
  ('2026-04-09 13:20:00+00', 'Demand Prophet Agent', 'operations', 'Auto-Execute', 'Auto-issued PO: 320 units SKU-0112 (USB-C Hub) from Vendor Nexus ($4,480)', 'Auto-Executed', 'Autonomous', 'PO value $4,480 within $10,000 autonomous threshold; stockout risk confirmed within 7 days'),
  ('2026-04-08 10:05:00+00', 'Acquisition Agent', 'operations', 'Auto-Execute', 'Paused Google Display campaign (velocity score 0.14, spend $380/month)', 'Auto-Executed', 'Autonomous', 'Monthly spend below $500 autonomous threshold; LTV:CAC ratio 0.8 over trailing 30 days'),
  ('2026-04-07 15:50:00+00', 'Harmony Agent', 'operations', 'Mode Change Logged', 'Operating mode switched from Efficiency to Growth', 'Logged', 'Ops Lead (james.okafor@metabo.io)', 'Q2 growth sprint initiated; mode change confirmed via modal by authorized user'),
  ('2026-04-06 09:30:00+00', 'Support Reflex Agent', 'operations', 'Issue Pattern Detected', 'Recurring shipping delay complaints: 340 tickets in 7 days linked to Carrier Bravo West Coast routes', 'Logged', 'Autonomous', 'Pattern frequency threshold exceeded; escalated to Logistics Conductor for route review');

-- ============================================================
-- ACTIVITY HISTORY SEED (section 4.11.1)
-- ============================================================
insert into public.activity_history (timestamp, user_display_name, user_email, user_role, activity_type, description) values
  ('2026-04-14 09:20:00+00', 'Sarah Chen', 'sarah.chen@metabo.io', 'finance', 'Login', 'User logged in'),
  ('2026-04-12 14:22:00+00', 'Sarah Chen', 'sarah.chen@metabo.io', 'finance', 'Approval — Approved', 'Approved Conductor Agent capital hold on Influencer Program Alpha ($6,000/month)'),
  ('2026-04-11 11:00:00+00', 'Sarah Chen', 'sarah.chen@metabo.io', 'finance', 'Approval — Rejected', 'Rejected Sniper Agent Salesforce CRM renegotiation proposal'),
  ('2026-04-10 08:15:00+00', 'Sarah Chen', 'sarah.chen@metabo.io', 'finance', 'Threshold Updated', 'Updated Sniper Agent autonomous cancellation threshold from $300/month to $500/month'),
  ('2026-04-09 16:40:00+00', 'Sarah Chen', 'sarah.chen@metabo.io', 'finance', 'Slack Settings Updated', 'Updated Finance Slack channel webhook URL'),
  ('2026-04-08 11:05:00+00', 'Sarah Chen', 'sarah.chen@metabo.io', 'finance', 'Agent Paused', 'Paused Oracle Agent pending Q2 forecast data refresh'),
  ('2026-04-07 09:50:00+00', 'Sarah Chen', 'sarah.chen@metabo.io', 'finance', 'Agent Resumed', 'Resumed Oracle Agent after forecast data refresh completed'),
  ('2026-04-14 10:35:00+00', 'James Okafor', 'james.okafor@metabo.io', 'operations', 'Login', 'User logged in'),
  ('2026-04-11 11:35:00+00', 'James Okafor', 'james.okafor@metabo.io', 'operations', 'Approval — Approved', 'Approved Demand Prophet Agent PO for 1,800 units SKU-0047 from Vendor Meridian ($21,600)'),
  ('2026-04-10 16:50:00+00', 'James Okafor', 'james.okafor@metabo.io', 'operations', 'Approval — Approved', 'Approved Conversion Agent Variant B checkout redesign rollout to 100% traffic'),
  ('2026-04-07 15:52:00+00', 'James Okafor', 'james.okafor@metabo.io', 'operations', 'Operating Mode Changed', 'Changed operating mode from Efficiency to Growth'),
  ('2026-04-06 14:10:00+00', 'James Okafor', 'james.okafor@metabo.io', 'operations', 'Threshold Updated', 'Updated Demand Prophet Agent autonomous PO threshold from $5,000 to $10,000'),
  ('2026-04-05 09:30:00+00', 'James Okafor', 'james.okafor@metabo.io', 'operations', 'Agent Paused', 'Paused Acquisition Agent pending channel performance review'),
  ('2026-04-04 11:20:00+00', 'James Okafor', 'james.okafor@metabo.io', 'operations', 'Agent Resumed', 'Resumed Acquisition Agent after channel performance review completed');
