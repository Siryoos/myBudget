import { headers } from 'next/headers';
import Link from 'next/link';

export default function NotFound() {
  const h = headers();
  const locale = h.get('x-locale') || 'en';
  const dir = h.get('x-text-direction') || 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen flex items-center justify-center bg-neutral-light-gray">
        <div className="bg-white shadow-sm rounded-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-neutral-dark-gray mb-2">Page not found</h1>
          <p className="text-neutral-gray mb-6">
            The page you’re looking for doesn’t exist or was moved.
          </p>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary-trust-blue text-white hover:bg-primary-trust-blue/90"
          >
            Go to homepage
          </Link>
        </div>
      </body>
    </html>
  );
}

