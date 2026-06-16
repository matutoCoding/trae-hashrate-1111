import { CheckCircle, XCircle, Send, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApprovalRecord } from '../../shared/types';

interface ApprovalTimelineProps {
  records: ApprovalRecord[];
  className?: string;
}

const nodeLabels: Record<string, string> = {
  submitter: '提交申请',
  dept_head: '部门负责人审批',
  leader: '领导审批',
};

const actionLabels: Record<string, string> = {
  submit: '提交',
  approve: '同意',
  reject: '驳回',
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getActionIcon(action: string) {
  switch (action) {
    case 'approve':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'reject':
      return <XCircle className="w-5 h-5 text-red-600" />;
    case 'submit':
      return <Send className="w-5 h-5 text-primary-600" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
}

function getActionColor(action: string) {
  switch (action) {
    case 'approve':
      return 'bg-green-500';
    case 'reject':
      return 'bg-red-500';
    case 'submit':
      return 'bg-primary-500';
    default:
      return 'bg-gray-400';
  }
}

export default function ApprovalTimeline({ records, className }: ApprovalTimelineProps) {
  if (!records || records.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        暂无审批记录
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gray-200" />
      <ol className="space-y-6">
        {records.map((record) => (
          <li key={record.id} className="relative pl-12">
            <div
              className={cn(
                'absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center ring-4 ring-white',
                getActionColor(record.action)
              )}
            >
              <div className="w-5 h-5 flex items-center justify-center text-white">
                {getActionIcon(record.action)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {nodeLabels[record.node] || record.node}
                  </span>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      record.action === 'approve' && 'bg-green-100 text-green-700',
                      record.action === 'reject' && 'bg-red-100 text-red-700',
                      record.action === 'submit' && 'bg-primary-100 text-primary-700'
                    )}
                  >
                    {actionLabels[record.action] || record.action}
                  </span>
                </div>
                <span className="text-sm text-gray-500">{formatDate(record.timestamp)}</span>
              </div>
              <div className="text-sm text-gray-600 mb-1">
                审批人：<span className="text-gray-900">{record.approverName}</span>
              </div>
              {record.opinion && (
                <div className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-500">审批意见：</span>
                  {record.opinion}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
