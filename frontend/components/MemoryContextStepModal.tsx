import React from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { memoryColors, memoryFontFamily, memoryLayout } from '../constants/memoryTheme';
import { MemoryContextData } from '../types/memoryContext';
import { MemoryContextForm } from './MemoryContextForm';

interface MemoryContextStepModalProps {
    visible: boolean;
    imageUrls: string[];
    value: MemoryContextData;
    onChange: (nextValue: MemoryContextData) => void;
    onBack: () => void;
    onSubmit: () => void;
    isProcessing?: boolean;
    statusMessage?: string;
    isReanalysis?: boolean;
}

export function MemoryContextStepModal({
    visible,
    imageUrls,
    value,
    onChange,
    onBack,
    onSubmit,
    isProcessing = false,
    statusMessage = '',
    isReanalysis = false,
}: MemoryContextStepModalProps) {
    const insets = useSafeAreaInsets();
    const topInset = Platform.OS === 'ios' ? Math.max(insets.top, 56) : Math.max(insets.top, 0);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => {
                if (!isProcessing) onBack();
            }}
        >
            <KeyboardAvoidingView
                style={styles.screen}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={[styles.safeArea, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={onBack}
                            disabled={isProcessing}
                            accessibilityRole="button"
                            accessibilityLabel="사진 입력 화면으로 돌아가기"
                        >
                            <Text style={styles.backButtonText}>← 사진으로 돌아가기</Text>
                        </TouchableOpacity>
                        <View style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>2단계 · 기억 단서</Text>
                        </View>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.intro}>
                            <Text style={styles.eyebrow}>
                                {isReanalysis ? '기억 단서 다시 작성' : '사진 선택 완료'}
                            </Text>
                            <Text style={styles.title}>인터뷰 전에 기억의 방향을 알려주세요</Text>
                            <Text style={styles.description}>
                                {imageUrls.length}장의 사진과 아래 단서를 함께 분석해, 이미 알려준 사실은 되묻지 않고
                                사진별로 필요한 질문을 만듭니다.
                            </Text>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.photoStrip}
                            >
                                {imageUrls.map((imageUrl, index) => (
                                    <View key={`${imageUrl}-${index}`} style={styles.photoItem}>
                                        <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="cover" />
                                        <View style={styles.photoNumberBadge}>
                                            <Text style={styles.photoNumberText}>사진 {index + 1}</Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.formCard}>
                            <MemoryContextForm
                                value={value}
                                onChange={onChange}
                                disabled={isProcessing}
                                compact={Platform.OS !== 'web'}
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={onBack}
                            disabled={isProcessing}
                        >
                            <Text style={styles.secondaryButtonText}>이전</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.primaryButton, isProcessing && styles.primaryButtonDisabled]}
                            onPress={onSubmit}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <View style={styles.loadingRow}>
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                    <Text style={styles.primaryButtonText}>{statusMessage || '인터뷰 준비 중...'}</Text>
                                </View>
                            ) : (
                                <Text style={styles.primaryButtonText}>
                                    {isReanalysis ? '단서를 반영해 인터뷰 다시 만들기' : '단서를 반영해 인터뷰 생성'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: memoryColors.canvas },
    safeArea: { flex: 1, backgroundColor: memoryColors.canvas },
    header: {
        minHeight: 58,
        paddingHorizontal: memoryLayout.mobilePadding,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: memoryColors.border,
        backgroundColor: memoryColors.surface,
    },
    backButton: { minHeight: 44, justifyContent: 'center' },
    backButtonText: {
        color: memoryColors.textSecondary,
        fontSize: 13,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
    stepBadge: {
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: memoryColors.brandLight,
    },
    stepBadgeText: {
        color: memoryColors.brand,
        fontSize: 11,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
    scrollView: { flex: 1 },
    scrollContent: {
        width: '100%',
        maxWidth: 960,
        alignSelf: 'center',
        paddingHorizontal: memoryLayout.mobilePadding,
        paddingTop: 24,
        paddingBottom: 28,
        gap: 18,
    },
    intro: {
        backgroundColor: memoryColors.surface,
        borderWidth: 1,
        borderColor: memoryColors.border,
        borderRadius: 16,
        padding: 20,
    },
    eyebrow: {
        color: memoryColors.brand,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        fontFamily: memoryFontFamily,
    },
    title: {
        color: memoryColors.text,
        fontSize: 22,
        lineHeight: 32,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
    description: {
        color: memoryColors.textMuted,
        fontSize: 13,
        lineHeight: 21,
        marginTop: 7,
        fontFamily: memoryFontFamily,
    },
    photoStrip: { gap: 10, paddingTop: 18, paddingRight: 4 },
    photoItem: {
        width: 104,
        height: 104,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: memoryColors.subtle,
        borderWidth: 1,
        borderColor: memoryColors.border,
    },
    photo: { width: '100%', height: '100%' },
    photoNumberBadge: {
        position: 'absolute',
        left: 6,
        bottom: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
    },
    photoNumberText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
    formCard: {
        backgroundColor: memoryColors.surface,
        borderWidth: 1,
        borderColor: memoryColors.border,
        borderRadius: 16,
        padding: 20,
    },
    footer: {
        paddingHorizontal: memoryLayout.mobilePadding,
        paddingTop: 12,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: memoryColors.border,
        backgroundColor: memoryColors.surface,
    },
    secondaryButton: {
        minHeight: 48,
        paddingHorizontal: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: memoryColors.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: memoryColors.surface,
    },
    secondaryButtonText: { color: memoryColors.textSecondary, fontSize: 14, fontWeight: '700' },
    primaryButton: {
        minHeight: 48,
        minWidth: 230,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: memoryColors.brand,
    },
    primaryButtonDisabled: { opacity: 0.7 },
    primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
