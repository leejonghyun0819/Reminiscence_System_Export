import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { memoryColors } from '../../constants/memoryTheme';
import { getSharedMemory } from '../../services/exportService';
import { SharedMemoryResponse } from '../../features/export/types';

export default function SharedMemoryPage() {
    const params = useLocalSearchParams<{ shareId?: string | string[] }>();
    const shareId = Array.isArray(params.shareId) ? params.shareId[0] : params.shareId;
    const { width } = useWindowDimensions();
    const narrow = width < 760;
    const [data, setData] = useState<SharedMemoryResponse | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!shareId) return;
        getSharedMemory(shareId)
            .then(setData)
            .catch((reason) => setError(reason?.message || '공유된 추억을 불러오지 못했습니다.'));
    }, [shareId]);

    if (!data && !error) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={memoryColors.brand} />
                <Text style={styles.loadingText}>공유된 추억을 펼치고 있습니다…</Text>
            </View>
        );
    }

    if (!data || error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorIcon}>🔒</Text>
                <Text style={styles.errorTitle}>이 추억 링크를 열 수 없습니다.</Text>
                <Text style={styles.errorText}>{error || '링크가 만료되었거나 비활성화되었습니다.'}</Text>
            </View>
        );
    }

    const memory = data.memory;
    const photos = memory.photos || [];
    const sections = [
        ['그날의 장면', memory.sceneDescription],
        ['나의 기억', memory.remembered],
        ['기억나지 않는 것', memory.unremembered],
        ['지금 다시 바라보니', memory.reflection],
    ];

    return (
        <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
            <View style={styles.brandRow}>
                <Text style={styles.brand}>Reminiscence Note</Text>
                <Text style={styles.readOnlyBadge}>읽기 전용</Text>
            </View>

            <View style={styles.hero}>
                {photos[0]?.url ? <Image source={{ uri: photos[0].url }} style={styles.heroImage} /> : null}
                <View style={[styles.heroCopy, narrow && styles.heroCopyNarrow]}>
                    <Text style={styles.eyebrow}>함께 나누는 추억</Text>
                    <Text style={[styles.title, narrow && styles.titleNarrow]}>{memory.title || '제목 없는 추억'}</Text>
                    <Text style={styles.meta}>{`${memory.yearEstimate || '시기 미정'} · ${memory.location || '장소 미정'}`}</Text>
                </View>
            </View>

            {photos.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
                    {photos.map((photo, index) => (
                        <Image key={`${photo.id}-${index}`} source={{ uri: photo.url }} style={styles.galleryImage} />
                    ))}
                </ScrollView>
            ) : null}

            <View style={styles.sections}>
                {sections.map(([heading, body], index) => (
                    <View key={heading} style={[styles.section, narrow && styles.sectionNarrow]}>
                        <View style={styles.sectionNumber}>
                            <Text style={styles.sectionNumberText}>{String(index + 1).padStart(2, '0')}</Text>
                        </View>
                        <View style={styles.sectionCopy}>
                            <Text style={styles.sectionHeading}>{heading}</Text>
                            <Text style={styles.sectionBody}>{body || '아직 기록하지 않은 부분입니다.'}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <Text style={styles.footerText}>이 페이지는 Reminiscence Note에서 공유된 읽기 전용 추억입니다.</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    page: { flex: 1, backgroundColor: '#f4f8fb' },
    pageContent: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 26, paddingBottom: 72, gap: 24 },
    centered: { flex: 1, backgroundColor: '#f4f8fb', alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14 },
    loadingText: { color: memoryColors.textMuted, fontSize: 14 },
    errorIcon: { fontSize: 42 },
    errorTitle: { fontSize: 21, fontWeight: '900', color: memoryColors.text, textAlign: 'center' },
    errorText: { fontSize: 14, lineHeight: 21, color: memoryColors.textMuted, textAlign: 'center' },
    brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    brand: { fontSize: 19, fontWeight: '900', color: memoryColors.brand },
    readOnlyBadge: { fontSize: 12, fontWeight: '800', color: memoryColors.textMuted, backgroundColor: '#e8eef3', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    hero: { minHeight: 560, borderRadius: 22, overflow: 'hidden', backgroundColor: '#15233b', position: 'relative' },
    heroImage: { position: 'absolute', width: '100%', height: '100%', opacity: 0.72 },
    heroCopy: { marginTop: 'auto', maxWidth: 760, padding: 56, gap: 12 },
    heroCopyNarrow: { padding: 24 },
    eyebrow: { color: '#c9efff', fontSize: 13, fontWeight: '900' },
    title: { color: '#fff', fontSize: 50, lineHeight: 62, fontWeight: '900' },
    titleNarrow: { fontSize: 34, lineHeight: 43 },
    meta: { color: '#e2e8f0', fontSize: 16, lineHeight: 23 },
    gallery: { gap: 12 },
    galleryImage: { width: 220, height: 160, borderRadius: 14, backgroundColor: '#dbe7ee' },
    sections: { gap: 14 },
    section: { flexDirection: 'row', gap: 22, borderRadius: 18, borderWidth: 1, borderColor: memoryColors.border, backgroundColor: memoryColors.surface, padding: 28 },
    sectionNarrow: { padding: 19, gap: 14 },
    sectionNumber: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#eaf6fd', alignItems: 'center', justifyContent: 'center' },
    sectionNumberText: { fontSize: 13, fontWeight: '900', color: memoryColors.brand },
    sectionCopy: { flex: 1, gap: 12 },
    sectionHeading: { fontSize: 22, fontWeight: '900', color: memoryColors.text },
    sectionBody: { fontSize: 16, lineHeight: 28, color: '#41556c' },
    footerText: { marginTop: 12, textAlign: 'center', fontSize: 12, color: memoryColors.textFaint },
});
