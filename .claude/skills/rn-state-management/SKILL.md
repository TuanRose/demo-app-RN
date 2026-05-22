# Skill: rn-state-management

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

| Chủ đề | Mô tả |
|--------|-------|
| Redux Toolkit | createSlice, createAsyncThunk, RTK Query — apps phức tạp, team lớn |
| Zustand | Lightweight store, slice pattern, persist — apps vừa/nhỏ |
| TanStack Query | Server state, caching, pagination — data fetching |
| Khi nào dùng gì | Decision tree: Context vs Zustand vs Redux vs React Query |

---

## Routing

| Người dùng cần | File cần đọc |
|---------------|-------------|
| Redux, createSlice, createAsyncThunk, RTK Query (createApi) | `references/redux-toolkit.md` |
| Zustand store, set/get, persist, devtools, slice pattern | `references/zustand.md` |
| useQuery, useMutation, infinite scroll, RN-specific setup (AppState, NetInfo) | `references/tanstack-query.md` |
| Chọn state management solution, trade-offs | `references/when-to-use.md` |

---

## Quy tắc chung

- **Server state** (API data) → TanStack Query, không dùng Redux/Zustand cho server data.
- **Global client state** phức tạp (team lớn, nhiều side effects) → Redux Toolkit.
- **Global client state** đơn giản → Zustand.
- **Component-scoped state** → useState/useReducer.
- **Prop drilling 2-3 levels** → Context API (không cần library).
- Không persist toàn bộ Redux state → chọn lọc slice nào cần persist.
