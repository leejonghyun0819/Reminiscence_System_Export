export interface PhotoLocationMetadata {
    latitude: number;
    longitude: number;
    source: 'exif';
}

export interface PhotoMetadataItem {
    photoIndex: number;
    capturedAt?: string;
    location?: PhotoLocationMetadata;
    source: 'photo_exif';
}

export interface PhotoAnalysisPayload {
    base64: string;
    mimeType: string;
    exif?: Record<string, unknown> | null;
}
