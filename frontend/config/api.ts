import { Platform } from 'react-native';

const BACKEND_STORED_API_URL = 'http://localhost:8000';
const ANDROID_EMULATOR_API_URL = 'http://10.0.2.2:8000';
const DEFAULT_API_URL =
    Platform.OS === 'android' ? ANDROID_EMULATOR_API_URL : BACKEND_STORED_API_URL;
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

/**
 * Web and the iOS simulator can use localhost.
 * The Android Studio emulator reaches the host machine through 10.0.2.2.
 * A physical phone must set EXPO_PUBLIC_API_URL to the computer's LAN address.
 */
export const API_BASE_URL = (configuredApiUrl || DEFAULT_API_URL).replace(/\/$/, '');

if (__DEV__ && Platform.OS !== 'web' && !configuredApiUrl) {
    if (Platform.OS === 'android') {
        console.info(
            '[API] Android emulator mode: using http://10.0.2.2:8000. ' +
                'For a physical Android phone, set EXPO_PUBLIC_API_URL to the computer LAN address.',
        );
    } else {
        console.warn(
            '[API] EXPO_PUBLIC_API_URL is not set. localhost works in the iOS simulator, ' +
                'but a physical iPhone needs the Mac LAN address in frontend/.env.local.',
        );
    }
}

export function apiUrl(path: string): string {
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Rebase legacy absolute localhost URLs returned by the backend for a phone or emulator. */
export function resolveBackendMediaUrl(value: string): string {
    if (!value) return value;

    if (value.startsWith('/albums/') || value.startsWith('/enhanced/')) {
        return apiUrl(value);
    }

    return value.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000(?=\/)/, API_BASE_URL);
}

/**
 * The current backend stores absolute localhost URLs in album metadata.
 * Convert a rebased UI URL back before endpoints that compare URL strings.
 */
export function toBackendStoredMediaUrl(value: string): string {
    if (!value || API_BASE_URL === BACKEND_STORED_API_URL) return value;
    if (value.startsWith(`${API_BASE_URL}/`)) {
        return `${BACKEND_STORED_API_URL}${value.slice(API_BASE_URL.length)}`;
    }
    return value;
}

/** Recursively fixes media URLs in memory/note response objects. */
export function resolveBackendMediaUrls<T>(value: T): T {
    if (typeof value === 'string') {
        return resolveBackendMediaUrl(value) as T;
    }
    if (Array.isArray(value)) {
        return value.map((item) => resolveBackendMediaUrls(item)) as T;
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, item]) => [
                key,
                resolveBackendMediaUrls(item),
            ]),
        ) as T;
    }
    return value;
}
