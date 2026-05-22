# Reference: Redux Toolkit (RTK)

Dùng cho: apps phức tạp, team lớn, cần predictable state với devtools, time-travel debugging.

---

## Cài đặt

```bash
npm install @reduxjs/toolkit react-redux
```

---

## createSlice — state + reducers + actions trong một

```tsx
// features/user/userSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  profile: { id: string; name: string } | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  isLoading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // RTK dùng Immer — có thể "mutate" state trực tiếp
    setProfile: (state, action: PayloadAction<{ id: string; name: string }>) => {
      state.profile = action.payload; // Immer tự tạo immutable update
    },
    clearProfile: (state) => {
      state.profile = null;
      state.error = null;
    },
  },
  // Xử lý actions từ createAsyncThunk
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Unknown error';
      });
  },
});

export const { setProfile, clearProfile } = userSlice.actions;
export default userSlice.reducer;
```

---

## createAsyncThunk — async side effects

```tsx
// features/user/userThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';

export const fetchUser = createAsyncThunk(
  'user/fetchUser',          // action type prefix
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await api.getUser(userId);
      return response.data;
    } catch (error) {
      // rejectWithValue cho phép custom error payload
      return rejectWithValue((error as any).response?.data?.message ?? 'Failed to fetch user');
    }
  }
);

// Dùng trong component
dispatch(fetchUser('123'));
```

---

## configureStore — setup store

```tsx
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import userReducer from '../features/user/userSlice';
import postsReducer from '../features/posts/postsSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    posts: postsReducer,
  },
  // middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(customMiddleware),
});

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks — luôn dùng thay vì useSelector/useDispatch gốc
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

**Wrap app:**
```tsx
// App.tsx
import { Provider } from 'react-redux';
import { store } from './store';

<Provider store={store}>
  <NavigationContainer>{/* ... */}</NavigationContainer>
</Provider>
```

---

## Dùng trong components

```tsx
import { useAppDispatch, useAppSelector } from '../store';
import { fetchUser, clearProfile } from '../features/user/userSlice';

function ProfileScreen({ route }) {
  const dispatch = useAppDispatch();
  const { profile, isLoading, error } = useAppSelector(state => state.user);

  useEffect(() => {
    dispatch(fetchUser(route.params.userId));
    return () => { dispatch(clearProfile()); };
  }, []);

  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error}</Text>;
  if (!profile) return null;

  return <Text>{profile.name}</Text>;
}
```

---

## RTK Query — data fetching + caching

```tsx
// services/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.example.com',
    prepareHeaders: (headers, { getState }) => {
      // Attach auth token từ Redux state
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['User', 'Post'],      // để invalidate cache
  endpoints: (builder) => ({
    getUser: builder.query<User, string>({
      query: (userId) => `/users/${userId}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    updateUser: builder.mutation<User, Partial<User> & Pick<User, 'id'>>({
      query: ({ id, ...patch }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
  }),
});

export const { useGetUserQuery, useUpdateUserMutation } = apiSlice;

// Thêm vào store
export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    // ...other reducers
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});
```

**Dùng RTK Query hooks:**
```tsx
function UserProfile({ userId }) {
  const { data: user, isLoading, isError, refetch } = useGetUserQuery(userId);
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  const handleUpdate = async () => {
    await updateUser({ id: userId, name: 'New Name' }).unwrap();
    // unwrap() throw error nếu mutation fail
  };
}
```
