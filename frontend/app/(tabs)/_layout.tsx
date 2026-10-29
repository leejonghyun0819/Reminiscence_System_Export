// frontend/app/(tabs)/_layout.tsx
import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Platform.OS === 'web' ? Colors[colorScheme].tint : '#075985',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarActiveBackgroundColor: '#2F95DC',
                headerShown: false,
                sceneStyle: { backgroundColor: '#F8FAFC' },
                tabBarStyle:
                    Platform.OS === 'web'
                        ? { display: 'none' }
                        : {
                              position: 'absolute',
                              left: 16,
                              right: 16,
                              bottom: Math.max(insets.bottom, 12),
                              height: 72,
                              paddingTop: 0,
                              paddingBottom: 0,
                              borderTopWidth: 0,
                              borderRadius: 24,
                              backgroundColor: '#FFFFFF',
                              shadowColor: '#213852',
                              shadowOffset: { width: 0, height: -4 },
                              shadowOpacity: 0.1,
                              shadowRadius: 8,
                              elevation: 8,
                          },
                tabBarItemStyle:
                    Platform.OS === 'web'
                        ? undefined
                        : {
                              height: 56,
                              marginVertical: 8,
                              marginHorizontal: 3,
                              borderRadius: 18,
                          },
                tabBarLabelStyle: {
                    fontSize: 10,
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
