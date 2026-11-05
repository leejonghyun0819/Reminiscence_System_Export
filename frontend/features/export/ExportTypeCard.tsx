import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { memoryColors } from '../../constants/memoryTheme';
import { ExportKind } from './types';

interface Props {
    kind: ExportKind;
    icon: string;
    title: string;
    description: string;
    onPress: (kind: ExportKind) => void;
    disabled?: boolean;
}

export function ExportTypeCard({ kind, icon, title, description, onPress, disabled = false }: Props) {
    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${title} 내보내기`}
            style={[styles.card, disabled && styles.cardDisabled]}
            onPress={() => onPress(kind)}
            disabled={disabled}
        >
            <Text style={styles.icon}>{icon}</Text>
            <View style={styles.copy}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        minHeight: 92,
        borderWidth: 1,
        borderColor: memoryColors.border,
        borderRadius: 16,
        backgroundColor: memoryColors.surface,
        paddingHorizontal: 18,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    cardDisabled: { opacity: 0.45 },
    icon: { fontSize: 30 },
    copy: { flex: 1, gap: 5 },
    title: { fontSize: 17, fontWeight: '800', color: memoryColors.text },
    description: { fontSize: 13, lineHeight: 19, color: memoryColors.textMuted },
    arrow: { fontSize: 30, color: memoryColors.textFaint },
});
