import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MobileSafeAreaViewProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

const IOS_DYNAMIC_ISLAND_FALLBACK = 56;

export function MobileSafeAreaView({ children, style }: MobileSafeAreaViewProps) {
    const insets = useSafeAreaInsets();
    const topInset =
        Platform.OS === 'ios'
            ? Math.max(insets.top, IOS_DYNAMIC_ISLAND_FALLBACK)
            : Math.max(insets.top, 0);

    return <View style={[styles.container, { paddingTop: topInset }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
});
