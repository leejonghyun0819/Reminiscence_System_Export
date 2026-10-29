// frontend/app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { MemoryProvider } from '../context/MemoryContext';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
    useEffect(() => {
        // 🌟 웹 브라우저 새로고침 시 무조건 메인 탭(index) 화면으로 리셋
        if (Platform.OS === 'web') {
            document.title = 'Memory-Tracer';
        }
    }, []);

    return (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <MemoryProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
            </MemoryProvider>
        </SafeAreaProvider>
    );
}
