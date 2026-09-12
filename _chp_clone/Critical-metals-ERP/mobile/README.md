# Battery ERP Mobile App

Native mobile application for Battery ERP with offline support and push notifications.

## Features

### ✅ Implemented (Q2 2026)

- **Offline Mode**
  - Queue actions when offline
  - Auto-sync when connection restored
  - Local data caching
  - Conflict resolution

- **Push Notifications**
  - Work order updates
  - Low stock alerts
  - Compliance alerts
  - Scheduled reminders

- **Mobile Features**
  - Barcode scanning (camera)
  - Touch-optimized UI
  - Native navigation
  - Background sync

## Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode 15+ (for simulator)
- Android: Android Studio (for emulator)

### Installation

```bash
cd mobile

# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Project Structure

```
mobile/
├── app/                    # App screens (Expo Router)
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home/Dashboard
│   ├── work-orders/       # Work order screens
│   ├── inventory/         # Inventory screens
│   └── settings/          # Settings screens
├── components/             # Reusable components
├── services/
│   ├── offlineSync.ts     # Offline synchronization
│   └── pushNotifications.ts # Push notifications
├── hooks/                  # Custom React hooks
├── utils/                  # Utility functions
└── assets/                 # Images, fonts, etc.
```

## Offline Mode

### How It Works

1. **Online**: Actions sync immediately to server
2. **Offline**: Actions queued in local storage
3. **Reconnected**: Queued actions automatically synced

### Example Usage

```typescript
import { offlineSync } from './services/offlineSync';

// Check connection status
const isOnline = await offlineSync.checkConnection();

// Subscribe to connection changes
offlineSync.subscribe((online) => {
  console.log('Connection status:', online);
});

// Queue an action (auto-syncs when online)
await offlineSync.queueAction({
  type: 'create',
  endpoint: '/api/work-orders',
  data: { item: 'Battery Pack', qty: 10 }
});

// Get sync stats
const stats = await offlineSync.getStats();
console.log(`Queue: ${stats.queueLength}, Last sync: ${stats.lastSync}`);
```

## Push Notifications

### Setup

1. **Configure in app.json**:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#4CAF50",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

2. **Initialize in app**:
```typescript
import { pushNotifications } from './services/pushNotifications';

// In App.tsx or _layout.tsx
useEffect(() => {
  pushNotifications.initialize();
  
  return () => pushNotifications.destroy();
}, []);
```

### Send Notification

```typescript
import { pushNotifications } from './services/pushNotifications';

// Send immediately
await pushNotifications.sendNotification({
  title: 'Low Stock Alert',
  body: 'Cobalt Sulfate is below reorder point',
  data: { type: 'inventory_low', itemId: 'COB-001' },
  priority: 'high'
});

// Schedule for later
await pushNotifications.scheduleNotification(
  {
    title: 'Daily Report',
    body: 'Your daily production report is ready'
  },
  new Date('2024-05-01T09:00:00Z')
);

// Recurring notification
await pushNotifications.scheduleRecurringNotification(
  {
    title: 'Shift Reminder',
    body: 'Don\'t forget to log end-of-shift data'
  },
  { hour: 17, minute: 0, weekday: 1 } // Monday at 5 PM
);
```

## Barcode Scanning

```typescript
import { Camera } from 'expo-camera';

function BarcodeScanner() {
  const [hasPermission, setHasPermission] = useState(null);
  
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);
  
  const handleBarCodeScanned = ({ type, data }) => {
    console.log('Scanned:', type, data);
    // Process barcode
  };
  
  return (
    <Camera
      style={{ flex: 1 }}
      onBarCodeScanned={handleBarCodeScanned}
      barCodeTypes={[Camera.Constants.BarCodeType.qr, Camera.Constants.BarCodeType.code128]}
    />
  );
}
```

## Configuration

### Environment Variables

Create `.env` file:

```bash
EXPO_PUBLIC_API_URL=https://your-battery-erp.com
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

### app.json Configuration

```json
{
  "expo": {
    "name": "Battery ERP",
    "slug": "battery-erp",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#4CAF50"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.batteryrecycling.erp",
      "buildNumber": "1",
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#4CAF50"
      },
      "package": "com.batteryrecycling.erp",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "NOTIFICATIONS"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#4CAF50"
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Allow Battery ERP to access your camera for barcode scanning."
        }
      ]
    ]
  }
}
```

## Testing

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
# Install Detox
npm install -g detox-cli

# Run tests
detox test --configuration ios.sim.debug
detox test --configuration android.emu.debug
```

## Deployment

### OTA Updates

```bash
# Install EAS Update
npm install -g eas-cli

# Configure
eas update:configure

# Publish update
eas update --branch production --message "Bug fixes"
```

### Store Submission

```bash
# iOS
eas build --platform ios --profile production
eas submit --platform ios --latest

# Android
eas build --platform android --profile production
eas submit --platform android --latest
```

## Troubleshooting

### Offline Mode Issues

```typescript
// Clear sync queue
await offlineSync.clearQueue();

// Force sync
await offlineSync.sync();

// Check stats
const stats = await offlineSync.getStats();
console.log(stats);
```

### Push Notification Issues

```typescript
// Check permission
const status = await pushNotifications.getPermissionStatus();
console.log('Permission:', status);

// Open settings if denied
if (status === 'denied') {
  await pushNotifications.openSettings();
}

// Cancel all notifications
await pushNotifications.cancelAllNotifications();
```

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Expo Router](https://expo.github.io/router/docs/)
- [Push Notifications](https://docs.expo.dev/push-notifications/overview/)

---

**Built with Expo & React Native**
