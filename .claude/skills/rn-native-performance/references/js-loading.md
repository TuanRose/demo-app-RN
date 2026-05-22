# Reference: JavaScript Loading Optimization

---

## 1. Dùng Hermes (Mặc định — Khuyến nghị)

Hermes compile toàn bộ JS thành bytecode **trước khi chạy** (AOT). Bytecode load on-demand, không cần parse như plain JS.

> **Không tương thích với RAM bundles.** Hermes cho performance tương đương hoặc tốt hơn RAM bundles.

---

## 2. Lazy-load Components lớn

Dùng React `lazy` để defer loading code cho đến khi component thực sự được render:

```tsx
const MyComponent = React.lazy(() => import('./MyComponent'));

// Bắt buộc wrap trong Suspense
<Suspense fallback={<Loading />}>
  <MyComponent />
</Suspense>
```

> **Tránh module side effects** (modify global variables, subscribe events) — sẽ phá lazy-loading.

---

## 3. Inline `require()` — Manual

Load module on-demand thay vì import static ở đầu file:

```tsx
let VeryExpensive = null;

export default function Optimize() {
  const [needsExpensive, setNeedsExpensive] = useState(false);

  const didPress = useCallback(() => {
    if (VeryExpensive == null) {
      VeryExpensive = require('./VeryExpensive').default; // load khi cần
    }
    setNeedsExpensive(true);
  }, []);

  return (
    <View>
      <TouchableOpacity onPress={didPress}>
        <Text>Load</Text>
      </TouchableOpacity>
      {needsExpensive ? <VeryExpensive /> : null}
    </View>
  );
}
```

---

## 4. Inline `require()` — Tự động qua Metro

Metro CLI tự động inline `require()` trong code và `node_modules`.

`metro.config.js`:
```js
module.exports = {
  transformer: {
    async getTransformOptions() {
      return {
        transform: {
          inlineRequires: true,
        },
      };
    },
  },
};
```

**Expo** (disabled by default — cần bật thủ công):
```js
// metro.config.js
inlineRequires: true
```

**Exclude module cụ thể:**
```js
module.exports = {
  transformer: {
    async getTransformOptions() {
      return {
        transform: {
          inlineRequires: {
            blockList: {
              [require.resolve('./src/DoNotInlineHere.js')]: true,
            },
          },
          nonInlinedRequires: ['react'], // không bao giờ inline react
        },
      };
    },
  },
};
```

> **Pitfall:** Inlining thay đổi thứ tự evaluation của modules. Tắt nếu thấy side effects hoặc modules tương tác với global state.

---

## 5. RAM Bundles (Chỉ khi không dùng Hermes)

Mỗi module được lưu riêng, chỉ được parse khi thực thi. Giúp startup nhanh hơn cho app rất lớn.

**Android — `android/app/build.gradle`:**
```gradle
project.ext.react = [
  bundleCommand: "ram-bundle",
]

// Indexed format (khuyến nghị cho Android):
project.ext.react = [
  bundleCommand: "ram-bundle",
  extraPackagerArgs: ["--indexed-ram-bundle"],
]
```

**iOS — Xcode Build Phase script:**
```bash
export BUNDLE_COMMAND="ram-bundle"
export NODE_BINARY=node
../node_modules/react-native/scripts/react-native-xcode.sh
```

> iOS luôn dùng indexed format (single file). Android có thể dùng split files hoặc indexed.

---

## Thứ tự ưu tiên tối ưu

| Thứ tự | Kỹ thuật | Ghi chú |
|--------|----------|---------|
| 1 | **Hermes** (mặc định) | Không cần làm gì thêm |
| 2 | **Lazy-load screen-level components** | Không ảnh hưởng startup time |
| 3 | **Inline require()** — tự động via Metro | Kiểm tra kỹ side effects |
| 4 | **RAM bundles** | Chỉ khi không dùng Hermes, app rất lớn |
