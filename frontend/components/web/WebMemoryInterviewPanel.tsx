import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { memoryColors, memoryFontFamily } from '../../constants/memoryTheme';
import { InterviewQuestionItem } from '../../services/geminiService';
import { hasMeaningfulMemoryContext, MemoryContextData } from '../../types/memoryContext';

interface WebMemoryInterviewPanelProps {
    questions: InterviewQuestionItem[];
    imageUrls: string[];
    answers: Record<string, string>;
    extraStory: string;
    currentStep: number;
    isSubmitting: boolean;
    statusText?: string;
    memoryContext?: MemoryContextData;
    onAnswerChange: (questionId: string, value: string) => void;
    onOptionSelect: (questionId: string, option: string) => void;
    onExtraStoryChange: (value: string) => void;
    onPreviewPhoto: (photoIndex: number) => void;
    onPrevious: () => void;
    onNext: () => void;
}

function getValidPhotoIndexes(question: InterviewQuestionItem | null, imageUrls: string[]): number[] {
    if (!question) return imageUrls.map((_, index) => index + 1);

    const rawIndexes = Array.isArray(question.targetPhotoIndexes) ? question.targetPhotoIndexes : [];
    const validIndexes = Array.from(
        new Set(
            rawIndexes.filter(
                (photoIndex) => Number.isInteger(photoIndex) && photoIndex >= 1 && photoIndex <= imageUrls.length,
            ),
        ),
    );

    return validIndexes.length > 0 ? validIndexes : imageUrls.map((_, index) => index + 1);
}

export function WebMemoryInterviewPanel({
    questions,
    imageUrls,
    answers,
    extraStory,
    currentStep,
    isSubmitting,
    statusText = '',
    memoryContext,
    onAnswerChange,
    onOptionSelect,
    onExtraStoryChange,
    onPreviewPhoto,
    onPrevious,
    onNext,
}: WebMemoryInterviewPanelProps) {
    const totalSteps = Math.max(questions.length + 1, 1);
    const isExtraStoryStep = currentStep >= questions.length;
    const question = isExtraStoryStep ? null : questions[currentStep] || null;
    const visiblePhotoIndexes = useMemo(
        () => getValidPhotoIndexes(question, imageUrls),
        [question, imageUrls],
    );
    const [activePhotoIndex, setActivePhotoIndex] = useState<number>(visiblePhotoIndexes[0] || 1);

    useEffect(() => {
        setActivePhotoIndex(visiblePhotoIndexes[0] || 1);
    }, [currentStep, visiblePhotoIndexes]);

    const activeImageUrl = imageUrls[activePhotoIndex - 1];
    const progress = `${Math.min(((currentStep + 1) / totalSteps) * 100, 100)}%` as `${number}%`;

    return (
        <View style={styles.container}>
            <View style={styles.progressHeader}>
                <View>
                    <Text style={styles.progressEyebrow}>
                        {isExtraStoryStep ? '마지막 · 추가 사연' : `질문 ${currentStep + 1}`}
                    </Text>
                    <Text style={styles.progressCount}>
                        {currentStep + 1} / {totalSteps}
                    </Text>
                </View>
                {hasMeaningfulMemoryContext(memoryContext) ? (
                    <View style={styles.contextBadge}>
                        <Text style={styles.contextBadgeText}>기억 단서 반영됨</Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progress }]} />
            </View>

            <View style={styles.stage}>
                <View style={styles.photoColumn}>
                    <View style={styles.photoHeader}>
                        <View>
                            <Text style={styles.photoTitle}>질문과 연결된 사진</Text>
                            <Text style={styles.photoGuide}>사진을 선택하면 크게 확인할 수 있어요.</Text>
                        </View>
                        {activeImageUrl ? (
                            <TouchableOpacity
                                style={styles.expandButton}
                                onPress={() => onPreviewPhoto(activePhotoIndex)}
                                accessibilityRole="button"
                                accessibilityLabel={`사진 ${activePhotoIndex} 크게 보기`}
                            >
                                <Text style={styles.expandButtonText}>크게 보기</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    <TouchableOpacity
                        style={styles.mainPhotoButton}
                        onPress={() => activeImageUrl && onPreviewPhoto(activePhotoIndex)}
                        activeOpacity={activeImageUrl ? 0.9 : 1}
                        disabled={!activeImageUrl}
                    >
                        {activeImageUrl ? (
                            <>
                                <Image source={{ uri: activeImageUrl }} style={styles.mainPhoto} resizeMode="contain" />
                                <View style={styles.mainPhotoBadge}>
                                    <Text style={styles.mainPhotoBadgeText}>사진 {activePhotoIndex}</Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.noPhotoBox}>
                                <Text style={styles.noPhotoText}>연결된 사진이 없습니다.</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {visiblePhotoIndexes.length > 1 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.thumbnailStrip}
                        >
                            {visiblePhotoIndexes.map((photoIndex) => {
                                const selected = activePhotoIndex === photoIndex;
                                return (
                                    <TouchableOpacity
                                        key={photoIndex}
                                        style={[styles.thumbnailButton, selected && styles.thumbnailButtonSelected]}
                                        onPress={() => setActivePhotoIndex(photoIndex)}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected }}
                                    >
                                        <Image
                                            source={{ uri: imageUrls[photoIndex - 1] }}
                                            style={styles.thumbnail}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.thumbnailBadge}>
                                            <Text style={styles.thumbnailBadgeText}>{photoIndex}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    ) : null}
                </View>

                <View style={styles.questionColumn}>
                    <View style={styles.questionContent}>
                        {questions.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>생성된 질문이 없습니다. 잠시 후 다시 시도해주세요.</Text>
                            </View>
                        ) : isExtraStoryStep ? (
                            <>
                                <View style={styles.freeRecallBadge}>
                                    <Text style={styles.freeRecallBadgeText}>자유 회상</Text>
                                </View>
                                <Text style={styles.questionText}>
                                    그 외에 떠오르는 사연이나 꼭 남기고 싶은 이야기가 있나요?
                                </Text>
                                <Text style={styles.questionGuide}>
                                    없다면 비워둔 채 추억 완성을 눌러도 괜찮습니다.
                                </Text>
                                <TextInput
                                    style={[styles.answerInput, styles.answerInputLarge]}
                                    placeholder="예: 사진을 찍은 뒤 가족과 함께 식사했던 기억"
                                    placeholderTextColor={memoryColors.textFaint}
                                    value={extraStory}
                                    onChangeText={onExtraStoryChange}
                                    multiline
                                    textAlignVertical="top"
                                    editable={!isSubmitting}
                                />
                            </>
                        ) : question ? (
                            <>
                                <View style={styles.badgeRow}>
                                    <View style={styles.categoryBadge}>
                                        <Text style={styles.categoryBadgeText}>
                                            {question.category || '기억의 단서'}
                                        </Text>
                                    </View>
                                    <View style={styles.photoBadge}>
                                        <Text style={styles.photoBadgeText}>
                                            사진 {visiblePhotoIndexes.join(', ')}
                                        </Text>
                                    </View>
                                </View>

                                {question.targetClue ? (
                                    <View style={styles.clueBox}>
                                        <Text style={styles.clueLabel}>사진에서 살펴볼 단서</Text>
                                        <Text style={styles.clueText}>{question.targetClue}</Text>
                                    </View>
                                ) : null}

                                <Text style={styles.questionText}>{question.question}</Text>

                                {question.quickOptions && question.quickOptions.length > 0 ? (
                                    <View style={styles.optionList}>
                                        {question.quickOptions.map((option, optionIndex) => {
                                            const selected = answers[question.id] === option;
                                            return (
                                                <TouchableOpacity
                                                    key={`${option}-${optionIndex}`}
                                                    style={[styles.optionButton, selected && styles.optionButtonSelected]}
                                                    onPress={() => onOptionSelect(question.id, option)}
                                                    disabled={isSubmitting}
                                                    accessibilityRole="button"
                                                    accessibilityState={{ selected }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.optionButtonText,
                                                            selected && styles.optionButtonTextSelected,
                                                        ]}
                                                    >
                                                        {option}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ) : null}

                                <Text style={styles.answerLabel}>기억나는 내용을 적어주세요</Text>
                                <TextInput
                                    style={styles.answerInput}
                                    placeholder="사진을 보며 떠오른 장소, 사람, 대화를 자유롭게 적어주세요."
                                    placeholderTextColor={memoryColors.textFaint}
                                    value={answers[question.id] || ''}
                                    onChangeText={(value) => onAnswerChange(question.id, value)}
                                    multiline
                                    textAlignVertical="top"
                                    editable={!isSubmitting}
                                />
                            </>
                        ) : null}
                    </View>

                    {isSubmitting ? (
                        <View style={styles.statusRow}>
                            <ActivityIndicator size="small" color={memoryColors.brand} />
                            <Text style={styles.statusText}>{statusText}</Text>
                        </View>
                    ) : null}

                    <View style={styles.navigation}>
                        <TouchableOpacity
                            style={styles.previousButton}
                            onPress={onPrevious}
                            disabled={isSubmitting}
                            accessibilityRole="button"
                        >
                            <Text style={styles.previousButtonText}>{currentStep === 0 ? '인터뷰 닫기' : '이전 질문'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.nextButton,
                                (isSubmitting || questions.length === 0) && styles.nextButtonDisabled,
                            ]}
                            onPress={onNext}
                            disabled={isSubmitting || questions.length === 0}
                            accessibilityRole="button"
                        >
                            {isSubmitting ? (
                                <View style={styles.loadingRow}>
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                    <Text style={styles.nextButtonText}>노트 작성 중...</Text>
                                </View>
                            ) : (
                                <Text style={styles.nextButtonText}>
                                    {isExtraStoryStep ? '답변으로 추억 완성하기' : '다음 질문'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, minHeight: 0 },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 10,
    },
    progressEyebrow: {
        color: memoryColors.text,
        fontSize: 17,
        lineHeight: 24,
        fontWeight: '800',
        fontFamily: memoryFontFamily,
    },
    progressCount: {
        marginTop: 2,
        color: memoryColors.textMuted,
        fontSize: 13,
        fontFamily: memoryFontFamily,
    },
    contextBadge: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: memoryColors.brandLight,
    },
    contextBadgeText: {
        color: memoryColors.brand,
        fontSize: 12,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
    progressTrack: {
        width: '100%',
        height: 7,
        marginBottom: 16,
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: memoryColors.border,
    },
    progressFill: { height: '100%', borderRadius: 999, backgroundColor: memoryColors.brand },
    stage: { flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'stretch', gap: 20 },
    photoColumn: {
        flex: 1.08,
        minWidth: 0,
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: memoryColors.border,
        backgroundColor: memoryColors.surface,
    },
    photoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
    },
    photoTitle: {
        color: memoryColors.text,
        fontSize: 17,
        lineHeight: 24,
        fontWeight: '800',
        fontFamily: memoryFontFamily,
    },
    photoGuide: {
        marginTop: 2,
        color: memoryColors.textMuted,
        fontSize: 12,
        lineHeight: 18,
        fontFamily: memoryFontFamily,
    },
    expandButton: {
        minHeight: 38,
        paddingHorizontal: 13,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: memoryColors.subtle,
    },
    expandButtonText: {
        color: memoryColors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
    mainPhotoButton: {
        flex: 1,
        minHeight: 260,
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#0F172A',
    },
    mainPhoto: { width: '100%', height: '100%' },
    mainPhotoBadge: {
        position: 'absolute',
        left: 14,
        bottom: 14,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.92)',
    },
    mainPhotoBadgeText: { color: memoryColors.brand, fontSize: 12, fontWeight: '800' },
    noPhotoBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    noPhotoText: { color: '#CBD5E1', fontSize: 14, fontWeight: '600' },
    thumbnailStrip: { gap: 9, paddingTop: 12, paddingRight: 2 },
    thumbnailButton: {
        width: 86,
        height: 62,
        borderRadius: 9,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        backgroundColor: memoryColors.subtle,
    },
    thumbnailButtonSelected: { borderColor: memoryColors.brand },
    thumbnail: { width: '100%', height: '100%' },
    thumbnailBadge: {
        position: 'absolute',
        left: 5,
        top: 5,
        minWidth: 22,
        height: 22,
        paddingHorizontal: 5,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,23,42,0.82)',
    },
    thumbnailBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
    questionColumn: {
        flex: 0.92,
        minWidth: 0,
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: memoryColors.border,
        backgroundColor: memoryColors.surface,
    },
    questionContent: { flex: 1, minHeight: 0, justifyContent: 'center', paddingBottom: 4 },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    categoryBadge: {
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: memoryColors.brandLight,
    },
    categoryBadgeText: { color: memoryColors.brand, fontSize: 12, fontWeight: '800' },
    photoBadge: {
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: memoryColors.subtle,
    },
    photoBadgeText: { color: memoryColors.textSecondary, fontSize: 12, fontWeight: '700' },
    freeRecallBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#FEF3C7',
        marginBottom: 14,
    },
    freeRecallBadgeText: { color: '#B45309', fontSize: 12, fontWeight: '800' },
    clueBox: {
        marginBottom: 12,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: memoryColors.brandBorder,
        backgroundColor: memoryColors.brandLight,
    },
    clueLabel: { color: memoryColors.brand, fontSize: 11, fontWeight: '800', marginBottom: 3 },
    clueText: {
        color: memoryColors.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        fontFamily: memoryFontFamily,
    },
    questionText: {
        color: memoryColors.text,
        fontSize: 19,
        lineHeight: 29,
        fontWeight: '800',
        fontFamily: memoryFontFamily,
        marginBottom: 10,
    },
    questionGuide: {
        color: memoryColors.textMuted,
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 18,
        fontFamily: memoryFontFamily,
    },
    optionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    optionButton: {
        minHeight: 38,
        paddingHorizontal: 13,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: memoryColors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: memoryColors.surface,
    },
    optionButtonSelected: { borderColor: memoryColors.brand, backgroundColor: memoryColors.brandLight },
    optionButtonText: {
        color: memoryColors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        fontFamily: memoryFontFamily,
    },
    optionButtonTextSelected: { color: memoryColors.brand, fontWeight: '800' },
    answerLabel: {
        color: memoryColors.textSecondary,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 7,
        fontFamily: memoryFontFamily,
    },
    answerInput: {
        minHeight: 92,
        paddingHorizontal: 13,
        paddingVertical: 11,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: memoryColors.borderStrong,
        color: memoryColors.text,
        backgroundColor: memoryColors.surface,
        fontSize: 15,
        lineHeight: 22,
        fontFamily: memoryFontFamily,
        outlineStyle: 'none' as any,
    },
    answerInputLarge: { minHeight: 140 },
    emptyBox: {
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FED7AA',
        backgroundColor: '#FFF7ED',
    },
    emptyText: { color: '#9A3412', fontSize: 14, fontWeight: '700' },
    statusRow: {
        marginTop: 12,
        paddingVertical: 9,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: memoryColors.brandLight,
    },
    statusText: { color: memoryColors.brandDark, fontSize: 13, fontWeight: '700' },
    navigation: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 },
    previousButton: {
        minWidth: 126,
        minHeight: 46,
        paddingHorizontal: 16,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: memoryColors.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: memoryColors.surface,
    },
    previousButtonText: {
        color: memoryColors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
    nextButton: {
        minHeight: 46,
        flex: 1,
        paddingHorizontal: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: memoryColors.brand,
    },
    nextButtonDisabled: { backgroundColor: '#7DD3FC' },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        fontFamily: memoryFontFamily,
    },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
