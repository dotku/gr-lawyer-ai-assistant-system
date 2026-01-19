'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import AIChatView from '@/components/chat/AIChatView';

export default function DemoChatPage() {
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href={`/${locale}`}
                className="text-xl font-bold text-blue-600 dark:text-blue-400"
              >
                GR Lawyer Assistant
              </Link>
              <span className="px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full">
                DEMO MODE
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/${locale}/demo`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Case Demo
              </Link>
              <Link
                href={`/${locale}/demo-intake`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Intake Demo
              </Link>
              <Link
                href={`/${locale}/auth/register`}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Notice */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 dark:text-blue-400 text-2xl">🤖</div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                AI Chat with Transcripts & Documents
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Record audio, upload audio files, or upload documents (PDF/Word/Images).
                The AI will analyze the content and answer your questions.
              </p>
            </div>
          </div>
        </div>

        {/* AI Chat View */}
        <AIChatView />
      </div>
    </div>
  );
}
