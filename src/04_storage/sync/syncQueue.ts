import { createMMKV } from 'react-native-mmkv';
import { transactionRepo } from '../repositories/TransactionRepositoryImpl';

// MMKV cho sync queue: synchronous write quan trọng khi app có thể bị kill
// bất cứ lúc nào — async storage có thể miss write nếu process bị terminate
const queueStorage = createMMKV({ id: 'fintrack-sync-queue' });

const QUEUE_KEY = 'pending_actions';

type SyncAction = {
  id: string;
  type: 'CREATE_TRANSACTION' | 'DELETE_TRANSACTION';
  payload: unknown;
  retries: number;
  timestamp: number;
};

function getQueue(): SyncAction[] {
  const raw = queueStorage.getString(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as SyncAction[]) : [];
}

function saveQueue(queue: SyncAction[]): void {
  queueStorage.set(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(type: SyncAction['type'], payload: unknown): void {
  const queue = getQueue();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    type,
    payload,
    retries: 0,
    timestamp: Date.now(),
  });
  saveQueue(queue);
}

export function getQueueLength(): number {
  return getQueue().length;
}

export async function flushQueue(): Promise<void> {
  const queue = getQueue();
  if (queue.length === 0) return;

  const failed: SyncAction[] = [];

  for (const action of queue) {
    try {
      await executeAction(action);
      if (
        action.type === 'CREATE_TRANSACTION' &&
        typeof action.payload === 'object' &&
        action.payload !== null &&
        'id' in action.payload
      ) {
        transactionRepo.markSynced((action.payload as { id: string }).id);
      }
    } catch {
      // Retry tối đa 3 lần — discard sau đó để tránh queue tích lũy vô hạn
      if (action.retries < 3) {
        failed.push({ ...action, retries: action.retries + 1 });
      }
    }
  }

  saveQueue(failed);
}

async function executeAction(action: SyncAction): Promise<void> {
  // Mock API call — swap với real HTTP call khi có backend
  await new Promise<void>(resolve => setTimeout(() => resolve(), 300));
  if (action.type === 'CREATE_TRANSACTION') {
    // await api.post('/transactions', action.payload);
  } else if (action.type === 'DELETE_TRANSACTION') {
    // await api.delete(`/transactions/${(action.payload as { id: string }).id}`);
  }
}
