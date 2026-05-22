# Skill: rn-architecture

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

| Chủ đề | Mô tả |
|--------|-------|
| Folder structure | Feature-based, scalable project organization |
| Clean Architecture | Entities, use cases, repositories, DI pattern |
| Monorepo | Turborepo/Nx setup, shared packages, workspace |

---

## Routing

| Người dùng cần | File cần đọc |
|---------------|-------------|
| Tổ chức folder dự án lớn, feature-based structure, module boundaries | `references/folder-structure.md` |
| Clean Architecture trong RN, layers, dependency inversion, testability | `references/clean-architecture.md` |
| Monorepo với multiple apps, shared components/utils, Turborepo setup | `references/monorepo.md` |

---

## Quy tắc chung

- **Feature-based** (theo tính năng) tốt hơn type-based (screens/, components/, utils/) cho dự án lớn.
- **Clean Architecture**: UI không import trực tiếp từ data layer — luôn qua use case/repository interface.
- **Dependency Rule**: dependencies chỉ trỏ vào (toward) — outer layers depend on inner layers, không ngược lại.
- Monorepo: dùng `workspace:*` protocol cho internal packages thay vì relative imports.
- Đặt module boundary rõ ràng từ đầu — refactor sau khi đã lớn rất tốn kém.
