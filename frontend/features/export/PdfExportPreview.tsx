import React from 'react';
import { ExportPreview } from './ExportPreview';
import { ExportOptions, ExportPhotoSource, ExportPreviewData } from './types';

export function PdfExportPreview(props: {
    preview: ExportPreviewData;
    options: ExportOptions;
    onChange: (next: ExportOptions) => void;
    onPhotoSourceChange: (source: ExportPhotoSource) => void;
    mobile?: boolean;
}) {
    return <ExportPreview kind="pdf" {...props} />;
}
