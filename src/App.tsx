import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { AppProvider, useApp } from './lib/app';
import { usePageMeta } from './lib/head';
import { TOOL_BY_SLUG, TOOLS } from './lib/registry';
import { AppShell } from './components/layout';
import { HomePage } from './pages/Home';
import { FavoritesPage } from './pages/Favorites';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyPage, AboutPage, NotFoundPage } from './pages/InfoPages';
import type { ToolDef } from './lib/types';

const ImagePages = lazy(() =>
  import('./pages/tools/ImagePages').then((m) => ({
    default: m.ImageCompressorPage
  }))
);
const ConverterPage = lazy(() =>
  import('./pages/tools/ImagePages').then((m) => ({ default: m.ImageConverterPage }))
);
const PdfMergerPage = lazy(() =>
  import('./pages/tools/PdfPages').then((m) => ({ default: m.PdfMergerPage }))
);
const PdfSplitterPage = lazy(() =>
  import('./pages/tools/PdfPages').then((m) => ({ default: m.PdfSplitterPage }))
);
const PdfExtractorPage = lazy(() =>
  import('./pages/tools/PdfPages').then((m) => ({ default: m.PdfExtractorPage }))
);
const PdfReorderPage = lazy(() =>
  import('./pages/tools/PdfPages').then((m) => ({ default: m.PdfReorderPage }))
);
const QrPage = lazy(() => import('./pages/tools/QrPage').then((m) => ({ default: m.QrPage })));
const PalettePage = lazy(() =>
  import('./pages/tools/PalettePage').then((m) => ({ default: m.PalettePage }))
);

const PAGE_BY_ID: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  'image-compressor': ImagePages,
  'image-converter': ConverterPage,
  'pdf-merger': PdfMergerPage,
  'pdf-splitter': PdfSplitterPage,
  'pdf-extractor': PdfExtractorPage,
  'pdf-reorder': PdfReorderPage,
  'qr-generator': QrPage,
  'color-palette-extractor': PalettePage
};

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

function toolSchema(def: ToolDef, origin: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: def.name,
    url: `${origin}/tools/${def.slug}`,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any (runs in the browser)',
    description: def.description,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: def.tags
  };
}

function ToolRoute() {
  const { slug } = useParams<{ slug: string }>();
  const def = slug ? TOOL_BY_SLUG[slug] : undefined;
  const { recordRecent } = useApp();
  useEffect(() => {
    if (def) recordRecent(def.id);
  }, [def, recordRecent]);
  usePageMeta({
    title: `${def?.name ?? 'Tool'}  -  free, private, in-browser | Litely`,
    description: def?.description ?? 'A free, private browser utility from Litely.',
    canonicalPath: slug ? `/tools/${slug}` : undefined,
    jsonLd: def ? toolSchema(def, window.location.origin) : undefined
  });
  if (!def) return <NotFoundPage />;
  const Page = PAGE_BY_ID[def.id];
  if (!Page) return <NotFoundPage />;
  return (
    <Suspense fallback={<PageLoading />}>
      <Page />
    </Suspense>
  );
}

function PageLoading() {
  return (
    <div className="container page-skeleton" aria-busy="true">
      <div className="skeleton" style={{ width: 160, height: 18 }} />
      <div className="skeleton" style={{ width: 320, height: 36, marginTop: 14 }} />
      <div className="skeleton" style={{ width: '70%', maxWidth: 600, height: 16, marginTop: 14 }} />
      <div className="skeleton" style={{ width: '100%', height: 380, marginTop: 28, borderRadius: 16 }} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/tools" element={<Navigate to="/" replace />} />
            <Route path="/tools/:slug" element={<ToolRoute />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        <Analytics />
      </BrowserRouter>
    </AppProvider>
  );
}

export { TOOLS };
