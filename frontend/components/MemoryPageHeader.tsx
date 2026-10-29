import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { memoryColors, memoryFontFamily } from '../constants/memoryTheme';

interface MemoryPageHeaderProps {
    title: string;
    subtitle: string;
    children?: React.ReactNode;
    compact?: boolean;
}

export function MemoryPageHeader({ title, subtitle, children, compact = false }: MemoryPageHeaderProps) {
    return (
        <View style={[styles.container, compact && styles.containerCompact]}>
            <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
            <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingBottom: 24 },
    containerCompact: { paddingBottom: 18 },
    title: {
        color: memoryColors.text,
        fontSize: 28,
        lineHeight: 40,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
    titleCompact: { fontSize: 23, lineHeight: 32 },
    subtitle: {
        color: memoryColors.textMuted,
        fontSize: 14,
        lineHeight: 24,
        fontFamily: memoryFontFamily,
        marginTop: 2,
    },
    subtitleCompact: { fontSize: 13, lineHeight: 20, marginTop: 4 },
});
