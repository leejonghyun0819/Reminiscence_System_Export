import React from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { memoryColors, memoryFontFamily } from '../../constants/memoryTheme';
import { MemoryItem } from '../../context/MemoryContext';
import { MouseDragHorizontalScroll } from '../backup/MouseDragHorizontalScroll';

interface MagazineBookViewerProps {
    note: MemoryItem;
    activePhotoIdx: number;
    setActivePhotoIdx: (idx: number) => void;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
    editTitle: string;
    setEditTitle: (value: string) => void;
    editStory: string;
    setEditStory: (value: string) => void;
    onSaveEdit: () => void;
    mobile?: boolean;
}

export const MagazineBookViewer: React.FC<MagazineBookViewerProps> = ({
    note,
    activePhotoIdx,
    setActivePhotoIdx,
    isEditing,
    setIsEditing,
    editTitle,
    setEditTitle,
    editStory,
    setEditStory,
    onSaveEdit,
    mobile = false,
}) => {
    const generatedNote = note.generatedNote;
    const photoCount = note.imageUrls?.length || 0;
    const previewTitle = note.analysis?.title || '제목 없음';
    const previewStory = generatedNote
        ? [generatedNote.opening, generatedNote.body, generatedNote.closing].filter(Boolean).join('\n\n')
        : note.analysis?.storyCaption || note.analysis?.description || '';

    const movePhoto = (direction: -1 | 1) => {
        if (photoCount === 0) return;
        setActivePhotoIdx((activePhotoIdx + direction + photoCount) % photoCount);
    };

    return (
        <View style={[styles.workspace, mobile && styles.workspaceMobile]}>
            <View style={[styles.previewCard, mobile && styles.previewCardMobile]}>
                <View style={[styles.previewHeader, mobile && styles.previewHeaderMobile]}>
                    <View style={styles.titleCopy}>
                        <Text style={[styles.bookMainTitle, mobile && styles.bookMainTitleMobile]}>{previewTitle}</Text>
                        <Text style={[styles.bookSubtitle, mobile && styles.bookSubtitleMobile]}>
                            {generatedNote?.subtitle || '사진과 인터뷰 답변으로 완성한 소중한 기록'}
                        </Text>
                    </View>
                    {generatedNote ? <Text style={styles.styleBadge}>따뜻한 에세이</Text> : null}
                </View>

                <View style={[styles.previewBody, mobile && styles.previewBodyMobile]}>
                    <View style={[styles.photoColumn, mobile && styles.contentColumnMobile]}>
                        <View style={[styles.mainPhotoBox, mobile && styles.mainPhotoBoxMobile]}>
                            {photoCount > 0 ? (
                                <Image
                                    source={{ uri: note.imageUrls[activePhotoIdx] }}
                                    style={styles.mainPhotoImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={styles.noPhotoBox}>
                                    <Text style={styles.noPhotoIcon}>📷</Text>
                                    <Text style={styles.noPhotoText}>연결된 사진이 없습니다.</Text>
                                </View>
                            )}
                            <Text style={styles.photoCounterBadge}>
                                {`추억 사진 · ${photoCount > 0 ? activePhotoIdx + 1 : 0} / ${photoCount}`}
                            </Text>
                        </View>

                        <View style={[styles.photoControls, mobile && styles.photoControlsMobile]}>
                            <TouchableOpacity
                                style={[styles.photoNavButton, mobile && styles.photoNavButtonMobile]}
                                onPress={() => movePhoto(-1)}
                            >
                                <Text style={styles.photoNavText}>← 이전</Text>
                            </TouchableOpacity>
                            <Text
                                style={styles.photoCountText}
                            >{`${photoCount > 0 ? activePhotoIdx + 1 : 0} / ${photoCount}`}</Text>
                            <TouchableOpacity
                                style={[styles.photoNavButton, mobile && styles.photoNavButtonMobile]}
                                onPress={() => movePhoto(1)}
                            >
                                <Text style={styles.photoNavText}>다음 →</Text>
                            </TouchableOpacity>
                        </View>

                        {photoCount > 1 ? (
                            <MouseDragHorizontalScroll contentContainerStyle={styles.thumbnailStrip}>
                                {note.imageUrls.map((url, index) => (
                                    <TouchableOpacity
                                        key={`${url}-${index}`}
                                        onPress={() => setActivePhotoIdx(index)}
                                        style={[styles.thumbItem, activePhotoIdx === index && styles.thumbItemActive]}
                                    >
                                        <Image source={{ uri: url }} style={styles.thumbImg} />
                                    </TouchableOpacity>
                                ))}
                            </MouseDragHorizontalScroll>
                        ) : null}
                    </View>

                    <View style={[styles.storyColumn, mobile && styles.contentColumnMobile]}>
                        <Text style={[styles.storyHeading, mobile && styles.storyHeadingMobile]}>
                            함께여서 기억나는 날
                        </Text>
                        <Text style={[styles.storyContent, mobile && styles.storyContentMobile]}>{previewStory}</Text>
                        <View style={styles.metaList}>
                            <Text style={styles.metaText}>{`장소 · ${note.analysis?.location || '장소 미정'}`}</Text>
                            <Text
                                style={styles.metaText}
                            >{`시기 · ${note.analysis?.yearEstimate || '시기 미정'}`}</Text>
                            {note.categoryFolder ? (
                                <Text style={styles.metaText}>{`보관 폴더 · ${note.categoryFolder}`}</Text>
                            ) : null}
                        </View>
                    </View>
                </View>
            </View>

            <View style={[styles.editorCard, mobile && styles.editorCardMobile]}>
                <Text style={styles.editorTitle}>노트 편집</Text>

                <Text style={styles.inputLabel}>노트 제목</Text>
                <TextInput
                    style={[styles.titleInput, !isEditing && styles.inputReadOnly]}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    editable={isEditing}
                    placeholder="노트 제목을 입력하세요"
                    placeholderTextColor={memoryColors.textFaint}
                />

                <Text style={styles.inputLabel}>이야기</Text>
                <TextInput
                    style={[styles.storyInput, !isEditing && styles.inputReadOnly]}
                    value={editStory}
                    onChangeText={setEditStory}
                    editable={isEditing}
                    multiline
                    textAlignVertical="top"
                    placeholder="추억 이야기를 적어주세요"
                    placeholderTextColor={memoryColors.textFaint}
                />

                {isEditing ? (
                    <TouchableOpacity style={styles.primaryButton} onPress={onSaveEdit}>
                        <Text style={styles.primaryButtonText}>수정 내용 적용</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.primaryButton} onPress={() => setIsEditing(true)}>
                        <Text style={styles.primaryButtonText}>직접 편집하기</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.sourceInfo}>
                    <Text style={styles.sourceInfoText}>
                        {generatedNote
                            ? `출처 추억 ${generatedNote.sourceMemoryIds.length}개 · 사진 ${photoCount}장`
                            : `연결 사진 ${photoCount}장 · 인터뷰 기반 기록`}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    workspace: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 24,
    },
    workspaceMobile: {
        flexDirection: 'column',
        flexWrap: 'nowrap',
        alignItems: 'stretch',
        gap: 12,
        maxWidth: '100%',
    },
    previewCard: {
        flexGrow: 1,
        flexBasis: 720,
        minWidth: 300,
        backgroundColor: memoryColors.surface,
        borderWidth: 1,
        borderColor: memoryColors.border,
        borderRadius: 16,
        padding: 24,
    },
    previewCardMobile: {
        width: '100%',
        maxWidth: '100%',
        flexBasis: 'auto',
        flexGrow: 0,
        minWidth: 0,
        padding: 16,
        borderWidth: 0,
        borderRadius: 20,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
        marginBottom: 24,
    },
    previewHeaderMobile: { flexDirection: 'column', marginBottom: 16 },
    titleCopy: { flex: 1 },
    bookMainTitle: {
        color: memoryColors.text,
        fontSize: 28,
        lineHeight: 40,
        fontWeight: '700',
        fontFamily: memoryFontFamily,
    },
    bookMainTitleMobile: { fontSize: 22, lineHeight: 31 },
    bookSubtitle: {
        color: memoryColors.textMuted,
        fontSize: 14,
        lineHeight: 24,
        marginTop: 6,
        fontFamily: memoryFontFamily,
    },
    bookSubtitleMobile: { fontSize: 13, lineHeight: 21, marginTop: 4 },
    styleBadge: {
        color: memoryColors.brand,
        backgroundColor: memoryColors.brandLight,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: '700',
        overflow: 'hidden',
    },
    previewBody: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
    previewBodyMobile: { flexDirection: 'column', flexWrap: 'nowrap', gap: 18 },
    photoColumn: { flexGrow: 1, flexBasis: 330, minWidth: 260 },
    storyColumn: { flexGrow: 1, flexBasis: 320, minWidth: 260, paddingTop: 4 },
    contentColumnMobile: { flexBasis: 'auto', minWidth: 0, width: '100%' },
    mainPhotoBox: {
        width: '100%',
        height: 360,
        backgroundColor: memoryColors.brandLight,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainPhotoBoxMobile: { height: 220, borderRadius: 16 },
    mainPhotoImage: { width: '100%', height: '100%' },
    noPhotoBox: { alignItems: 'center', gap: 8 },
    noPhotoIcon: { fontSize: 36 },
    noPhotoText: { color: memoryColors.textMuted, fontSize: 12 },
    photoCounterBadge: {
        position: 'absolute',
        left: 16,
        bottom: 16,
        color: memoryColors.brand,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: '700',
        overflow: 'hidden',
    },
    photoControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 16,
    },
    photoControlsMobile: { width: '100%', gap: 8, marginTop: 12 },
    photoNavButton: {
        minWidth: 100,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: memoryColors.border,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: memoryColors.surface,
    },
    photoNavButtonMobile: { minWidth: 0, flex: 1, paddingHorizontal: 8 },
    photoNavText: {
        color: memoryColors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    photoCountText: {
        color: memoryColors.textMuted,
        fontSize: 12,
        fontWeight: '600',
    },
    thumbnailStrip: { gap: 8, paddingTop: 12 },
    thumbItem: {
        width: 64,
        height: 48,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: memoryColors.border,
    },
    thumbItemActive: { borderColor: memoryColors.brand },
    thumbImg: { width: '100%', height: '100%' },
    storyHeading: {
        color: memoryColors.text,
        fontSize: 20,
        lineHeight: 30,
        fontWeight: '700',
        marginBottom: 12,
    },
    storyHeadingMobile: { fontSize: 18, lineHeight: 27, marginBottom: 8 },
    storyContent: {
        color: memoryColors.textSecondary,
        fontSize: 14,
        lineHeight: 25,
    },
    storyContentMobile: { fontSize: 13, lineHeight: 23 },
    metaList: {
        borderTopWidth: 1,
        borderTopColor: memoryColors.border,
        marginTop: 24,
        paddingTop: 16,
        gap: 6,
    },
    metaText: { color: memoryColors.textMuted, fontSize: 12, lineHeight: 20 },
    editorCard: {
        flexGrow: 1,
        flexBasis: 380,
        minWidth: 300,
        backgroundColor: memoryColors.surface,
        borderWidth: 1,
        borderColor: memoryColors.border,
        borderRadius: 16,
        padding: 24,
    },
    editorCardMobile: { width: '100%', minWidth: 0, padding: 16, borderWidth: 0, borderRadius: 20 },
    editorTitle: {
        color: memoryColors.text,
        fontSize: 20,
        lineHeight: 30,
        fontWeight: '700',
        marginBottom: 18,
    },
    inputLabel: {
        color: memoryColors.textSecondary,
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 6,
    },
    titleInput: {
        minHeight: 44,
        borderWidth: 1,
        borderColor: memoryColors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        color: memoryColors.text,
        fontSize: 13,
        marginBottom: 16,
        backgroundColor: memoryColors.surface,
    },
    storyInput: {
        minHeight: 220,
        borderWidth: 1,
        borderColor: memoryColors.border,
        borderRadius: 12,
        padding: 14,
        color: memoryColors.text,
        fontSize: 13,
        lineHeight: 22,
        backgroundColor: memoryColors.surface,
        marginBottom: 14,
    },
    inputReadOnly: {
        backgroundColor: memoryColors.subtle,
        color: memoryColors.textSecondary,
    },
    primaryButton: {
        minHeight: 44,
        borderRadius: 8,
        backgroundColor: memoryColors.brand,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: memoryColors.surface,
        fontSize: 13,
        fontWeight: '700',
    },
    sourceInfo: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: memoryColors.border,
    },
    sourceInfoText: {
        color: memoryColors.textMuted,
        fontSize: 12,
        lineHeight: 20,
    },
});
