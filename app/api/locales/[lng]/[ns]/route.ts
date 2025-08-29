import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { HTTP_NOT_FOUND, HTTP_INTERNAL_SERVER_ERROR, HTTP_OK } from '@/lib/services/error-handler';


const ALLOWED_LOCALES = ['en', 'fa', 'ar'] as const;
const ALLOWED_NAMESPACES = [
  'common',
'dashboard',
'budget',
'goals',
  'transactions',
'education',
'settings',
'auth',
'errors',
] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { lng: string; ns: string } },
) {
  const { lng, ns } = params;

  // Validate locale and namespace
  if (!ALLOWED_LOCALES.includes(lng as any) || !ALLOWED_NAMESPACES.includes(ns as any)) {
    return NextResponse.json(
      { error: 'Invalid locale or namespace' },
      {
        status: HTTP_NOT_FOUND,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      },
    );
  }

  try {
    const filePath = join(process.cwd(), 'public', 'locales', lng, `${ns}.json`);

    // Check if file exists before trying to read it
    if (!existsSync(filePath)) {
      console.warn(`Translation file not found: ${lng}/${ns}.json`);
      return NextResponse.json(
        { error: 'Translation file not found' },
        {
          status: HTTP_NOT_FOUND,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        },
      );
    }

    const fileContent = readFileSync(filePath, 'utf8');
    const translations = JSON.parse(fileContent);

    return NextResponse.json(translations, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate', // Disable caching for instant language switching
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error(`Failed to load translation file: ${lng}/${ns}.json`, error);
    return NextResponse.json(
      { error: 'Failed to parse translation file' },
      {
        status: HTTP_INTERNAL_SERVER_ERROR,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      },
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: HTTP_OK,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
