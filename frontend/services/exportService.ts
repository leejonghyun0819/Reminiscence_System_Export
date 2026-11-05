import { fetch as expoFetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { apiUrl, resolveBackendMediaUrls } from '../config/api';
import {
    ExportKind,
    ExportOptions,
    ExportPhotoSource,
    ExportPreviewData,
    ShareCreateResponse,
    SharedMemoryResponse,
} from '../features/export/types';

async function errorMessage(response: Response): Promise<string> {
    try {
        const body = await response.json();
        return String(body?.detail || body?.message || `HTTP ${response.status}`);
    } catch {
        return `HTTP ${response.status}`;
    }
}

function filenameFromHeaders(response: Response, fallback: string): string {
    const disposition = response.headers.get('content-disposition') || '';
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1].replace(/^"|"$/g, ''));
        } catch {
            return fallback;
        }
    }
    const basicMatch = disposition.match(/filename="?([^";]+)"?/i);
    return basicMatch?.[1] || fallback;
}

const EXPORT_META: Record<Exclude<ExportKind, 'share'>, { extension: string; mimeType: string }> = {
    pdf: { extension: 'pdf', mimeType: 'application/pdf' },
    cards: { extension: 'zip', mimeType: 'application/zip' },
    video: { extension: 'mp4', mimeType: 'video/mp4' },
    zip: { extension: 'zip', mimeType: 'application/zip' },
};

export async function getExportPreview(
    noteId: string,
    photoSource: ExportPhotoSource = 'preferred',
): Promise<ExportPreviewData> {
    const response = await fetch(
        apiUrl(`/api/export/preview/${encodeURIComponent(noteId)}?photoSource=${encodeURIComponent(photoSource)}`),
    );
    if (!response.ok) throw new Error(await errorMessage(response));
    return resolveBackendMediaUrls<ExportPreviewData>(await response.json());
}

export async function downloadExportFile(
    kind: Exclude<ExportKind, 'share'>,
    noteId: string,
    options: ExportOptions,
): Promise<string> {
    const endpoint = apiUrl(`/api/export/${kind}/${encodeURIComponent(noteId)}`);
    const fallback = `reminiscence_${Date.now()}.${EXPORT_META[kind].extension}`;

    if (Platform.OS === 'web') {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options),
        });
        if (!response.ok) throw new Error(await errorMessage(response));
        const filename = filenameFromHeaders(response, fallback);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
        return filename;
    }

    const response = await expoFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
    });
    if (!response.ok) throw new Error(await errorMessage(response as unknown as Response));
    const filename = filenameFromHeaders(response as unknown as Response, fallback);
    const file = new File(Paths.cache, filename);
    if (file.exists) file.delete();
    file.create({ intermediates: true, overwrite: true });
    file.write(await response.bytes());

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
            mimeType: EXPORT_META[kind].mimeType,
            dialogTitle: '추억 노트 내보내기',
        });
    }
    return filename;
}

export async function createShare(noteId: string, expiresInDays?: number): Promise<ShareCreateResponse> {
    const response = await fetch(apiUrl(`/api/share/${encodeURIComponent(noteId)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays }),
    });
    if (!response.ok) throw new Error(await errorMessage(response));
    return response.json();
}

export async function disableShare(shareId: string): Promise<void> {
    const response = await fetch(apiUrl(`/api/share/${encodeURIComponent(shareId)}`), { method: 'DELETE' });
    if (!response.ok) throw new Error(await errorMessage(response));
}

export async function getSharedMemory(shareId: string): Promise<SharedMemoryResponse> {
    const response = await fetch(apiUrl(`/api/share/${encodeURIComponent(shareId)}`));
    if (!response.ok) throw new Error(await errorMessage(response));
    return resolveBackendMediaUrls<SharedMemoryResponse>(await response.json());
}

export function sharePageUrl(shareId: string): string {
    const configuredBase = process.env.EXPO_PUBLIC_SHARE_BASE_URL?.trim().replace(/\/$/, '');
    if (configuredBase) return `${configuredBase}/share/${shareId}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return `${window.location.origin}/share/${shareId}`;
    }
    return Linking.createURL(`/share/${shareId}`);
}
