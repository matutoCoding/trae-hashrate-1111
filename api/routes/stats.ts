import { Router, type Request, type Response } from 'express';
import dataStore from '../dataStore.js';
import type { ApplicationStatus, DashboardStats } from '../../shared/types.js';

const router = Router();

router.get('/dashboard', (req: Request, res: Response): void => {
  try {
    const applications = dataStore.getAll('applications');
    const seals = dataStore.getAll('seals');
    const approvals = dataStore.getAll('approvalRecords');

    const pendingApprovals = applications.filter(
      (app) => app.status === 'pending_dept' || app.status === 'pending_leader',
    ).length;

    const totalApplications = applications.length;
    const approvedApplications = applications.filter(
      (app) => app.status === 'approved' || app.status === 'registered',
    ).length;
    const rejectedApplications = applications.filter(
      (app) => app.status === 'rejected',
    ).length;
    const registeredApplications = applications.filter(
      (app) => app.status === 'registered',
    ).length;

    const totalSeals = seals.length;
    const warningSeals = seals.filter((s) => s.status === 'warning').length;
    const expiredSeals = seals.filter((s) => s.status === 'expired').length;
    const inUseSeals = seals.filter((s) => s.status === 'in_use').length;

    const monthlyTrend = generateMonthlyTrend(applications, approvals);
    const statusDistribution = generateStatusDistribution(applications);

    const stats: DashboardStats = {
      pendingApprovals,
      totalApplications,
      approvedApplications,
      rejectedApplications,
      registeredApplications,
      totalSeals,
      warningSeals,
      expiredSeals,
      inUseSeals,
      monthlyTrend,
      statusDistribution,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取统计数据失败',
    });
  }
});

function generateMonthlyTrend(
  applications: { createdAt: string }[],
  approvals: { timestamp: string; action: string }[],
) {
  const months: { [key: string]: { applications: number; approvals: number } } = {};
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = { applications: 0, approvals: 0 };
  }

  applications.forEach((app) => {
    const d = new Date(app.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      months[key].applications++;
    }
  });

  approvals.forEach((a) => {
    if (a.action === 'approve') {
      const d = new Date(a.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].approvals++;
      }
    }
  });

  return Object.entries(months).map(([month, data]) => ({
    month,
    applications: data.applications,
    approvals: data.approvals,
  }));
}

function generateStatusDistribution(applications: { status: ApplicationStatus }[]) {
  const statuses: ApplicationStatus[] = [
    'draft',
    'pending_dept',
    'pending_leader',
    'approved',
    'rejected',
    'registered',
    'cancelled',
  ];

  return statuses.map((status) => ({
    status,
    count: applications.filter((app) => app.status === status).length,
  }));
}

export default router;
