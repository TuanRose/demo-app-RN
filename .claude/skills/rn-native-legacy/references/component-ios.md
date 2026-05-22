# Chunk: iOS Native UI Components

## Quy trình 5 bước

### Bước 1 — Tạo RCTViewManager

```objc
// RNTMapManager.m
#import <MapKit/MapKit.h>
#import <React/RCTViewManager.h>

@interface RNTMapManager : RCTViewManager
@end

@implementation RNTMapManager

RCT_EXPORT_MODULE(RNTMap)   // tên dùng trong requireNativeComponent('RNTMap')

- (UIView *)view {
    return [[MKMapView alloc] init];
}

@end
```

> **Không** set `frame` hay `backgroundColor` trong `-view` — React Native sẽ ghi đè theo JS layout.
> Dùng prefix 3 chữ (không phải `RCT`) để tránh đụng với framework.

---

### Bước 2 — Expose props

**Props đơn giản** (tự động chuyển đổi kiểu):
```objc
RCT_EXPORT_VIEW_PROPERTY(zoomEnabled, BOOL)
```

**Props phức tạp** (cần custom conversion):
```objc
RCT_CUSTOM_VIEW_PROPERTY(region, MKCoordinateRegion, MKMapView) {
    [view setRegion:json ? [RCTConvert MKCoordinateRegion:json] : defaultView.region animated:YES];
}
```

Tạo category `RCTConvert` để convert kiểu custom:
```objc
// RCTConvert+Mapkit.m
@implementation RCTConvert (MapKit)

+ (MKCoordinateSpan)MKCoordinateSpan:(id)json {
    json = [self NSDictionary:json];
    return (MKCoordinateSpan){
        [self CLLocationDegrees:json[@"latitudeDelta"]],
        [self CLLocationDegrees:json[@"longitudeDelta"]]
    };
}

+ (MKCoordinateRegion)MKCoordinateRegion:(id)json {
    return (MKCoordinateRegion){
        [self CLLocationCoordinate2D:json],
        [self MKCoordinateSpan:json]
    };
}

@end
```

**Bảng kiểu dữ liệu `RCT_EXPORT_VIEW_PROPERTY`:**

| Objective-C | JavaScript |
|-------------|-----------|
| `BOOL` | `boolean` |
| `double` | `number` |
| `NSString *` | `string` |
| `NSArray *` | `Array` |
| `NSDictionary *` | `Object` |
| `RCTBubblingEventBlock` | `Function` (event handler) |

---

### Bước 3 — Xử lý Events (native → JS)

Phải tạo subclass của native view để thêm event block property:

**RNTMapView.h:**
```objc
#import <MapKit/MapKit.h>
#import <React/RCTComponent.h>

@interface RNTMapView : MKMapView
@property (nonatomic, copy) RCTBubblingEventBlock onRegionChange;  // phải có tiền tố "on"
@end
```

**RNTMapManager.m** (cập nhật manager để handle event):
```objc
#import "RNTMapView.h"

@interface RNTMapManager : RCTViewManager <MKMapViewDelegate>
@end

@implementation RNTMapManager

RCT_EXPORT_MODULE()
RCT_EXPORT_VIEW_PROPERTY(zoomEnabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onRegionChange, RCTBubblingEventBlock)

- (UIView *)view {
    RNTMapView *map = [RNTMapView new];
    map.delegate = self;
    return map;
}

- (void)mapView:(RNTMapView *)mapView regionDidChangeAnimated:(BOOL)animated {
    if (!mapView.onRegionChange) return;
    MKCoordinateRegion region = mapView.region;
    mapView.onRegionChange(@{
        @"region": @{
            @"latitude":      @(region.center.latitude),
            @"longitude":     @(region.center.longitude),
            @"latitudeDelta": @(region.span.latitudeDelta),
            @"longitudeDelta":@(region.span.longitudeDelta),
        }
    });
}

@end
```

**JS nhận event:**
```tsx
type RegionChangeEvent = {
    nativeEvent: {
        region: {latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number};
    };
};

<MapView
    onRegionChange={(e: RegionChangeEvent) => console.log(e.nativeEvent.region)}
/>
```

---

### Bước 4 — Native Commands (gọi phương thức native từ JS)

Dùng khi cần gọi một hành động lên một instance cụ thể của native view.

**Manager (Objective-C):**
```objc
// RNCMyNativeViewManager.m
RCT_EXPORT_METHOD(callNativeMethod:(nonnull NSNumber *)reactTag) {
    [self.bridge.uiManager addUIBlock:^(RCTUIManager *uiManager,
        NSDictionary<NSNumber *, UIView *> *viewRegistry) {
        NativeView *view = viewRegistry[reactTag];
        if (!view || ![view isKindOfClass:[NativeView class]]) {
            RCTLogError(@"Cannot find NativeView with tag #%@", reactTag);
            return;
        }
        [view callNativeMethod];
    }];
}
```

**JS:**
```tsx
import {UIManager, findNodeHandle} from 'react-native';

const viewRef = useRef(null);

const triggerNativeMethod = () => {
    UIManager.dispatchViewManagerCommand(
        findNodeHandle(viewRef.current),
        UIManager.getViewManagerConfig('RNCMyNativeView').Commands.callNativeMethod,
        [],
    );
};

return <RNCMyNativeView ref={viewRef} />;
```

---

### Bước 5 — JS Wrapper

```typescript
// MapView.tsx
import {requireNativeComponent, ViewStyle} from 'react-native';

type MapViewProps = {
    style?: ViewStyle;
    zoomEnabled?: boolean;
    region?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    onRegionChange?: (event: {nativeEvent: {region: object}}) => void;
};

const RNTMap = requireNativeComponent<MapViewProps>('RNTMap');

export default function MapView(props: MapViewProps) {
    return <RNTMap {...props} />;
}
```

**Sử dụng:**
```tsx
<MapView
    style={{flex: 1}}
    zoomEnabled={false}
    region={{latitude: 37.48, longitude: -122.16, latitudeDelta: 0.1, longitudeDelta: 0.1}}
    onRegionChange={e => console.log(e.nativeEvent.region)}
/>
```

---

## Xuất Constants từ Native

```objc
- (NSDictionary *)constantsToExport {
    UIDatePicker *dp = [[UIDatePicker alloc] init];
    [dp layoutIfNeeded];
    return @{
        @"ComponentHeight": @(CGRectGetHeight(dp.frame)),
        @"ComponentWidth":  @(CGRectGetWidth(dp.frame)),
    };
}
```

Truy cập trong JS:
```tsx
const consts = UIManager.RCTDatePicker.Constants;
// dùng consts.ComponentHeight, consts.ComponentWidth
```

---

## Quy tắc iOS

- Tên module từ `RCT_EXPORT_MODULE(RNTMap)` phải khớp với `requireNativeComponent('RNTMap')` ở JS.
- `RCT_EXPORT_MODULE()` không tham số → tên JS là tên class bỏ tiền tố `RCT`.
- Event handler property **bắt buộc** có tiền tố `on` (e.g. `onRegionChange`, `onPress`).
- Cần `pod install` sau khi thêm file native mới.
- Thêm `style={{flex: 1}}` trong JS nếu component không hiện ra (kích thước mặc định là 0).
