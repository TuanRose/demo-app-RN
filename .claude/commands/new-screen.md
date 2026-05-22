---
description: Tạo demo screen mới trong một bài học. Dùng: /project:new-screen <đường-dẫn-folder> <TênScreen>
---

Tạo một demo screen trong folder bài học được chỉ định.

## Input

Từ `$ARGUMENTS`: `<đường-dẫn-folder> <TênScreen>`  
Ví dụ: `src/01_legacy_native_module HomeScreen`

## Quy trình

1. **Xác nhận folder tồn tại:**
   ```bash
   ls <đường-dẫn-folder>
   ```

2. **Tạo file screen** tại `<folder>/screens/<TênScreen>.tsx`:
   ```tsx
   import React from 'react';
   import { View, Text, StyleSheet } from 'react-native';

   interface Props {
     // Thêm props nếu cần
   }

   export default function <TênScreen>({}: Props) {
     return (
       <View style={styles.container}>
         <Text style={styles.title}><TênScreen></Text>
       </View>
     );
   }

   const styles = StyleSheet.create({
     container: {
       flex: 1,
       alignItems: 'center',
       justifyContent: 'center',
     },
     title: {
       fontSize: 20,
       fontWeight: 'bold',
     },
   });
   ```

3. **Tạo hoặc cập nhật** `<folder>/screens/index.ts`:
   ```ts
   export { default as <TênScreen> } from './<TênScreen>';
   ```

4. **Thông báo** đường dẫn file vừa tạo và gợi ý đăng ký trong navigator (nếu bài học có navigation).
