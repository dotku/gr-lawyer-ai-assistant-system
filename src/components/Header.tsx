'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function Header() {
  const t = useTranslations('common');
  const locale = useLocale();

  return (
    <header className="w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href={`/${locale}`} className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {t('appName')}
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/demo`}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Try Demo
            </Link>
            <Link
              href={`/${locale}/demo-intake`}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Intake Demo
            </Link>
            <Link
              href={`/${locale}/auth/login`}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              {t('login')}
            </Link>
            <Link
              href={`/${locale}/auth/register`}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              {t('register')}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
