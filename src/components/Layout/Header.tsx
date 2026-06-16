import { useState } from 'react';
import { Bell, ChevronDown, User, Users } from 'lucide-react';
import type { UserRole } from '@/shared/types';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
}

const roleLabels: Record<UserRole, string> = {
  employee: '普通员工',
  dept_head: '部门负责人',
  leader: '公司领导',
  seal_admin: '印章管理员',
  admin: '系统管理员',
};

export function Header({ title = '仪表盘' }: HeaderProps) {
  const { currentUser, users, setCurrentUser } = useAppStore();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="relative w-9 h-9 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </button>
        <div className="h-8 w-px bg-gray-200" />
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen((v) => !v)}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-md px-2 py-1.5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">
                {currentUser.name}
              </div>
              <div className="text-xs text-gray-500">
                {roleLabels[currentUser.role]}
              </div>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                roleDropdownOpen && 'rotate-180'
              )}
            />
          </button>
          {roleDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setRoleDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg z-20 py-1.5">
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <Users className="w-3.5 h-3.5" />
                    切换角色预览
                  </div>
                </div>
                <div className="py-1">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setCurrentUser(user.id);
                        setRoleDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors',
                        currentUser.id === user.id && 'bg-primary-50'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {user.department} · {roleLabels[user.role]}
                        </div>
                      </div>
                      {currentUser.id === user.id && (
                        <div className="w-2 h-2 rounded-full bg-primary-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
