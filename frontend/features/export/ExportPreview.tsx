import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { memoryColors } from '../../constants/memoryTheme';
import { resolveBackendMediaUrl } from '../../config/api';
import {
    CardPreset,
    ExportKind,
    ExportOptions,
    ExportPhotoSource,
    ExportPreviewData,
    ExportTextOverrides,
} from './types';

interface Props {
    kind: ExportKind;
    preview: ExportPreviewData;
    options: ExportOptions;
    onChange: (next: ExportOptions) => void;
    onPhotoSourceChange: (source: ExportPhotoSource) => void;
    mobile?: boolean;
}

const PHOTO_SOURCE_OPTIONS: Array<{ id: ExportPhotoSource; label: string }> = [
    { id: 'preferred', label: '개선본 우선' },
    { id: 'original', label: '원본만' },
    { id: 'enhanced', label: '개선본 사용' },
];

const TEXT_FIELDS: Array<{ key: keyof ExportTextOverrides; label: string; multiline?: boolean }> = [
    { key: 'title', label: '제목' },
    { key: 'sceneDescription', label: '그날의 장면', multiline: true },
    { key: 'remembered', label: '나의 기억', multiline: true },
    { key: 'unremembered', label: '기억나지 않는 것', multiline: true },
    { key: 'reflection', label: '지금 다시 바라보니', multiline: true },
];

export function ExportPreview({
    kind,
    preview,
    options,
    onChange,
    onPhotoSourceChange,
    mobile = false,
}: Props) {
    const selected = new Set(options.selectedPhotoIds);
    const coverPhoto = preview.availablePhotos.find((photo) => photo.id === options.coverPhotoId);

    const updateText = (key: keyof ExportTextOverrides, value: string) => {
        onChange({ ...options, overrides: { ...options.overrides, [key]: value } });
    };

    const togglePhoto = (photoId: string) => {
        const next = new Set(options.selectedPhotoIds);
        if (next.has(photoId)) {
            if (next.size === 1) return;
            next.delete(photoId);
        } else {
            next.add(photoId);
        }
        const ids = Array.from(next);
        onChange({
            ...options,
            selectedPhotoIds: ids,
            coverPhotoId: ids.includes(options.coverPhotoId || '') ? options.coverPhotoId : ids[0],
        });
    };

    const updatePreset = (preset: CardPreset) => onChange({ ...options, preset });

    return (
        <View style={[styles.layout, mobile && styles.layoutMobile]}>
            <View style={[styles.visualPreview, mobile && styles.visualPreviewMobile]}>
                <View style={[styles.bookPreview, kind === 'cards' && styles.cardPreview]}>
                    {coverPhoto ? (
                        <Image source={{ uri: resolveBackendMediaUrl(coverPhoto.url) }} style={styles.coverImage} />
                    ) : (
                        <View style={[styles.coverImage, styles.coverFallback]}>
                            <Text style={styles.coverFallbackText}>사진을 선택해주세요</Text>
                        </View>
                    )}
                    <View style={styles.previewCopy}>
                        <Text style={styles.previewEyebrow}>
                            {kind === 'cards' ? 'IMAGE CARD' : 'MEMORY BOOK'}
                        </Text>
                        <Text style={styles.previewTitle} numberOfLines={3}>
                            {options.overrides.title || '제목 없는 추억'}
                        </Text>
                        <Text style={styles.previewMeta} numberOfLines={2}>
                            {`${preview.yearEstimate || '시기 미정'} · ${preview.location || '장소 미정'}`}
                        </Text>
                    </View>
                </View>
                <Text style={styles.previewHelp}>대표 사진과 최종 제목이 표지에 적용됩니다.</Text>
            </View>

            <View style={styles.controls}>
                <View style={styles.controlSection}>
                    <Text style={styles.sectionTitle}>사진 종류</Text>
                    <View style={styles.chipRow}>
                        {PHOTO_SOURCE_OPTIONS.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.chip, options.photoSource === item.id && styles.chipActive]}
                                onPress={() => onPhotoSourceChange(item.id)}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        options.photoSource === item.id && styles.chipTextActive,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.helperText}>
                        기존 데이터에는 일부 원본↔개선본 관계가 없어, 미리보기에서 최종 사진을 확인해주세요.
                    </Text>
                </View>

                <View style={styles.controlSection}>
                    <Text style={styles.sectionTitle}>{`사용할 사진 · ${options.selectedPhotoIds.length}장`}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                        {preview.availablePhotos.map((photo) => {
                            const isSelected = selected.has(photo.id);
                            const isCover = options.coverPhotoId === photo.id;
                            return (
                                <View key={photo.id} style={styles.photoItemWrap}>
                                    <TouchableOpacity
                                        style={[styles.photoItem, isSelected && styles.photoItemSelected]}
                                        onPress={() => togglePhoto(photo.id)}
                                    >
                                        <Image
                                            source={{ uri: resolveBackendMediaUrl(photo.url) }}
                                            style={styles.photoThumb}
                                        />
                                        <Text style={styles.photoKind}>{photo.kind === 'enhanced' ? '개선본' : '원본'}</Text>
                                        <Text style={[styles.check, isSelected && styles.checkSelected]}>
                                            {isSelected ? '✓' : ''}
                                        </Text>
                                    </TouchableOpacity>
                                    {isSelected ? (
                                        <TouchableOpacity
                                            style={[styles.coverButton, isCover && styles.coverButtonActive]}
                                            onPress={() => onChange({ ...options, coverPhotoId: photo.id })}
                                        >
                                            <Text style={[styles.coverButtonText, isCover && styles.coverButtonTextActive]}>
                                                {isCover ? '대표 사진' : '대표로 선택'}
                                            </Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>

                <View style={styles.controlSection}>
                    <Text style={styles.sectionTitle}>Template</Text>
                    <View style={styles.chipRow}>
                        {preview.templates.map((template) => (
                            <TouchableOpacity
                                key={template.id}
                                style={[styles.templateCard, options.template === template.id && styles.templateCardActive]}
                                onPress={() => onChange({ ...options, template: template.id })}
                            >
                                <Text style={styles.templateTitle}>{template.label}</Text>
                                <Text style={styles.templateDescription}>
                                    {template.id === 'minimal' ? '여백 중심의 차분한 구성' : '사진 비중이 큰 포토 에세이'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {kind === 'cards' ? (
                    <View style={styles.controlSection}>
                        <Text style={styles.sectionTitle}>카드 크기</Text>
                        <View style={styles.chipRow}>
                            {preview.cardPresets.map((preset) => (
                                <TouchableOpacity
                                    key={preset.id}
                                    style={[styles.chip, options.preset === preset.id && styles.chipActive]}
                                    onPress={() => updatePreset(preset.id)}
                                >
                                    <Text style={[styles.chipText, options.preset === preset.id && styles.chipTextActive]}>
                                        {`${preset.width} × ${preset.height}`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.sectionTitle}>파일 형식</Text>
                        <View style={styles.chipRow}>
                            {(['png', 'jpeg'] as const).map((format) => (
                                <TouchableOpacity
                                    key={format}
                                    style={[styles.chip, options.imageFormat === format && styles.chipActive]}
                                    onPress={() => onChange({ ...options, imageFormat: format })}
                                >
                                    <Text style={[styles.chipText, options.imageFormat === format && styles.chipTextActive]}>
                                        {format === 'png' ? 'PNG' : 'JPG'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : null}

                {kind === 'video' ? (
                    <View style={styles.controlSection}>
                        <Text style={styles.sectionTitle}>음성 파일</Text>
                        <TouchableOpacity
                            style={[styles.chip, options.includeAudio && styles.chipActive, styles.inlineChip]}
                            onPress={() => onChange({ ...options, includeAudio: !options.includeAudio })}
                        >
                            <Text style={[styles.chipText, options.includeAudio && styles.chipTextActive]}>
                                {options.includeAudio ? '업로드한 음성 사용 ✓' : '업로드한 음성 사용'}
                            </Text>
                        </TouchableOpacity>
                        <Text style={styles.helperText}>연결된 음성 파일이 없으면 사진과 글만으로 영상을 만듭니다.</Text>
                    </View>
                ) : null}

                <View style={styles.controlSection}>
                    <Text style={styles.sectionTitle}>내보내기용 글 확인</Text>
                    <Text style={styles.helperText}>여기서 다듬은 글은 원본 추억 노트와 데이터베이스를 변경하지 않습니다.</Text>
                    {TEXT_FIELDS.map((field) => (
                        <View key={field.key} style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{field.label}</Text>
                            <TextInput
                                style={[styles.input, field.multiline && styles.textarea]}
                                value={options.overrides[field.key]}
                                onChangeText={(value) => updateText(field.key, value)}
                                multiline={field.multiline}
                                textAlignVertical="top"
                            />
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    layout: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
    layoutMobile: { flexDirection: 'column', gap: 16 },
    visualPreview: { width: 330 },
    visualPreviewMobile: { width: '100%' },
    bookPreview: {
        width: '100%',
        aspectRatio: 0.72,
        backgroundColor: '#f8fbfd',
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: memoryColors.border,
    },
    cardPreview: { aspectRatio: 0.8 },
    coverImage: { width: '100%', height: '58%', backgroundColor: '#e8eef3' },
    coverFallback: { alignItems: 'center', justifyContent: 'center' },
    coverFallbackText: { color: memoryColors.textMuted, fontSize: 13 },
    previewCopy: { padding: 22, gap: 10 },
    previewEyebrow: { color: memoryColors.brand, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    previewTitle: { fontSize: 25, lineHeight: 32, fontWeight: '900', color: memoryColors.text },
    previewMeta: { fontSize: 13, lineHeight: 19, color: memoryColors.textMuted },
    previewHelp: { marginTop: 10, textAlign: 'center', fontSize: 12, color: memoryColors.textMuted },
    controls: { flex: 1, minWidth: 0, gap: 16 },
    controlSection: {
        borderWidth: 1,
        borderColor: memoryColors.border,
        borderRadius: 15,
        padding: 16,
        backgroundColor: memoryColors.surface,
        gap: 12,
    },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: memoryColors.text },
    helperText: { fontSize: 12, lineHeight: 18, color: memoryColors.textMuted },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: memoryColors.border },
    chipActive: { backgroundColor: '#eaf6fd', borderColor: '#8dd5f7' },
    chipText: { fontSize: 13, fontWeight: '700', color: memoryColors.textMuted },
    chipTextActive: { color: memoryColors.brand },
    inlineChip: { alignSelf: 'flex-start' },
    photoStrip: { gap: 12, paddingVertical: 2 },
    photoItemWrap: { width: 122, gap: 7 },
    photoItem: { height: 112, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
    photoItemSelected: { borderColor: memoryColors.brand },
    photoThumb: { width: '100%', height: '100%' },
    photoKind: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, color: '#fff', backgroundColor: 'rgba(15,23,42,.72)', fontSize: 10, fontWeight: '800' },
    check: { position: 'absolute', right: 6, top: 6, width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 22, backgroundColor: 'rgba(255,255,255,.86)', color: '#fff', fontWeight: '900' },
    checkSelected: { backgroundColor: memoryColors.brand },
    coverButton: { borderWidth: 1, borderColor: memoryColors.border, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
    coverButtonActive: { borderColor: memoryColors.brand, backgroundColor: '#eaf6fd' },
    coverButtonText: { fontSize: 11, fontWeight: '700', color: memoryColors.textMuted },
    coverButtonTextActive: { color: memoryColors.brand },
    templateCard: { flex: 1, minWidth: 160, borderWidth: 1, borderColor: memoryColors.border, borderRadius: 12, padding: 13, gap: 5 },
    templateCardActive: { borderColor: memoryColors.brand, backgroundColor: '#f0f9fe' },
    templateTitle: { fontSize: 14, fontWeight: '800', color: memoryColors.text },
    templateDescription: { fontSize: 12, lineHeight: 17, color: memoryColors.textMuted },
    fieldGroup: { gap: 7 },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: memoryColors.text },
    input: { minHeight: 46, borderWidth: 1, borderColor: memoryColors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: memoryColors.text, backgroundColor: '#fbfdff' },
    textarea: { minHeight: 96 },
});
