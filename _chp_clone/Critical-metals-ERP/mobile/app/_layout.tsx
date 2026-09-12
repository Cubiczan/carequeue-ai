import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';

import { offlineSync } from '../services/offlineSync';
import { pushNotifications } from '../services/pushNotifications';

// Keep splash screen visible while we initialize
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    // Initialize app
    const initialize = async () => {
      try {
        // Initialize push notifications
        await pushNotifications.initialize();
        
        // Subscribe to offline status
        offlineSync.subscribe((online) => {
          console.log('📡 Online status:', online);
        });
        
        // Hide splash screen
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Initialization error:', error);
        await SplashScreen.hideAsync();
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      offlineSync.destroy();
      pushNotifications.destroy();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#4CAF50',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Battery ERP',
            headerShown: true 
          }} 
        />
        <Stack.Screen 
          name="work-orders/index" 
          options={{ 
            title: 'Work Orders' 
          }} 
        />
        <Stack.Screen 
          name="inventory/index" 
          options={{ 
            title: 'Inventory' 
          }} 
        />
        <Stack.Screen 
          name="scan/index" 
          options={{ 
            title: 'Scan Barcode' 
          }} 
        />
        <Stack.Screen 
          name="settings/index" 
          options={{ 
            title: 'Settings' 
          }} 
        />
      </Stack>
      <StatusBar style="light" />
    </QueryClientProvider>
  );
}
