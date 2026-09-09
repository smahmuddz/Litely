import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/head';
import { Icon } from '../components/icons';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="prose-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function PrivacyPage() {
  usePageMeta({
    title: 'Privacy  -  Litely',
    description:
      'How Litely handles your data: files are processed locally in your browser and never uploaded.',
    canonicalPath: '/privacy'
  });
  return (
    <div className="container page page-narrow">
      <div className="page-head">
        <h1 className="page-title">Privacy</h1>
        <p className="page-sub">Simple, honest privacy. Your data stays on your device.</p>
      </div>
      <div className="privacy-hero">
        <Icon name="shield" size={26} />
        <div>
          <strong>Files never leave your device.</strong>
          <p>
            Litely is built around one principle: when you process something in your browser,
            it stays in your browser.
          </p>
        </div>
      </div>

      <Section title="Files are processed locally">
        <p>
          Image compression, image conversion, PDF merging, splitting, extraction and reordering,
          QR code creation and palette extraction all run client-side in your browser using
          standard Web APIs. Your files are read from disk, processed in memory and are never
          transmitted over the network.
        </p>
      </Section>

      <Section title="Nothing leaves your device">
        <p>
          Every tool reads your files on this device, processes them locally and shows you the
          result  -  nothing is uploaded, logged or kept in an account. Anything you make here
          (a merged PDF, a QR code, a palette) is yours to download and is forgotten the moment
          you leave the page.
        </p>
      </Section>

      <Section title="What is stored locally">
        <p>
          A few harmless preferences are saved in your browser's <code>localStorage</code>:
        </p>
        <ul>
          <li>Your theme choice (light / dark / system)</li>
          <li>Your favorite tools</li>
          <li>A short list of recently opened tools</li>
          <li>A few behavior toggles from Settings</li>
        </ul>
        <p>
          We never store uploaded files, file contents or generated results. “Recent” features are
          limited to tool names, and only on the device you're using.
        </p>
      </Section>

      <Section title="Analytics (if enabled)">
        <p>
          If analytics are ever enabled, only anonymous product-level events would be tracked  - 
          such as “a compression completed”  -  never file names, file contents or any generated
          data.
        </p>
      </Section>

      <Section title="Third-party services">
        <p>
          Today, every core feature works without a backend. If a future feature ever requires a
          third-party service (for example payment processing), it will be clearly labelled before
          you use it, and the core browser-based tools will remain free of it.
        </p>
      </Section>

      <div className="privacy-foot">
        <Link to="/" className="btn btn-secondary">
          <Icon name="arrowLeft" size={15} /> Back to tools
        </Link>
      </div>
    </div>
  );
}

export function AboutPage() {
  usePageMeta({
    title: 'About  -  Litely',
    description:
      'Useful tools without unnecessary complexity. Learn about the Litely philosophy.',
    canonicalPath: '/about'
  });
  return (
    <div className="container page page-narrow">
      <div className="page-head">
        <h1 className="page-title">About Litely</h1>
        <p className="page-sub">Useful tools without unnecessary complexity.</p>
      </div>

      <Section title="The idea">
        <p>
          Everyday utility tasks  -  compressing a screenshot, merging a few PDFs, creating a Wi-Fi
          QR code  -  should take under a minute and not cost you your privacy. Litely puts those
          tools in one polished place where they run directly in your browser.
        </p>
      </Section>
      <Section title="Designed around four values">
        <ul>
          <li>
            <strong>Privacy</strong>  -  processing happens on your device; nothing is uploaded.
          </li>
          <li>
            <strong>Speed</strong>  -  no sign-ups, no servers to wait on, results appear instantly.
          </li>
          <li>
            <strong>Accessibility</strong>  -  keyboard-friendly, screen-reader aware and responsive.
          </li>
          <li>
            <strong>Simplicity</strong>  -  focused screens with the controls you actually need.
          </li>
        </ul>
      </Section>
      <Section title="What it is not">
        <p>
          Litely does not track you, does not store your files and does not fake features. Every
          tool performs real work in your browser, and if a browser limitation gets in the way it
          tells you plainly instead of pretending.
        </p>
      </Section>
    </div>
  );
}

export function NotFoundPage() {
  usePageMeta({
    title: 'Page not found  -  Litely',
    description: 'This page does not exist.',
    canonicalPath: '/404'
  });
  return (
    <div className="container page">
      <div className="empty-state" style={{ paddingTop: 90 }}>
        <div className="empty-icon">
          <Icon name="alert" size={26} />
        </div>
        <h1 className="empty-title" style={{ fontSize: 22 }}>
          This page doesn't exist
        </h1>
        <p className="empty-text">The link may be out of date, or the page may have moved.</p>
        <div className="empty-actions">
          <Link to="/" className="btn btn-primary">
            <Icon name="home" size={15} /> Back to tools
          </Link>
        </div>
      </div>
    </div>
  );
}
