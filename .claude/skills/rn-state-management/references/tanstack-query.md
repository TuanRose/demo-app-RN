# Reference: TanStack Query (React Query) — React Native

Chuyên cho **server state** — fetching, caching, sync, background refetch.
Không thay thế Zustand/Redux cho client state.

---

## Cài đặt + setup React Native

```bash
npm install @tanstack/react-query
npm install @react-native-community/netinfo  # cho online detection
```

**Provider setup (App.tsx):**
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager, focusManager } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,  // 5 phút
      gcTime: 1000 * 60 * 10,    // 10 phút (trước là cacheTime)
      refetchOnWindowFocus: false, // không có window focus trên mobile
    },
  },
});

// Online status detection — không tự có trên React Native
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

// App focus detection thay thế window focus
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

function App() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* app */}
    </QueryClientProvider>
  );
}
```

---

## useQuery — fetch data

```tsx
import { useQuery } from '@tanstack/react-query';

function UserProfile({ userId }: { userId: string }) {
  const {
    data,          // fetched data
    isLoading,     // true khi fetch lần đầu và chưa có data
    isFetching,    // true khi đang fetch (kể cả background refetch)
    isError,
    error,
    refetch,       // trigger manual refetch
    isStale,       // data đã cũ (vượt staleTime)
  } = useQuery({
    queryKey: ['user', userId],           // cache key — array, phải unique
    queryFn: () => fetchUser(userId),     // function trả về Promise
    staleTime: 1000 * 60,                 // 1 phút trước khi coi là stale
    enabled: !!userId,                    // chỉ fetch khi userId có giá trị
    select: (data) => data.profile,       // transform data trước khi return
    placeholderData: previousData,        // show previous data trong khi loading
  });
}
```

---

## useMutation — create/update/delete

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function EditProfile() {
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isPending, isError } = useMutation({
    mutationFn: (data: UpdateProfileData) => updateProfile(data),

    onSuccess: (data, variables) => {
      // Invalidate cache → trigger refetch
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
    },

    onError: (error) => {
      Alert.alert('Error', error.message);
    },

    onSettled: () => {
      // Chạy sau success hoặc error
    },
  });

  // mutate — fire and forget
  const handleSave = () => mutate({ userId: '123', name: 'New Name' });

  // mutateAsync — có thể await và catch
  const handleSaveAsync = async () => {
    try {
      await mutateAsync({ userId: '123', name: 'New Name' });
      showSuccessToast();
    } catch (e) {
      // handle error
    }
  };
}
```

---

## Optimistic updates

```tsx
const { mutate } = useMutation({
  mutationFn: likePost,

  onMutate: async (postId) => {
    // Cancel các queries đang pending để tránh conflict
    await queryClient.cancelQueries({ queryKey: ['posts'] });

    // Snapshot state hiện tại (để rollback nếu fail)
    const previousPosts = queryClient.getQueryData(['posts']);

    // Optimistically update cache
    queryClient.setQueryData(['posts'], (old: Post[]) =>
      old.map(post =>
        post.id === postId ? { ...post, liked: true, likes: post.likes + 1 } : post
      )
    );

    return { previousPosts }; // context để dùng trong onError
  },

  onError: (err, postId, context) => {
    // Rollback về state trước
    queryClient.setQueryData(['posts'], context?.previousPosts);
  },

  onSettled: () => {
    // Sync lại với server
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  },
});
```

---

## useInfiniteQuery — pagination

```tsx
import { useInfiniteQuery } from '@tanstack/react-query';

function PostsFeed() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => fetchPosts({ page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
  });

  // Flatten pages
  const posts = data?.pages.flatMap(page => page.items) ?? [];

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <PostCard post={item} />}
      onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
      onEndReachedThreshold={0.3}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator /> : null}
    />
  );
}
```

---

## Refetch khi screen focused (React Navigation)

```tsx
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

function useRefreshOnFocus(queryKey: unknown[]) {
  const queryClient = useQueryClient();
  const firstRender = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstRender.current) {
        firstRender.current = false;
        return;
      }
      // Refetch khi navigate về màn hình này (bỏ qua lần đầu)
      queryClient.invalidateQueries({ queryKey });
    }, [queryClient, queryKey])
  );
}

// Dùng
function ProfileScreen() {
  useRefreshOnFocus(['user', userId]);
}
```
