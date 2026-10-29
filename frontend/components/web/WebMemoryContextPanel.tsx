import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { memoryColors, memoryFontFamily } from '../../constants/memoryTheme';
import { MemoryContextData } from '../../types/memoryContext';
import { MemoryContextForm } from '../MemoryContextForm';

interface WebMemoryContextPanelProps {
    value: MemoryContextData;
    onChange: (value: MemoryContextData) => void;
    selectedImageCount: number;
    isProcessing: boolean;
    statusMessage?: string;
    isReanalysis: boolean;
    onSubmit: () => void;
    onCancelReanalysis?: () => void;
}

export function WebMemoryContextPanel({
    value,
    onChange,
    selectedImageCount,
    isProcessing,
    statusMessage = '',
    isReanalysis,
    onSubmit,
    onCancelReanalysis,
}: WebMemoryContextPanelProps) {
    const disabled = isProcessing || selectedImageCount === 0;

    return (
        <View style={styles.card}>
            <MemoryContextForm value={value} onChange={onChange} disabled={isProcessing} />

            <View style={styles.guideBox}>
                <Text style={styles.guideTitle}>입력한 단서를 먼저 반영합니다</Text>
                <Text style={styles.guideText}>
                    이미 알려준 내용은 다시 묻지 않고, 사진에서 확인이 필요한 장면을 중심으로 인터뷰를 만듭니다.
                </Text>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.submitButton, disabled && styles.submitButtonDisabled]}
                    onPress={onSubmit}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityState={{ disabled }}
                >
                    {isProcessing ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color="#FFFFFF" size="small" />
                            <Text style={styles.submitButtonText}>{statusMessage || '사진과 단서를 분석 중입니다...'}</Text>
                        </View>
                    ) : (
                        <Text style={styles.submitButtonText}>
                            {isReanalysis
                                ? '기억 단서를 반영해 인터뷰 다시 만들기'
                                : selectedImageCount > 0
                                  ? `${selectedImageCount}장의 사진으로 인터뷰 만들기`
                                  : '사진을 선택하면 인터뷰를 만들 수 있어요'}
                        </Text>
                    )}
                </TouchableOpacity>

                {isReanalysis && onCancelReanalysis ? (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onCancelReanalysis}
                        disabled={isProcessing}
                        accessibilityRole="button"
                    >
                        <Text style={styles.cancelButtonText}>재분석 취소</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: memoryColors.border,
        backgroundColor: memoryColors.surface,
    },
    guideBox: {
        marginTop: 4,
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: memoryColors.brandBorder,
        backgroundColor: memoryColors.brandLight,
    },
    guideTitle: {
        color: memoryColors.brandDark,
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
    guideText: {
        marginTop: 3,
        color: memoryColors.textSecondary,
        fontSize: 12,
        lineHeight: 19,
        fontFamily: memoryFontFamily,
    },
    actionRow: {
        marginTop: 18,
        paddingTop: 18,
        borderTopWidth: 1,
        borderTopColor: memoryColors.border,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
    },
    submitButton: {
        minHeight: 48,
        flexGrow: 1,
        minWidth: 320,
        paddingHorizontal: 20,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: memoryColors.brand,
    },
    submitButtonDisabled: { backgroundColor: memoryColors.textFaint },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
        textAlign: 'center',
    },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cancelButton: {
        minHeight: 48,
        paddingHorizontal: 18,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: memoryColors.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: memoryColors.surface,
    },
    cancelButtonText: {
        color: memoryColors.textSecondary,
        fontSize: 13,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
});
