# Architecture & Folder Structure

## src/ — Learning Modules

Mỗi bài học là một folder độc lập:
```
src/
└── {02d}_{tên_skill}/
    ├── README.md          ← BẮT BUỘC: mục tiêu, ghi chú, checklist
    ├── specs/             ← TypeScript specs (New Architecture)
    ├── components/        ← RN components demo
    ├── screens/           ← Demo screens
    └── utils/             ← Helper functions
```

Chỉ tạo subfolder thực sự cần — không tạo folder rỗng để cho đẹp.

## App root
- `index.js` — entry point, AppRegistry
- `App.tsx` — root component với SafeAreaProvider
- `__tests__/` — Jest tests

## Rules
- Mỗi bài học phải tự standalone — không import chéo giữa các bài
- README.md của bài học phải có checklist mục tiêu (dùng `- [ ]`)
- Khi hoàn thành mục tiêu, tick checkbox trong README
