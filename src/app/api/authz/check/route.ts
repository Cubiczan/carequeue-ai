import { NextResponse } from 'next/server';
import { checkToolPermission, checkIndexPermission, getRolePermissions, isValidRole } from '@/lib/authz';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, action, resource, permissionType } = body as {
      role: unknown;
      action: string;
      resource?: string;
      permissionType: 'tool' | 'index';
    };

    // Validate the client-supplied role server-side — never trust the raw value.
    if (!isValidRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    let decision;

    if (permissionType === 'tool') {
      // Extract index from resource if present (e.g., "index:security")
      const index = resource?.startsWith('index:') ? resource.slice(6) : undefined;
      decision = checkToolPermission(role, action, index);
    } else {
      const index = resource || '';
      decision = checkIndexPermission(role, index, (action as 'read' | 'query') || 'read');
    }

    // Log the decision to the audit trail
    await db.auditLog.create({
      data: {
        userId: `${role}_user`,
        userRole: role,
        action,
        resource: resource || '',
        decision: decision.allowed ? 'ALLOW' : 'DENY',
        reason: decision.reason,
      },
    });

    return NextResponse.json({
      allowed: decision.allowed,
      reason: decision.reason,
      policy: decision.policy,
      timestamp: decision.timestamp,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Permission check failed' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  if (!role) {
    return NextResponse.json({ error: 'Role parameter required' }, { status: 400 });
  }
  if (!isValidRole(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const permissions = getRolePermissions(role);
  return NextResponse.json(permissions);
}
