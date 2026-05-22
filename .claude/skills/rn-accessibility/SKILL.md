# Skill: rn-accessibility

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

| Chủ đề | Mô tả |
|--------|-------|
| A11y props | accessible, accessibilityLabel, Role, State, Value, Hint |
| Screen reader | VoiceOver (iOS), TalkBack (Android), testing tips |
| A11y patterns | Focus management, live regions, announcements, keyboard nav |

---

## Routing

| Người dùng cần | File cần đọc |
|---------------|-------------|
| accessible prop, accessibilityLabel/Hint/Role/State/Value, ARIA attributes | `references/a11y-props.md` |
| VoiceOver, TalkBack, test trên real device, screen reader detection | `references/screen-reader.md` |
| Focus management, live regions, announcements, accessibility actions | `references/a11y-patterns.md` |

---

## Quy tắc chung

- Mọi interactive element phải có `accessibilityLabel` — đặc biệt icon buttons không có text.
- `accessibilityRole` giúp screen reader thông báo đúng loại element (button, link, header...).
- `accessibilityState` cho disabled, selected, checked — quan trọng cho form elements.
- **Test với real device**: VoiceOver trên iPhone, TalkBack trên Android.
- `importantForAccessibility="no-hide-descendants"` để ẩn decorative views khỏi screen reader.
- `accessibilityLiveRegion="polite"` để announce dynamic content changes.
