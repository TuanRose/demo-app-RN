# Reference: Offline-First Patterns

---

## Network detection

```tsx
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

// Hook kiểm tra online/offline
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected && !!state.isInternetReachable);
    });
    return unsubscribe;
  }, []);

  return isOnline;
}
```

---

## Optimistic Updates

Cập nhật UI ngay lập tức mà không chờ server response, rollback nếu fail.

```tsx
// Với TanStack Query
const { mutate } = useMutation({
  mutationFn: toggleLike,

  onMutate: async (postId) => {
    await queryClient.cancelQueries({ queryKey: ['posts'] });
    const previousPosts = queryClient.getQueryData<Post[]>(['posts']);

    // Cập nhật cache ngay lập tức
    queryClient.setQueryData<Post[]>(['posts'], (old) =>
      old?.map(post =>
        post.id === postId
          ? { ...post, liked: !post.liked, likeCount: post.likeCount + (post.liked ? -1 : 1) }
          : post
      )
    );

    return { previousPosts }; // snapshot để rollback
  },

  onError: (err, postId, context) => {
    // Rollback về state cũ
    queryClient.setQueryData(['posts'], context?.previousPosts);
    showToast('Lỗi, thử lại sau');
  },

  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  },
});
```

---

## Sync Queue — xử lý actions khi offline

Lưu các actions vào queue khi offline, sync khi có mạng trở lại.

```tsx
import { MMKV } from 'react-native-mmkv';
import NetInfo from '@react-native-community/netinfo';

const storage = new MMKV({ id: 'sync-queue' });

interface QueuedAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retries: number;
}

// Thêm action vào queue
function enqueueAction(type: string, payload: unknown) {
  const queue = getQueue();
  queue.push({
    id: Date.now().toString(),
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  });
  storage.set('queue', JSON.stringify(queue));
}

function getQueue(): QueuedAction[] {
  const raw = storage.getString('queue');
  return raw ? JSON.parse(raw) : [];
}

// Process queue khi có mạng
async function processQueue() {
  const queue = getQueue();
  const failed: QueuedAction[] = [];

  for (const action of queue) {
    try {
      await executeAction(action);
    } catch (e) {
      if (action.retries < 3) {
        failed.push({ ...action, retries: action.retries + 1 });
      }
      // Discard sau 3 lần retry
    }
  }

  storage.set('queue', JSON.stringify(failed));
}

// Listen khi online trở lại
NetInfo.addEventListener((state) => {
  if (state.isConnected && state.isInternetReachable) {
    processQueue();
  }
});

// Dùng
function handleLikePost(postId: string) {
  const isOnline = /* check */;

  if (isOnline) {
    api.likePost(postId);
  } else {
    // Optimistic update UI
    updateLocalCache(postId);
    // Queue action
    enqueueAction('LIKE_POST', { postId });
  }
}
```

---

## Cache-first strategy

```tsx
// Đọc từ cache trước, fetch background để update
async function getPosts(): Promise<Post[]> {
  // 1. Return cached data ngay lập tức
  const cached = getCachedPosts();
  if (cached) {
    // Trigger background refresh
    fetchAndCachePosts().catch(console.error);
    return cached;
  }

  // 2. Nếu không có cache, fetch và đợi
  return fetchAndCachePosts();
}

async function fetchAndCachePosts(): Promise<Post[]> {
  const posts = await api.getPosts();
  storage.set('posts', JSON.stringify(posts));
  storage.set('posts_cached_at', Date.now());
  return posts;
}

function getCachedPosts(): Post[] | null {
  const raw = storage.getString('posts');
  const cachedAt = storage.getNumber('posts_cached_at') ?? 0;

  // Cache valid trong 5 phút
  if (!raw || Date.now() - cachedAt > 5 * 60 * 1000) return null;
  return JSON.parse(raw);
}
```

---

## Stale-while-revalidate (TanStack Query)

TanStack Query implements pattern này tự động:

```tsx
const { data } = useQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
  staleTime: 60 * 1000,  // 1 phút — data "fresh" trong 1 phút
  gcTime: 5 * 60 * 1000, // 5 phút — giữ trong cache
  // → Return cached data ngay, background refetch nếu stale
});
```

---

## Conflict resolution

Khi device offline thực hiện changes, server cũng có changes → conflict.

**Last-write-wins (đơn giản nhất):**
```tsx
// Server timestamp > local timestamp → server wins
function mergeData(local: Item, server: Item): Item {
  return local.updatedAt > server.updatedAt ? local : server;
}
```

**Operational Transform / CRDT (phức tạp nhất, WatermelonDB sync):**
```tsx
// WatermelonDB Sync protocol xử lý conflict tự động
import { synchronize } from '@nozbe/watermelondb/sync';

await synchronize({
  database,
  pullChanges: async ({ lastPulledAt }) => {
    const { changes, timestamp } = await api.pullChanges(lastPulledAt);
    return { changes, timestamp };
  },
  pushChanges: async ({ changes }) => {
    await api.pushChanges(changes);
  },
  conflictResolver: (table, local, remote) => {
    // Custom conflict resolution per table
    return { ...remote, localField: local.localField };
  },
});
```

---

## Pitfalls

### `NativeModule.RNCNetInfo is null` (iOS)

**Nguyên nhân**: `@react-native-community/netinfo` có native iOS code nhưng chưa được CocoaPods link — thường xảy ra khi `npm install` chạy sau lần `pod install` cuối cùng.

**Fix**:
```bash
# Nếu bundle exec pod install báo lỗi gem không tìm thấy, chạy trước:
bundle install

# Sau đó link native module
bundle exec pod install

# Rebuild hoàn toàn (không chỉ reload)
npm run ios:sim
```

**Tại sao**: NetInfo đọc `NWPathMonitor` / `SCNetworkReachability` — native framework iOS. CocoaPods phải link framework này vào Xcode project. Nếu thiếu link → `NativeModule.RNCNetInfo = null` lúc runtime.
