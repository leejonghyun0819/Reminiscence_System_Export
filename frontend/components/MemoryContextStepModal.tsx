import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { memoryColors, memoryFontFamily, memoryLayout } from '../constants/memoryTheme';
import {
    MemoryContextData,
    MemoryOwner,
    MemoryPurpose,
    MEMORY_OWNER_LABELS,
    MEMORY_PURPOSE_LABELS,
} from '../types/memoryContext';
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

const CLUE_STEP_COUNT = 6;
const MEMORY_OWNERS: MemoryOwner[] = ['self', 'family', 'unknown'];
const MEMORY_PURPOSES: MemoryPurpose[] = ['personal_record', 'family_archive', 'gift', 'organize'];

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
    const isMobileWizard = Platform.OS !== 'web';
    const [clueStep, setClueStep] = useState(0);

    useEffect(() => {
        if (visible) setClueStep(0);
    }, [visible]);

    const updateField = <Key extends keyof MemoryContextData>(key: Key, fieldValue: MemoryContextData[Key]) => {
        onChange({ ...value, [key]: fieldValue });
    };

    const moveToPreviousStep = () => {
        if (clueStep === 0) onBack();
        else setClueStep((previous) => previous - 1);
    };

    const moveToNextStep = () => {
        if (clueStep >= CLUE_STEP_COUNT - 1) onSubmit();
        else setClueStep((previous) => previous + 1);
    };

    const renderMobileClueStep = () => {
        if (clueStep === 0) {
            return (
                <>
                    <Text style={styles.wizardQuestion}>누구의 기억인가요?</Text>
                    <Text style={styles.wizardGuide}>사진과 이야기를 가장 잘 설명하는 주인을 선택해주세요.</Text>
                    <View style={styles.wizardOptionList}>
                        {MEMORY_OWNERS.map((owner) => {
                            const selected = value.memoryOwner === owner;
                            return (
                                <TouchableOpacity
                                    key={owner}
                                    style={[styles.wizardOption, selected && styles.wizardOptionSelected]}
                                    onPress={() => updateField('memoryOwner', owner)}
                                    disabled={isProcessing}
                                >
                                    <Text
                                        style={[
                                            styles.wizardOptionText,
                                            selected && styles.wizardOptionTextSelected,
                                        ]}
                                    >
                                        {MEMORY_OWNER_LABELS[owner]}
                                    </Text>
                                    <Text style={styles.wizardOptionCheck}>{selected ? '✓' : ''}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </>
            );
        }

        if (clueStep === 1) {
            return (
                <>
                    <Text style={styles.wizardQuestion}>이 노트를 만드는 목적은 무엇인가요?</Text>
                    <Text style={styles.wizardGuide}>목적에 맞춰 인터뷰와 최종 노트의 말투를 조정합니다.</Text>
                    <View style={styles.wizardOptionList}>
                        {MEMORY_PURPOSES.map((purpose) => {
                            const selected = value.purpose === purpose;
                            return (
                                <TouchableOpacity
                                    key={purpose}
                                    style={[styles.wizardOption, selected && styles.wizardOptionSelected]}
                                    onPress={() => updateField('purpose', purpose)}
                                    disabled={isProcessing}
                                >
                                    <Text
                                        style={[
                                            styles.wizardOptionText,
                                            selected && styles.wizardOptionTextSelected,
                                        ]}
                                    >
                                        {MEMORY_PURPOSE_LABELS[purpose]}
                                    </Text>
                                    <Text style={styles.wizardOptionCheck}>{selected ? '✓' : ''}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </>
            );
        }

        const inputSteps = [
            {
                key: 'approximateTime' as const,
                question: '이 사진들은 언제쯤의 기억인가요?',
                guide: '정확하지 않아도 괜찮아요. 계절이나 학창 시절처럼 적어도 됩니다.',
                placeholder: '예: 2018년 여름, 초등학교 저학년 무렵',
                maxLength: 120,
                multiline: false,
            },
            {
                key: 'placeHint' as const,
                question: '어디에서 있었던 일인가요?',
                guide: '도시, 여행지, 집처럼 기억나는 범위까지만 알려주세요.',
                placeholder: '예: 스페인 말라가, 할머니 집 마당',
                maxLength: 160,
                multiline: false,
            },
            {
                key: 'peopleHint' as const,
                question: '누구와 함께 있었나요?',
                guide: '사진 속 인물이나 사진을 찍어준 사람도 함께 적을 수 있어요.',
                placeholder: '예: 어머니와 동생, 대학 친구 두 명',
                maxLength: 240,
                multiline: false,
            },
            {
                key: 'additionalContext' as const,
                question: '이 사진을 고른 이유나 기억나는 사건이 있나요?',
                guide: '이 단서를 바탕으로 사진만으로는 알 수 없는 인터뷰 질문을 만듭니다.',
                placeholder: '예: 항구에서 길을 잃었던 일이 기억나요.',
                maxLength: 1200,
                multiline: true,
            },
        ];
        const currentInput = inputSteps[clueStep - 2];

        return (
            <>
                <Text style={styles.wizardQuestion}>{currentInput.question}</Text>
                <Text style={styles.wizardGuide}>{currentInput.guide}</Text>
                <TextInput
                    style={[styles.wizardInput, currentInput.multiline && styles.wizardInputMultiline]}
                    value={value[currentInput.key] || ''}
                    onChangeText={(text) => updateField(currentInput.key, text)}
                    placeholder={currentInput.placeholder}
                    placeholderTextColor={memoryColors.textFaint}
                    maxLength={currentInput.maxLength}
                    multiline={currentInput.multiline}
                    textAlignVertical={currentInput.multiline ? 'top' : 'center'}
                    editable={!isProcessing}
                    returnKeyType={currentInput.multiline ? 'default' : 'next'}
                    onSubmitEditing={currentInput.multiline ? undefined : moveToNextStep}
                />
                <Text style={styles.optionalText}>기억나지 않으면 비워두고 다음으로 넘어가도 괜찮아요.</Text>
            </>
        );
    };

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
                            <Text style={styles.stepBadgeText}>
                                {isMobileWizard
                                    ? `기억 단서 ${clueStep + 1} / ${CLUE_STEP_COUNT}`
                                    : '2단계 · 기억 단서'}
                            </Text>
                        </View>
                    </View>

                    {isMobileWizard ? (
                        <View style={styles.wizardBody}>
                            <View style={styles.progressTrack}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${((clueStep + 1) / CLUE_STEP_COUNT) * 100}%` },
                                    ]}
                                />
                            </View>

                            <View style={styles.photoSummaryRow}>
                                {imageUrls[0] ? (
                                    <Image source={{ uri: imageUrls[0] }} style={styles.photoSummaryImage} />
                                ) : null}
                                <View style={styles.photoSummaryCopy}>
                                    <Text style={styles.eyebrow}>
                                        {isReanalysis ? '기억 단서 다시 작성' : `${imageUrls.length}장 선택 완료`}
                                    </Text>
                                    <Text style={styles.photoSummaryText} numberOfLines={2}>
                                        입력한 사실을 우선 반영해 다음 인터뷰 질문을 만듭니다.
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.wizardCard}>{renderMobileClueStep()}</View>
                        </View>
                    ) : (
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
                                />
                            </View>
                        </ScrollView>
                    )}

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={isMobileWizard ? moveToPreviousStep : onBack}
                            disabled={isProcessing}
                        >
                            <Text style={styles.secondaryButtonText}>
                                {isMobileWizard && clueStep === 0 ? '사진으로' : '이전'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.primaryButton,
                                isMobileWizard && styles.primaryButtonMobile,
                                isProcessing && styles.primaryButtonDisabled,
                            ]}
                            onPress={isMobileWizard ? moveToNextStep : onSubmit}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <View style={styles.loadingRow}>
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                    <Text style={styles.primaryButtonText}>{statusMessage || '인터뷰 준비 중...'}</Text>
                                </View>
                            ) : (
                                <Text style={styles.primaryButtonText}>
                                    {isMobileWizard && clueStep < CLUE_STEP_COUNT - 1
                                        ? '다음'
                                        : isReanalysis
                                          ? '단서를 반영해 인터뷰 다시 만들기'
                                          : '단서를 반영해 인터뷰 생성'}
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
    wizardBody: {
        flex: 1,
        width: '100%',
        paddingHorizontal: memoryLayout.mobilePadding,
        paddingTop: 14,
        paddingBottom: 12,
    },
    progressTrack: {
        width: '100%',
        height: 5,
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: memoryColors.border,
        marginBottom: 14,
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: memoryColors.brand,
    },
    photoSummaryRow: {
        minHeight: 74,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
        padding: 10,
        borderRadius: 14,
        backgroundColor: memoryColors.brandLight,
    },
    photoSummaryImage: {
        width: 54,
        height: 54,
        borderRadius: 10,
        backgroundColor: memoryColors.subtle,
    },
    photoSummaryCopy: { flex: 1, minWidth: 0 },
    photoSummaryText: {
        color: memoryColors.textMuted,
        fontSize: 12,
        lineHeight: 18,
        fontFamily: memoryFontFamily,
    },
    wizardCard: {
        flex: 1,
        minHeight: 0,
        padding: 20,
        borderWidth: 1,
        borderColor: memoryColors.border,
        borderRadius: 18,
        backgroundColor: memoryColors.surface,
        justifyContent: 'center',
    },
    wizardQuestion: {
        color: memoryColors.text,
        fontSize: 22,
        lineHeight: 32,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
    wizardGuide: {
        color: memoryColors.textMuted,
        fontSize: 13,
        lineHeight: 20,
        marginTop: 7,
        marginBottom: 18,
        fontFamily: memoryFontFamily,
    },
    wizardOptionList: { gap: 10 },
    wizardOption: {
        minHeight: 50,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: memoryColors.border,
        borderRadius: 12,
        backgroundColor: memoryColors.surface,
    },
    wizardOptionSelected: {
        borderColor: memoryColors.brand,
        backgroundColor: memoryColors.brandLight,
    },
    wizardOptionText: {
        color: memoryColors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: memoryFontFamily,
    },
    wizardOptionTextSelected: { color: memoryColors.brand, fontWeight: '700' },
    wizardOptionCheck: { color: memoryColors.brand, fontSize: 16, fontWeight: '800' },
    wizardInput: {
        width: '100%',
        minHeight: 56,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: memoryColors.brandBorder,
        borderRadius: 12,
        backgroundColor: memoryColors.surface,
        color: memoryColors.text,
        fontSize: 15,
        lineHeight: 22,
        fontFamily: memoryFontFamily,
    },
    wizardInputMultiline: { minHeight: 130, maxHeight: 170 },
    optionalText: {
        color: memoryColors.textFaint,
        fontSize: 11,
        lineHeight: 17,
        marginTop: 9,
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
    primaryButtonMobile: { minWidth: 0, flex: 1 },
    primaryButtonDisabled: { opacity: 0.7 },
    primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
