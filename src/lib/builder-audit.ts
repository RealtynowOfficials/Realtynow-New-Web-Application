import { supabase } from './supabase';

export async function logBuilderAudit(
  action: string,
  entity: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const actorId = auth.user?.id;
  if (!actorId) return;

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action,
    entity,
    entity_id: entityId,
    metadata,
  });
}
