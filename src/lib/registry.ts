import type { CategoryId, IconName, ToolDef } from './types';

export const CATEGORY_META: Record<CategoryId, { label: string; blurb: string }> = {
  image: { label: 'Image tools', blurb: 'Compress, convert and analyze images locally.' },
  pdf: { label: 'PDF tools', blurb: 'Merge, split and organize PDF documents.' },
  generate: { label: 'Generators', blurb: 'Create QR codes quickly and privately.' },
  analyze: { label: 'Image analysis', blurb: 'Extract professional color palettes from images.' }
};

export const TOOLS: ToolDef[] = [
  {
    id: 'image-compressor',
    slug: 'image-compressor',
    name: 'Image Compressor',
    category: 'image',
    icon: 'compress',
    tagline: 'Compress JPG, PNG, WebP and AVIF images while controlling quality, dimensions and file size.',
    description:
      'Reduce the file size of JPG, PNG, WebP and AVIF images without uploading them anywhere. Compress single images or batches, adjust quality, resize to common presets, strip metadata and compare the before and after result.',
    tags: ['JPG', 'PNG', 'WebP', 'Batch'],
    keywords: ['compress image', 'reduce image size', 'optimize jpg', 'png compression', 'webp']
  },
  {
    id: 'image-converter',
    slug: 'image-converter',
    name: 'Image Converter',
    category: 'image',
    icon: 'convert',
    tagline: 'Convert images between JPG, PNG, WebP and AVIF, with quality and resize controls.',
    description:
      'Convert images between JPG, PNG, WebP and AVIF formats directly in your browser. Batch conversion, quality control, resizing, transparency flattening and ZIP download are all included.',
    tags: ['JPG', 'PNG', 'WebP', 'AVIF'],
    keywords: ['convert image', 'jpg to png', 'png to webp', 'change image format', 'transparency']
  },
  {
    id: 'pdf-merger',
    slug: 'pdf-merger',
    name: 'PDF Merger',
    category: 'pdf',
    icon: 'merge',
    tagline: 'Combine multiple PDFs into a single document and reorder files before merging.',
    description:
      'Merge several PDF files into one document. Add PDFs, drag them into the right order, duplicate or remove files, then merge  -  all locally in your browser.',
    tags: ['PDF', 'Merge', 'Reorder'],
    keywords: ['merge pdf', 'combine pdf', 'join pdf files', 'pdf combine']
  },
  {
    id: 'pdf-splitter',
    slug: 'pdf-splitter',
    name: 'PDF Splitter',
    category: 'pdf',
    icon: 'split',
    tagline: 'Split a PDF by page ranges, selected pages, every page, or fixed-size groups.',
    description:
      'Split a PDF into multiple documents. Extract selected pages, split by ranges like 1-5, split every page into its own PDF, or split into equal groups of pages.',
    tags: ['PDF', 'Split', 'Ranges'],
    keywords: ['split pdf', 'pdf extract pages', 'divide pdf', 'separate pdf pages']
  },
  {
    id: 'pdf-extractor',
    slug: 'pdf-extractor',
    name: 'PDF Page Extractor',
    category: 'pdf',
    icon: 'extract',
    tagline: 'Visually select pages from a PDF and extract them into a new document.',
    description:
      'Preview every page of a PDF, select the ones you need with your mouse or keyboard, and extract them into a brand new PDF file.',
    tags: ['PDF', 'Extract', 'Select'],
    keywords: ['extract pdf pages', 'pdf page selector', 'pull pages from pdf']
  },
  {
    id: 'pdf-reorder',
    slug: 'pdf-reorder',
    name: 'PDF Reorder',
    category: 'pdf',
    icon: 'reorder',
    tagline: 'Reorder, rotate and delete pages in a visual PDF page grid.',
    description:
      'Rearrange the pages of a PDF in a visual grid. Drag to reorder, rotate pages, remove unwanted pages and export a reorganized PDF.',
    tags: ['PDF', 'Reorder', 'Rotate'],
    keywords: ['reorder pdf pages', 'pdf page organizer', 'rotate pdf pages', 'delete pdf pages']
  },
  {
    id: 'qr-generator',
    slug: 'qr-generator',
    name: 'QR Code Generator',
    category: 'generate',
    icon: 'qr',
    tagline: 'Generate QR codes for URLs, Wi-Fi, contacts, email, SMS and more.',
    description:
      'Create QR codes for links, plain text, email, phone, SMS, Wi-Fi networks, contacts and calendar events. Customize colors, size and error correction, then export as PNG or SVG.',
    tags: ['QR', 'Wi-Fi', 'vCard'],
    keywords: ['qr code generator', 'wifi qr code', 'vcard qr', 'create qr', 'qr png svg']
  },
  {
    id: 'color-palette-extractor',
    slug: 'color-palette-extractor',
    name: 'Color Palette Extractor',
    category: 'analyze',
    icon: 'palette',
    tagline: 'Extract professional color palettes from any image with real quantization.',
    description:
      'Pull dominant, vibrant and muted color palettes out of images using median-cut quantization. Copy HEX, RGB, HSL and CSS variables, or export the palette as JSON.',
    tags: ['Palette', 'HEX', 'CSS'],
    keywords: ['color palette from image', 'extract colors', 'image color picker', 'dominant colors', 'hex from image']
  }
];

export const TOOL_BY_ID: Record<string, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t])
);

export const TOOL_BY_SLUG: Record<string, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.slug, t])
);

export function searchTools(query: string): ToolDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return TOOLS;
  const score = (t: ToolDef): number => {
    const hay = [
      t.name,
      t.tagline,
      t.description,
      t.tags.join(' '),
      t.keywords.join(' '),
      t.category,
      ...t.keywords
    ]
      .join(' ')
      .toLowerCase();
    if (hay.includes(q)) {
      if (t.name.toLowerCase().includes(q)) return 3;
      if (t.tags.some((tag) => tag.toLowerCase().includes(q))) return 2;
      return 1;
    }
    return 0;
  };
  return TOOLS.filter((t) => score(t) > 0).sort((a, b) => score(b) - score(a));
}

export function toolsByCategory(category: CategoryId): ToolDef[] {
  return TOOLS.filter((t) => t.category === category);
}
