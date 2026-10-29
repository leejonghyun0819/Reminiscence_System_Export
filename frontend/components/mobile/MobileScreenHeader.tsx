import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { memoryColors, memoryFontFamily } from '../../constants/memoryTheme';

interface MobileScreenHeaderProps {
    subtitle: string;
    sectionTitle: string;
    archiveActive?: boolean;
    rightLabel?: string;
    onRightPress?: () => void;
}

export function MobileScreenHeader({
    subtitle,
    sectionTitle,
    archiveActive = false,
    rightLabel = '보관함',
    onRightPress,
}: MobileScreenHeaderProps) {
    const router = useRouter();

    const handleRightPress = () => {
        if (onRightPress) {
            onRightPress();
            return;
        }
        if (!archiveActive) router.push('/(tabs)/backup');
    };

    return (
        <View style={styles.wrapper}>
            <View style={styles.headerCard}>
                <View style={styles.brandArea}>
                    <Text style={styles.menuIcon}>☰</Text>
                    <View style={styles.brandCopy}>
                        <Text style={styles.brandTitle}>추억 노트</Text>
                        <Text style={styles.brandSubtitle}>{subtitle}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.archiveButton}
                    onPress={handleRightPress}
                    disabled={archiveActive && !onRightPress}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityLabel={rightLabel}
                >
                    <Text style={styles.archiveButtonText}>{rightLabel}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.sectionBar}>
                <Text style={styles.sectionTitle} numberOfLines={1}>
                    {sectionTitle}
                </Text>
                <Text style={styles.chevron}>⌄</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 16,
        paddingTop: 2,
        paddingBottom: 12,
        gap: 8,
        backgroundColor: memoryColors.canvas,
    },
    headerCard: {
        height: 68,
        paddingHorizontal: 16,
        borderRadius: 24,
        backgroundColor: memoryColors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#213852',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    brandArea: {
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    menuIcon: {
        width: 26,
        color: memoryColors.text,
        fontSize: 22,
        lineHeight: 30,
        fontWeight: '500',
        fontFamily: memoryFontFamily,
    },
    brandCopy: { width: 175, minWidth: 0 },
    brandTitle: {
        color: memoryColors.text,
        fontSize: 16,
        lineHeight: 23,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
    brandSubtitle: {
        color: memoryColors.textSecondary,
        fontSize: 10,
        lineHeight: 15,
        fontFamily: memoryFontFamily,
    },
    archiveButton: {
        width: 78,
        height: 36,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: memoryColors.subtle,
    },
    archiveButtonText: {
        color: memoryColors.textSecondary,
        fontSize: 11,
        lineHeight: 16,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
    sectionBar: {
        height: 52,
        borderRadius: 16,
        paddingHorizontal: 16,
        backgroundColor: memoryColors.brandTint,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionTitle: {
        flex: 1,
        color: memoryColors.text,
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
    chevron: {
        width: 24,
        color: memoryColors.brandDark,
        fontSize: 18,
        lineHeight: 26,
        fontWeight: '600',
        textAlign: 'right',
        fontFamily: memoryFontFamily,
    },
});
