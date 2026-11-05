import React, { useState } from 'react';
import { Alert, Platform, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { memoryColors } from '../../constants/memoryTheme';
import { createShare, disableShare, sharePageUrl } from '../../services/exportService';

interface Props {
    noteId: string;
}

export function ShareExport({ noteId }: Props) {
    const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
    const [shareId, setShareId] = useState('');
    const [shareUrl, setShareUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const generate = async () => {
        setLoading(true);
        try {
            const created = await createShare(noteId, expiresInDays);
            setShareId(created.shareId);
            setShareUrl(sharePageUrl(created.shareId));
        } catch (error: any) {
            Alert.alert('공유 링크 생성 실패', error?.message || '잠시 후 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    const copyOrShare = async () => {
        if (!shareUrl) return;
        if (Platform.OS === 'web' && navigator?.clipboard) {
            await navigator.clipboard.writeText(shareUrl);
            window.alert('공유 링크를 복사했습니다.');
            return;
        }
        await Share.share({ message: shareUrl, url: shareUrl, title: '추억 노트 공유' });
    };

    const revoke = async () => {
        if (!shareId) return;
        setLoading(true);
        try {
            await disableShare(shareId);
            setShareId('');
            setShareUrl('');
            Alert.alert('링크 비활성화 완료', '이 링크로는 더 이상 추억 노트를 볼 수 없습니다.');
        } catch (error: any) {
            Alert.alert('링크 비활성화 실패', error?.message || '잠시 후 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.notice}>
                <Text style={styles.noticeTitle}>읽기 전용 공유 페이지</Text>
                <Text style={styles.noticeText}>
                    링크를 아는 사람은 로그인 없이 사진과 완성된 글을 감상할 수 있습니다. 편집·삭제 기능은 보이지 않습니다.
                </Text>
            </View>

            <Text style={styles.label}>링크 만료</Text>
            <View style={styles.chipRow}>
                {[
                    { label: '만료 없음', value: undefined },
                    { label: '7일', value: 7 },
                    { label: '30일', value: 30 },
                ].map((item) => (
                    <TouchableOpacity
                        key={item.label}
                        style={[styles.chip, expiresInDays === item.value && styles.chipActive]}
                        onPress={() => setExpiresInDays(item.value)}
                    >
                        <Text style={[styles.chipText, expiresInDays === item.value && styles.chipTextActive]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {shareUrl ? (
                <View style={styles.resultBox}>
                    <Text style={styles.resultLabel}>생성된 공유 링크</Text>
                    <TextInput value={shareUrl} editable={false} selectTextOnFocus style={styles.urlInput} />
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.primaryButton} onPress={copyOrShare}>
                            <Text style={styles.primaryButtonText}>{Platform.OS === 'web' ? '링크 복사' : '링크 공유'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dangerButton} onPress={revoke} disabled={loading}>
                            <Text style={styles.dangerButtonText}>링크 비활성화</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity style={styles.primaryButton} onPress={generate} disabled={loading}>
                    <Text style={styles.primaryButtonText}>{loading ? '링크 만드는 중…' : '공유 링크 생성'}</Text>
                </TouchableOpacity>
            )}

            <Text style={styles.futureText}>비밀번호 보호는 다음 확장을 위해 백엔드 필드를 예약해 두었습니다.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 18 },
    notice: { borderRadius: 14, borderWidth: 1, borderColor: '#a8ddf5', backgroundColor: '#eef9fe', padding: 16, gap: 7 },
    noticeTitle: { fontSize: 16, fontWeight: '800', color: memoryColors.brand },
    noticeText: { fontSize: 13, lineHeight: 20, color: memoryColors.textMuted },
    label: { fontSize: 14, fontWeight: '800', color: memoryColors.text },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderColor: memoryColors.border, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9 },
    chipActive: { borderColor: memoryColors.brand, backgroundColor: '#eaf6fd' },
    chipText: { fontSize: 13, fontWeight: '700', color: memoryColors.textMuted },
    chipTextActive: { color: memoryColors.brand },
    resultBox: { gap: 12 },
    resultLabel: { fontSize: 13, fontWeight: '800', color: memoryColors.text },
    urlInput: { borderWidth: 1, borderColor: memoryColors.border, borderRadius: 10, padding: 12, color: memoryColors.text, backgroundColor: '#fbfdff' },
    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    primaryButton: { minHeight: 48, borderRadius: 11, backgroundColor: memoryColors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    dangerButton: { minHeight: 48, borderRadius: 11, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff7f7', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    dangerButtonText: { color: '#dc2626', fontSize: 14, fontWeight: '800' },
    futureText: { fontSize: 12, color: memoryColors.textFaint },
});
