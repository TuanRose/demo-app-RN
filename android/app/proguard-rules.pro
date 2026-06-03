# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# WHY: React Native JSI bridge dùng reflection để tìm native method theo tên.
# R8 sẽ rename/remove những class này nếu không có keep rule → crash lúc runtime.
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# WHY: react-native-config đọc BuildConfig field theo tên ở runtime.
# Nếu R8 obfuscate field name → Config.API_BASE_URL trả về null.
-keep class com.demo_app.BuildConfig { *; }

# WHY: mapping.txt cho phép Firebase Crashlytics de-obfuscate stack trace.
# Không cần rule gì thêm — Crashlytics Gradle plugin tự upload mapping.txt sau mỗi release build.
# Ghi chú này để nhắc: nếu stack trace trên Crashlytics bị obfuscate, kiểm tra plugin đã được apply chưa.
