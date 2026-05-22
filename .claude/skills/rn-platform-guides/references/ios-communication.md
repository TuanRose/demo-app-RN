# Reference: Communication Native ↔ React Native (iOS) + App Extensions

---

## Phần 1 — Communication

React Native dùng unidirectional data flow (kế thừa từ React): data chảy từ trên xuống qua properties.

---

## Properties — Native → RN

### Initial props (khi tạo RCTRootView)

```objc
NSArray *imageList = @[
    @"https://dummyimage.com/600x400/ffffff/000000.png",
    @"https://dummyimage.com/600x400/000000/ffffff.png"
];
NSDictionary *props = @{@"images": imageList};
RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                                 moduleName:@"ImageBrowserApp"
                                          initialProperties:props];
```

### Cập nhật props tại runtime

```objc
NSArray *newImageList = @[@"https://dummyimage.com/600x400/ff0000/000000.png"];
rootView.appProperties = @{@"images": newImageList}; // phải gọi trên main thread
```

**Lưu ý:**
- `appProperties` phải set trên **main thread**.
- Chỉ update khi props thực sự thay đổi — framework tự so sánh.
- Nếu set trong khi bridge đang startup, giá trị có thể bị mất (known issue).

---

## Properties — RN → Native

Export via `RCT_CUSTOM_VIEW_PROPERTY` macro trong `RCTViewManager`. Dùng giống React prop bình thường từ JS.

---

## Events — Native → RN

Dùng khi native cần trigger handler trong JS mà không giữ reference đến component.

**Pattern:** `RCTViewManager` làm delegate, gửi event về JS qua bridge.

**Lưu ý:**
- Events dùng chung **global namespace** — tránh đặt tên trùng.
- Dùng `reactTag` để phân biệt multiple instances.
- Không đảm bảo thứ tự thực thi (chạy trên thread riêng).

---

## Native Modules — RN → Native

Xem skill `rn-native-legacy` (module-ios) hoặc `rn-native-platform` (turbo-module-ios).

---

## Layout khi nhúng RCTRootView vào Native

### Fixed size

```objc
- (void)viewDidLoad {
    RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                                     moduleName:appName
                                              initialProperties:props];
    rootView.frame = CGRectMake(0, 0, self.view.frame.size.width, 200);
    [self.view addSubview:rootView];
}
```

### Flexible height (theo content)

```objc
_rootView.delegate = self;
_rootView.sizeFlexibility = RCTRootViewSizeFlexibilityHeight;
_rootView.frame = CGRectMake(0, 0, self.frame.size.width, 0);

// Delegate callback khi RN tính xong layout
- (void)rootViewDidChangeIntrinsicSize:(RCTRootView *)rootView {
    CGRect newFrame = rootView.frame;
    newFrame.size = rootView.intrinsicContentSize;
    rootView.frame = newFrame;
}
```

**Các mode flexibility:**

| Mode | Ý nghĩa |
|------|---------|
| `RCTRootViewSizeFlexibilityNone` | Default, fixed size |
| `RCTRootViewSizeFlexibilityWidth` | Flexible width |
| `RCTRootViewSizeFlexibilityHeight` | Flexible height |
| `RCTRootViewSizeFlexibilityWidthAndHeight` | Flexible cả hai |

**Lưu ý layout:**
- RN layout tính trên separate thread → native UI update trên main thread → có thể thấy UI không nhất quán thoáng qua.
- Không đặt flexible trên cả JS và native cùng lúc.
- Dùng `UIView`'s `hidden` ẩn RN view cho đến khi dimensions được tính xong.
- Nếu cần đảm bảo content luôn có, wrap trong `ScrollView`.

---

## Phần 2 — App Extensions (iOS)

App Extensions cho phép cung cấp custom functionality ngoài app chính (Today Widget, Share Extension, Custom Keyboard...).

### Giới hạn bộ nhớ

| Extension Type | Memory Limit | Khả năng dùng RN |
|----------------|-------------|-----------------|
| Today Widget | 16 MB | Không ổn định, thường bị "Unable to Load" |
| Custom Keyboard | 48 MB | Khả thi hơn |
| Share Extension | 120 MB | Khả thi |

### Lưu ý quan trọng

- **Debug builds** dùng nhiều memory hơn release → dễ fail trên thiết bị thật.
- **Test trên thiết bị thật** — extensions có thể hoạt động trên Simulator nhưng fail trên device.
- Dùng **Xcode Instruments** để đo memory usage thực tế.
- Fetching data từ API có thể đẩy memory vượt limit.

### Ví dụ projects

- Today Widget: [react-native-today-widget](https://github.com/matejkriz/react-native-today-widget/)
- Share Extension: [react-native-ios-share-extension](https://github.com/andrewsardone/react-native-ios-share-extension)
