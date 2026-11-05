export type ExportKind = 'pdf' | 'cards' | 'share' | 'video' | 'zip';
export type ExportTemplate = 'minimal' | 'photo_essay';
export type ExportPhotoSource = 'preferred' | 'original' | 'enhanced' | 'current';
export type CardPreset = 'portrait' | 'square' | 'landscape';

export interface ExportPhoto {
    id: string;
    url: string;
    fileName: string;
    kind: 'original' | 'enhanced';
    sourceMemoryId: string;
}

export interface ExportPreviewData {
    id: string;
    title: string;
    location: string;
    yearEstimate: string;
    sceneDescription: string;
    remembered: string;
    unremembered: string;
    reflection: string;
    category: string;
    createdAt: string;
    imageUrls: string[];
    photos: ExportPhoto[];
    availablePhotos: ExportPhoto[];
    templates: Array<{ id: ExportTemplate; label: string }>;
    cardPresets: Array<{ id: CardPreset; width: number; height: number }>;
}

export interface ExportTextOverrides {
    title: string;
    sceneDescription: string;
    remembered: string;
    unremembered: string;
    reflection: string;
}

export interface ExportOptions {
    template: ExportTemplate;
    photoSource: ExportPhotoSource;
    selectedPhotoIds: string[];
    coverPhotoId?: string;
    overrides: ExportTextOverrides;
    preset?: CardPreset;
    imageFormat?: 'png' | 'jpeg';
    includeAudio?: boolean;
}

export interface ShareCreateResponse {
    shareId: string;
    memoryId: string;
    expiresAt?: string | null;
    enabled: boolean;
}

export interface SharedMemoryResponse {
    shareId: string;
    createdAt: string;
    expiresAt?: string | null;
    memory: Omit<ExportPreviewData, 'availablePhotos' | 'templates' | 'cardPresets'>;
}
