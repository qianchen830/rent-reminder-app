#!/bin/bash
# Must run AFTER `npx cap sync android`
# Patches the generated capacitor-cordova-android-plugins manifest for Android 12+ compatibility

MANIFEST="android/capacitor-cordova-android-plugins/src/main/AndroidManifest.xml"

if [ ! -f "$MANIFEST" ]; then
  echo "[patch] Manifest not found: $MANIFEST"
  exit 1
fi

# 1. Set correct JPUSH_APPKEY
sed -i 's|JPUSH_APPKEY.*value="undefined"|JPUSH_APPKEY" android:value="38c32db4df3d00fd135a10b5"|' "$MANIFEST"

# 2. Set android:exported="true" for all services and receivers (Android 12+ requirement)
sed -i 's|<service android:exported="false"|<service android:exported="true"|g' "$MANIFEST"
sed -i 's|<receiver android:exported="false"|<receiver android:exported="true"|g' "$MANIFEST"

# 3. Add android:exported to bare <service> tags (no exported attr at all)
# For each <service ...> that doesn't have android:exported, add it
python3 -c "
import re, sys
with open('$MANIFEST', 'r') as f:
    content = f.read()

# Patch <service ...> tags missing android:exported
def patch_service(m):
    attrs = m.group(1)
    if 'android:exported' in attrs:
        return m.group(0)
    return f'<service android:exported=\"true\"{attrs}>'

content = re.sub(r'<service([^>]*)>', patch_service, content)

# Patch <receiver ...> tags missing android:exported  
def patch_receiver(m):
    attrs = m.group(1)
    if 'android:exported' in attrs:
        return m.group(0)
    return f'<receiver android:exported=\"true\"{attrs}>'

content = re.sub(r'<receiver([^>]*)>', patch_receiver, content)

with open('$MANIFEST', 'w') as f:
    f.write(content)
print('[patch] Manifest patched successfully')
"

echo "[patch] Verifying JPUSH_APPKEY:"
grep JPUSH_APPKEY "$MANIFEST"
echo "[patch] Remaining exported=false count: $(grep -c 'exported=\"false\"' $MANIFEST || echo 0)"
