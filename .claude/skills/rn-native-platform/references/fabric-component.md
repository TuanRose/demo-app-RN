# Reference: Fabric Native Component

## Bước 1 — TypeScript Spec

`specs/WebViewNativeComponent.ts`:

```typescript
import type {CodegenTypes, HostComponent, ViewProps} from 'react-native';
import {codegenNativeComponent} from 'react-native';

type WebViewScriptLoadedEvent = {
  result: 'success' | 'error';
};

export interface NativeProps extends ViewProps {
  sourceURL?: string;
  onScriptLoaded?: CodegenTypes.BubblingEventHandler<WebViewScriptLoadedEvent> | null;
}

export default codegenNativeComponent<NativeProps>('CustomWebView') as HostComponent<NativeProps>;
```

---

## Bước 2 — CodeGen config

`package.json`:

```json
"codegenConfig": {
  "name": "AppSpec",
  "type": "components",
  "jsSrcsDir": "specs",
  "android": {
    "javaPackageName": "com.webview"
  },
  "ios": {
    "componentProvider": {
      "CustomWebView": "RCTWebView"
    }
  }
}
```

---

## Bước 3 — Android Implementation

### Chạy CodeGen
```bash
cd android && ./gradlew generateCodegenArtifactsFromSchema
```

### Native View — `ReactWebView.java`

```java
package com.webview;

import android.content.Context;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.EventDispatcher;

public class ReactWebView extends WebView {

    public ReactWebView(Context context) {
        super(context);
        configureComponent();
    }

    private void configureComponent() {
        this.setLayoutParams(new LayoutParams(
            LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        this.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                emitOnScriptLoaded(OnScriptLoadedEventResult.success);
            }
        });
    }

    public void emitOnScriptLoaded(OnScriptLoadedEventResult result) {
        ReactContext reactContext = (ReactContext) context;
        EventDispatcher dispatcher = UIManagerHelper
            .getEventDispatcherForReactTag(reactContext, getId());
        if (dispatcher == null) return;

        WritableMap payload = Arguments.createMap();
        payload.putString("result", result.name());
        dispatcher.dispatchEvent(new OnScriptLoadedEvent(
            UIManagerHelper.getSurfaceId(reactContext), getId(), payload));
    }

    public enum OnScriptLoadedEventResult { success, error }

    private static class OnScriptLoadedEvent extends Event<OnScriptLoadedEvent> {
        private final WritableMap payload;
        OnScriptLoadedEvent(int surfaceId, int viewId, WritableMap payload) {
            super(surfaceId, viewId);
            this.payload = payload;
        }
        @Override public String getEventName() { return "onScriptLoaded"; }
        @Override public WritableMap getEventData() { return payload; }
    }
}
```

### ViewManager — `ReactWebViewManager.java`

```java
package com.webview;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewManagerDelegate;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.viewmanagers.CustomWebViewManagerDelegate;
import com.facebook.react.viewmanagers.CustomWebViewManagerInterface;
import java.util.HashMap;
import java.util.Map;

@ReactModule(name = ReactWebViewManager.REACT_CLASS)
public class ReactWebViewManager extends SimpleViewManager<ReactWebView>
    implements CustomWebViewManagerInterface<ReactWebView> {

    public static final String REACT_CLASS = "CustomWebView";

    private final CustomWebViewManagerDelegate<ReactWebView, ReactWebViewManager> delegate =
        new CustomWebViewManagerDelegate<>(this);

    @Override
    public ViewManagerDelegate<ReactWebView> getDelegate() { return delegate; }

    @Override
    public String getName() { return REACT_CLASS; }

    @Override
    public ReactWebView createViewInstance(ThemedReactContext context) {
        return new ReactWebView(context);
    }

    @ReactProp(name = "sourceUrl")
    @Override
    public void setSourceURL(ReactWebView view, String sourceURL) {
        if (sourceURL == null) {
            view.emitOnScriptLoaded(ReactWebView.OnScriptLoadedEventResult.error);
            return;
        }
        view.loadUrl(sourceURL, new HashMap<>());
    }

    @Override
    public Map<String, Object> getExportedCustomBubblingEventTypeConstants() {
        Map<String, Object> map = new HashMap<>();
        map.put("onScriptLoaded", new HashMap<String, Object>() {{
            put("phasedRegistrationNames", new HashMap<String, String>() {{
                put("bubbled", "onScriptLoaded");
                put("captured", "onScriptLoadedCapture");
            }});
        }});
        return map;
    }
}
```

### Package — `ReactWebViewPackage.java`

```java
package com.webview;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.Collections;
import java.util.List;

public class ReactWebViewPackage extends BaseReactPackage {
    @Override
    public List<ViewManager<?, ?>> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.singletonList(new ReactWebViewManager(reactContext));
    }
}
```

### Đăng ký trong `MainApplication.kt`

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(ReactWebViewPackage())
    }
```

---

## Bước 4 — iOS Implementation

### Chạy CodeGen
```bash
cd ios && bundle exec pod install
```

### Header — `RCTWebView.h`

```objc
#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTWebView : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
```

### Implementation — `RCTWebView.mm`

```objc
#import "RCTWebView.h"
#import <react/renderer/components/AppSpec/ComponentDescriptors.h>
#import <react/renderer/components/AppSpec/EventEmitters.h>
#import <react/renderer/components/AppSpec/Props.h>
#import <react/renderer/components/AppSpec/RCTComponentViewHelpers.h>
#import <WebKit/WebKit.h>

using namespace facebook::react;

@interface RCTWebView () <RCTCustomWebViewViewProtocol, WKNavigationDelegate>
@end

@implementation RCTWebView {
    NSURL *_sourceURL;
    WKWebView *_webView;
}

- (instancetype)init {
    if (self = [super init]) {
        _webView = [WKWebView new];
        _webView.navigationDelegate = self;
        [self addSubview:_webView];
    }
    return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
    const auto &oldViewProps = *std::static_pointer_cast<CustomWebViewProps const>(_props);
    const auto &newViewProps = *std::static_pointer_cast<CustomWebViewProps const>(props);

    if (oldViewProps.sourceURL != newViewProps.sourceURL) {
        NSString *urlString = [NSString stringWithCString:newViewProps.sourceURL.c_str()
                                                 encoding:NSUTF8StringEncoding];
        _sourceURL = [NSURL URLWithString:urlString];
        if ([self urlIsValid:newViewProps.sourceURL]) {
            [_webView loadRequest:[NSURLRequest requestWithURL:_sourceURL]];
        }
    }
    [super updateProps:props oldProps:oldProps];
}

- (void)layoutSubviews {
    [super layoutSubviews];
    _webView.frame = self.bounds;
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    CustomWebViewEventEmitter::OnScriptLoaded result = {
        CustomWebViewEventEmitter::OnScriptLoadedResult::Success
    };
    self.eventEmitter.onScriptLoaded(result);
}

- (BOOL)urlIsValid:(std::string)propString {
    if (propString.length() > 0 && !_sourceURL) {
        CustomWebViewEventEmitter::OnScriptLoaded result = {
            CustomWebViewEventEmitter::OnScriptLoadedResult::Error
        };
        self.eventEmitter.onScriptLoaded(result);
        return NO;
    }
    return YES;
}

- (const CustomWebViewEventEmitter &)eventEmitter {
    return static_cast<const CustomWebViewEventEmitter &>(*_eventEmitter);
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
    return concreteComponentDescriptorProvider<CustomWebViewComponentDescriptor>();
}

@end
```

**Thêm WebKit framework trong Xcode:**
> Target → General → Frameworks, Libraries → `+` → tìm `WebKit` → Add

---

## Bước 5 — Sử dụng trong JS

```tsx
import WebView from './specs/WebViewNativeComponent';

<WebView
    sourceURL="https://react.dev/"
    style={{flex: 1}}
    onScriptLoaded={e => console.log(e.nativeEvent.result)}
/>
```

---

## So sánh với Legacy

| | Legacy Component | Fabric Component |
|---|---|---|
| Base class (Android) | `SimpleViewManager` | `SimpleViewManager` + `CustomWebViewManagerInterface` |
| Base class (iOS) | `RCTViewManager` | `RCTViewComponentView` |
| Props (iOS) | `RCT_EXPORT_VIEW_PROPERTY` | `updateProps:oldProps:` |
| Events (iOS) | `RCTBubblingEventBlock` | `eventEmitter.onXxx()` |
| Package | `ReactPackage` | `BaseReactPackage` |
| Delegate | — | `CustomWebViewManagerDelegate` (CodeGen) |

---

## Quy tắc Fabric Component

- Tên trong `codegenNativeComponent('CustomWebView')` phải khớp `REACT_CLASS` (Android) và key trong `componentProvider` (iOS).
- iOS: file implementation phải là `.mm` (Objective-C++).
- Prop event handler phải có tiền tố `on` trong cả TypeScript spec và native.
- `componentDescriptorProvider` là bắt buộc trong iOS implementation.
- Thêm `style={{flex: 1}}` trong JS nếu component không hiển thị (kích thước mặc định là 0).
