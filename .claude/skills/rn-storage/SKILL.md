# Skill: rn-storage

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

| Chủ đề | Mô tả |
|--------|-------|
| MMKV | Key-value storage nhanh nhất, thay thế AsyncStorage |
| SQLite | Relational data, complex queries, migrations |
| Offline-first patterns | Optimistic UI, sync queue, conflict resolution |

---

## Routing

| Người dùng cần | File cần đọc |
|---------------|-------------|
| Key-value storage, MMKV setup, encryption, hooks, so sánh AsyncStorage | `references/mmkv.md` |
| SQLite, relational data, op-sqlite, WAL mode, typed queries, migrations | `references/sqlite.md` |
| Offline mode, optimistic updates, background sync, conflict resolution | `references/offline-patterns.md` |

---

## Chọn storage solution

| Use case | Solution |
|----------|---------|
| Settings, tokens, small data | MMKV |
| Redux/Zustand persist | MMKV (zustand-mmkv-storage) |
| Relational/complex queries | SQLite (op-sqlite) |
| Large datasets, sync, relations | WatermelonDB |
| Sensitive data (passwords, tokens) | react-native-keychain → xem `rn-security` |

## Quy tắc chung

- **Không dùng AsyncStorage** cho sensitive data — unencrypted, dùng Keychain/Keystore.
- **MMKV** nhanh hơn AsyncStorage ~30x — ưu tiên cho mọi key-value storage.
- **SQLite WAL mode**: tăng performance đáng kể cho concurrent reads.
- Luôn có **migration strategy** ngay từ đầu — thêm sau rất khó.
- Test offline scenarios trên real device, không chỉ simulator.
