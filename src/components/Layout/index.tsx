import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

const pathTitles: Record<string, string> = {
  '/': '仪表盘',
  '/applications': '用印申请',
  '/approvals': '多级审批',
  '/seals': '印章效期',
  '/registrations': '用印登记',
};

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const title = pathTitles[location.pathname] || '仪表盘';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
