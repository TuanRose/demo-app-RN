import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Redux cho auth state vì: cần truy cập từ middleware (RTK Query headers),
// và có thể cần time-travel debug khi investigate auth bug trong team
type UserProfile = {
  id: string;
  name: string;
  email: string;
};

type AuthState = {
  user: UserProfile | null;
  token: string | null;
};

const initialState: AuthState = {
  user: null,
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signIn: (state, action: PayloadAction<{ user: UserProfile; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    signOut: (state) => {
      state.user = null;
      state.token = null;
    },
    updateProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        // RTK dùng Immer — "mutate" state trực tiếp, Immer tạo immutable copy
        Object.assign(state.user, action.payload);
      }
    },
  },
});

export const { signIn, signOut, updateProfile } = authSlice.actions;
export default authSlice.reducer;
