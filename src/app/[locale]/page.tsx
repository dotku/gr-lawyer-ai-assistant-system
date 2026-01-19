'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import Header from '@/components/Header';

export default function Home() {
  const t = useTranslations('home');
  const locale = useLocale();

  const features = [
    {
      icon: '📋',
      title: t('features.caseManagement'),
      description: t('features.caseManagementDesc'),
    },
    {
      icon: '📄',
      title: t('features.documentProcessing'),
      description: t('features.documentProcessingDesc'),
    },
    {
      icon: '🤖',
      title: t('features.aiAssistant'),
      description: t('features.aiAssistantDesc'),
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            {t('title')}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/demo-chat`}
              className="px-8 py-3 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              AI Chat Demo
            </Link>
            <Link
              href={`/${locale}/demo`}
              className="px-8 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Case Management Demo
            </Link>
            <Link
              href={`/${locale}/auth/register`}
              className="px-8 py-3 text-base font-medium text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors dark:bg-gray-800 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-gray-700"
            >
              {t('getStarted')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
          {t('features.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600 dark:text-gray-400">
            © 2025 GR Lawyer Assistant System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
