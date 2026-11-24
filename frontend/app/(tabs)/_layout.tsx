// frontend/app/(tabs)/_layout.tsx
import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();
    const nativeTabBarStyle =
        Platform.OS === 'android'
            ? {
                  height: 64 + insets.bottom,
                  paddingTop: 7,
                  paddingBottom: Math.max(insets.bottom, 8),
                  borderTopColor: '#E2E8F0',
                  backgroundColor: '#FFFFFF',
              }
            : {
                  height: 84,
                  paddingTop: 8,
                  paddingBottom: 12,
                  borderTopColor: '#E2E8F0',
                  backgroundColor: '#FFFFFF',
              };

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme].tint,
                tabBarInactiveTintColor: '#94A3B8',
                headerShown: false,
                sceneStyle: { backgroundColor: '#F8FAFC' },
                tabBarStyle:
                    Platform.OS === 'web'
                        ? { display: 'none' }
                        : nativeTabBarStyle,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '700',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: '추억 수집',
                    tabBarIcon: ({ color }) => (
                        <SymbolView
                            name={{
                                ios: 'photo.on.rectangle.angled',
                                android: 'photo_library',
                                web: 'photo_library',
                            }}
                            tintColor={color}
                            size={24}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="enhance"
                options={{
                    title: '화질 개선',
                    tabBarIcon: ({ color }) => (
                        <SymbolView
                            name={{
                                ios: 'wand.and.stars',
                                android: 'auto_fix_high',
                                web: 'auto_fix_high',
                            }}
                            tintColor={color}
                            size={24}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="generate"
                options={{
                    title: '노트 생성',
                    tabBarIcon: ({ color }) => (
                        <SymbolView
                            name={{
                                ios: 'square.and.pencil',
                                android: 'edit_note',
                                web: 'edit_note',
                            }}
                            tintColor={color}
                            size={24}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="backup"
                options={{
                    title: '보관함',
                    tabBarIcon: ({ color }) => (
                        <SymbolView
                            name={{
                                ios: 'archivebox',
                                android: 'inventory_2',
                                web: 'inventory_2',
                            }}
                            tintColor={color}
                            size={24}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
