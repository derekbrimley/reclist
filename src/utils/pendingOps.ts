const PENDING_OPS_KEY = 'reclist_pending_ops';

export interface PendingOp {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export function loadPendingOps(): PendingOp[] {
  try {
    const stored = localStorage.getItem(PENDING_OPS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load pending ops:', e);
  }
  return [];
}

export function savePendingOps(ops: PendingOp[]): void {
  try {
    localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(ops));
  } catch (e) {
    console.error('Failed to save pending ops:', e);
  }
}

export function enqueuePendingOp(op: Omit<PendingOp, 'id' | 'timestamp'>): void {
  const ops = loadPendingOps();
  ops.push({
    ...op,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
  });
  savePendingOps(ops);
}

export function dequeuePendingOp(opId: string): void {
  const ops = loadPendingOps().filter((op) => op.id !== opId);
  savePendingOps(ops);
}
