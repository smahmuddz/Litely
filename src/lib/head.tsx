import { useEffect } from 'react';

interface PageMeta {
  title: string;
  description: string;
  canonicalPath?: string;
  jsonLd?: object | object[];
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(data: object | object[]): void {
  document.querySelectorAll('script[data-jsonld="route"]').forEach((n) => n.remove());
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-jsonld', 'route');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Client-side SEO helper. Keeps <title>, meta description, canonical,
 * Open Graph tags and route-level structured data in sync with the route.
 * For true pre-rendered SEO, a static host can additionally serve each
 * route shell  -  the metadata below matches those routes 1:1.
 */
export function usePageMeta({ title, description, canonicalPath, jsonLd }: PageMeta): void {
  useEffect(() => {
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    const path = canonicalPath ?? window.location.pathname;
    const canonical = `${window.location.origin}${path === '/' ? '' : path}`;
    upsertCanonical(path === '/' ? `${window.location.origin}/` : `${canonical}/`);
    if (jsonLd) setJsonLd(jsonLd);
    else {
      document.querySelectorAll('script[data-jsonld="route"]').forEach((n) => n.remove());
    }
  }, [title, description, canonicalPath, jsonLd]);
}
