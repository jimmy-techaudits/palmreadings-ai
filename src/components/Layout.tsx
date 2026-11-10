import type { ReactNode } from 'react';

const LOGO = 'https://palmreadings.ai/wp-content/uploads/2025/12/palm-readings-ai-logo.png';

export function Layout({ children, onHome }: { children: ReactNode; onHome: () => void }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="print:hidden">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-4 sm:px-6">
          <a href="https://palmreadings.ai" aria-label="Palm Readings AI home">
            <img src={LOGO} alt="Palm Readings AI" className="h-12 w-auto sm:h-14" />
          </a>
          <button onClick={onHome} className="text-sm font-semibold text-violet-200 hover:text-white">
            New reading
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-6 sm:px-6">{children}</main>

      <footer className="border-t border-white/5 bg-night-900/60 print:hidden">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 text-sm text-violet-200/70 sm:px-6 md:grid-cols-3">
          <div className="flex flex-col items-start gap-3">
            <img src={LOGO} alt="Palm Readings AI" className="h-10 w-auto" />
            <p>© {new Date().getFullYear()} Palm Readings AI. All rights reserved.</p>
          </div>
          <nav className="flex flex-col gap-2" aria-label="Company">
            <span className="font-bold text-white">Company</span>
            <a className="hover:text-gold-400" href="https://palmreadings.ai/about/">About us</a>
            <a className="hover:text-gold-400" href="https://palmreadings.ai/contact/">Contact</a>
          </nav>
          <p className="text-xs italic leading-relaxed">
            Readings are generated using artificial intelligence and traditional palmistry, and are intended for
            entertainment and reflection only. They are not professional, medical, legal, or financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
