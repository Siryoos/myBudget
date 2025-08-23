import type { Metadata } from 'next';

import DashboardPage from './dashboard/page';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your financial overview and insights',
};

export default function HomePage() {
  return <DashboardPage />;
}

