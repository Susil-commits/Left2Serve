import { insert } from './database.js';

export async function audit({ actorId, actorRole, action, targetType, targetId, detail, ip }) {
  try {
    await insert(
      'INSERT INTO audit_log (actor_id, actor_role, action, target_type, target_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [actorId ?? null, actorRole ?? null, action, targetType ?? null, targetId ?? null, detail ?? null, ip ?? null]
    );
  } catch {
    // audit logging must never break the calling flow
  }
}
