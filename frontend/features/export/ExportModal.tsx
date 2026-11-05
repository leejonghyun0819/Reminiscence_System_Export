import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { MemoryItem } from '../../context/MemoryContext';
import { memoryColors } from '../../constants/memoryTheme';
import { downloadExportFile, getExportPreview } from '../../services/exportService';
import { ExportPreview } from './ExportPreview';
import { ExportTypeCard } from './ExportTypeCard';
import { ImageCardPreview } from './ImageCardPreview';
import { PdfExportPreview } from './PdfExportPreview';
import { ShareExport } from './ShareExport';
import {
    ExportKind,
    ExportOptions,
    ExportPhotoSource,
    ExportPreviewData,
    ExportTextOverrides,
} from './types';

interface Props {
    visible: boolean;
    note: MemoryItem | null;
    onClose: () => void;
    mobile?: boolean;
}

const KIND_COPY: Record<ExportKind, { title: string; action: string }> = {
    pdf: { title: 'PDF 추억책', action: 'PDF 추억책 만들기' },
    cards: { title: '이미지 카드', action: '이미지 카드 만들기' },
    share: { title: '웹 공유 링크', action: '공유 링크 만들기' },
    video: { title: '슬라이드쇼 영상', action: '슬라이드쇼 만들기' },
    zip: { title: '전체 추억 ZIP', action: '백업 ZIP 만들기' },
};

function overridesFrom(preview: ExportPreviewData): ExportTextOverrides {
    return {
        title: preview.title || '',
        sceneDescription: preview.sceneDescription || '',
        remembered: preview.remembered || '',
        unremembered: preview.unremembered || '',
        reflection: preview.reflection || '',
    };
}

export function ExportModal({ visible, note, onClose, mobile = false }: Props) {
    const [kind, setKind] = useState<ExportKind | null>(null);
    const [preview, setPreview] = useState<ExportPreviewData | null>(null);
    const [options, setOptions] = useState<ExportOptions | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const noteTitle = note?.analysis?.title || note?.generatedNote?.title || '완성된 추억 노트';

    const loadPreview = async (photoSource: ExportPhotoSource, preserve?: ExportOptions | null) => {
        if (!note) return;
        setLoading(true);
        setError('');
        try {
            const data = await getExportPreview(note.id, photoSource);
            setPreview(data);
            setOptions({
                template: preserve?.template || 'minimal',
                photoSource,
                selectedPhotoIds: data.photos.map((photo) => photo.id),
                coverPhotoId: data.photos[0]?.id,
                overrides: preserve?.overrides || overridesFrom(data),
                preset: preserve?.preset || 'portrait',
                imageFormat: preserve?.imageFormat || 'png',
                includeAudio: preserve?.includeAudio || false,
            });
        } catch (loadError: any) {
            setError(loadError?.message || '내보내기 미리보기를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!visible || !note) return;
        setKind(null);
        setPreview(null);
        setOptions(null);
        setError('');
        loadPreview('preferred');
    }, [visible, note?.id]);

    const chooseKind = (nextKind: ExportKind) => setKind(nextKind);

    const changePhotoSource = (source: ExportPhotoSource) => loadPreview(source, options);

    const handleGenerate = async () => {
        if (!note || !kind || kind === 'share' || !options) return;
        setLoading(true);
        setError('');
        try {
            const filename = await downloadExportFile(kind, note.id, options);
            Alert.alert('내보내기 완료', `${filename} 파일을 만들었습니다.`);
        } catch (exportError: any) {
            const message = exportError?.message || '파일 생성에 실패했습니다.';
            setError(message);
            Alert.alert('내보내기 실패', message);
        } finally {
            setLoading(false);
        }
    };

    const previewElement = useMemo(() => {
        if (!kind || !preview || !options) return null;
        const common = {
            preview,
            options,
            onChange: setOptions,
            onPhotoSourceChange: changePhotoSource,
            mobile,
        };
        if (kind === 'pdf') return <PdfExportPreview {...common} />;
        if (kind === 'cards') return <ImageCardPreview {...common} />;
        return <ExportPreview kind={kind} {...common} />;
    }, [kind, preview, options, mobile]);

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.modal, mobile && styles.modalMobile]}>
                    <View style={styles.header}>
                        <View style={styles.headerCopy}>
                            <Text style={styles.eyebrow}>완성된 추억 노트</Text>
                            <Text style={styles.title}>{kind ? KIND_COPY[kind].title : '내보내기'}</Text>
                            <Text style={styles.subtitle} numberOfLines={2}>
                                {kind ? noteTitle : '기억을 보관하고, 공유하고, 감상하고, 백업할 형태를 선택하세요.'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="내보내기 닫기">
                            <Text style={styles.closeText}>×</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                        {!kind ? (
                            <View style={styles.menuSections}>
                                <View style={styles.menuSection}>
                                    <Text style={styles.sectionHeading}>보관하기</Text>
                                    <ExportTypeCard kind="pdf" icon="📕" title="PDF 추억책" description="사진과 글을 작은 포토 에세이 PDF로 보관합니다." onPress={chooseKind} />
                                </View>
                                <View style={styles.menuSection}>
                                    <Text style={styles.sectionHeading}>공유하기</Text>
                                    <View style={[styles.menuGrid, mobile && styles.menuGridMobile]}>
                                        <ExportTypeCard kind="cards" icon="🖼️" title="이미지 카드" description="메신저와 블로그에서 쓰기 좋은 5장의 카드입니다." onPress={chooseKind} />
                                        <ExportTypeCard kind="share" icon="🔗" title="웹 공유 링크" description="가족과 지인이 읽기 전용 페이지로 감상합니다." onPress={chooseKind} />
                                    </View>
                                </View>
                                <View style={styles.menuSection}>
                                    <Text style={styles.sectionHeading}>감상하기</Text>
                                    <ExportTypeCard kind="video" icon="🎞️" title="슬라이드쇼 영상" description="사진과 핵심 문장을 30~60초 MP4로 엮습니다." onPress={chooseKind} />
                                </View>
                                <View style={styles.menuSection}>
                                    <Text style={styles.sectionHeading}>백업하기</Text>
                                    <ExportTypeCard kind="zip" icon="🗄️" title="전체 추억 ZIP" description="원본·개선본·노트·메타데이터를 한 번에 소유합니다." onPress={chooseKind} />
                                </View>
                            </View>
                        ) : kind === 'share' && note ? (
                            <ShareExport noteId={note.id} />
                        ) : loading && !preview ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator color={memoryColors.brand} size="large" />
                                <Text style={styles.loadingText}>추억 노트를 준비하고 있습니다…</Text>
                            </View>
                        ) : (
                            previewElement
                        )}

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    </ScrollView>

                    {kind ? (
                        <View style={[styles.footer, mobile && styles.footerMobile]}>
                            <TouchableOpacity style={styles.secondaryButton} onPress={() => setKind(null)} disabled={loading}>
                                <Text style={styles.secondaryButtonText}>목적 다시 선택</Text>
                            </TouchableOpacity>
                            {kind !== 'share' ? (
                                <TouchableOpacity
                                    style={[styles.primaryButton, loading && styles.buttonDisabled]}
                                    onPress={handleGenerate}
                                    disabled={loading || !options || !!error}
                                >
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{KIND_COPY[kind].action}</Text>}
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,.58)', alignItems: 'center', justifyContent: 'center', padding: 22 },
    modal: { width: '100%', maxWidth: 1180, maxHeight: '94%', backgroundColor: memoryColors.canvas, borderRadius: 22, overflow: 'hidden' },
    modalMobile: { maxHeight: '96%', borderRadius: 18 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: memoryColors.border, backgroundColor: memoryColors.surface },
    headerCopy: { flex: 1, gap: 4 },
    eyebrow: { fontSize: 12, fontWeight: '800', color: memoryColors.brand },
    title: { fontSize: 24, fontWeight: '900', color: memoryColors.text },
    subtitle: { fontSize: 13, lineHeight: 19, color: memoryColors.textMuted },
    closeButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    closeText: { fontSize: 27, lineHeight: 30, color: memoryColors.textMuted },
    scroll: { flexShrink: 1 },
    scrollContent: { padding: 24 },
    menuSections: { gap: 25 },
    menuSection: { gap: 10 },
    sectionHeading: { fontSize: 14, fontWeight: '900', color: memoryColors.textMuted },
    menuGrid: { flexDirection: 'row', gap: 12 },
    menuGridMobile: { flexDirection: 'column' },
    loadingBox: { minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 14 },
    loadingText: { fontSize: 14, color: memoryColors.textMuted },
    errorText: { marginTop: 16, borderRadius: 10, backgroundColor: '#fff1f2', color: '#be123c', padding: 12, fontSize: 13, lineHeight: 19 },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: memoryColors.border, backgroundColor: memoryColors.surface },
    footerMobile: { paddingHorizontal: 16 },
    secondaryButton: { minHeight: 48, borderWidth: 1, borderColor: memoryColors.border, borderRadius: 11, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
    secondaryButtonText: { color: memoryColors.textMuted, fontSize: 14, fontWeight: '800' },
    primaryButton: { minHeight: 48, minWidth: 220, borderRadius: 11, backgroundColor: memoryColors.brand, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
    primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    buttonDisabled: { opacity: 0.55 },
});
