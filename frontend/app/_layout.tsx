// frontend/app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { MemoryProvider } from '../context/MemoryContext';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
    useEffect(() => {
        // 🌟 웹 브라우저 새로고침 시 무조건 메인 탭(index) 화면으로 리셋
        if (Platform.OS === 'web') {
            document.title = 'Memory-Tracer';
        }
    }, []);

    return (
        <MemoryProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
        </MemoryProvider>
    );
}
