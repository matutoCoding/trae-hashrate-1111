import { cn } from '@/lib/utils';
import type { ApplicationStatus, SealStatus, UrgencyLevel } from '@/shared/types';

interface StatusBadgeProps {
  status: ApplicationStatus | SealStatus | UrgencyLevel;
  type?: 'application' | 'seal' | 'urgency';
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-gray-100 text-gray-800' },
  pending_dept: { label: '待部门审批', className: 'bg-amber-100 text-amber-800' },
  pending_leader: { label: '待领导审批', className: 'bg-orange-100 text-orange-800' },
  approved: { label: '审批通过', className: 'bg-green-100 text-green-800' },
  rejected: { label: '已驳回', className: 'bg-red-100 text-red-800' },
  registered: { label: '已登记', className: 'bg-sky-100 text-sky-800' },
  cancelled: { label: '已取消', className: 'bg-gray-100 text-gray-800' },
  stored: { label: '入库', className: 'bg-green-100 text-green-800' },
  in_use: { label: '使用中', className: 'bg-amber-100 text-amber-800' },
  warning: { label: '临期', className: 'bg-orange-100 text-orange-800' },
  expired: { label: '已过期', className: 'bg-red-100 text-red-800' },
  locked: { label: '已锁定', className: 'bg-gray-100 text-gray-800' },
  normal: { label: '普通', className: 'bg-green-100 text-green-800' },
  urgent: { label: '紧急', className: 'bg-amber-100 text-amber-800' },
  emergency: { label: '特急', className: 'bg-red-100 text-red-800' },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
