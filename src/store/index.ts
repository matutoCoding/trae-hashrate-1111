import { create } from 'zustand';
import type {
  SealApplication,
  Seal,
  User,
  ApprovalRecord,
  SealRegistration,
  ApplicationStatus,
  SealStatus,
  UrgencyLevel,
  ApprovalNode,
} from '../../shared/types';
import {
  mockApplications,
  mockSeals,
  mockUsers,
  mockApprovalRecords,
  mockRegistrations,
} from '../../shared/mockData';

interface AppState {
  currentUser: User | null;
  applications: SealApplication[];
  seals: Seal[];
  users: User[];
  approvalRecords: ApprovalRecord[];
  registrations: SealRegistration[];
  setCurrentUser: (userId: string) => void;
  addApplication: (application: SealApplication) => void;
  updateApplication: (id: string, data: Partial<SealApplication>) => void;
  getApplicationById: (id: string) => SealApplication | undefined;
  getPendingApprovalsCount: () => number;
  getThisMonthSealCount: () => number;
  getExpiringSeals: (days: number) => Seal[];
  getSealTypeDistribution: () => { type: string; count: number }[];
  getRecentApplications: (limit: number) => SealApplication[];
  getMyPendingApprovals: () => SealApplication[];
  approveApplication: (applicationId: string, opinion: string) => void;
  rejectApplication: (applicationId: string, opinion: string) => void;
  addSeal: (seal: Seal) => void;
  updateSeal: (id: string, data: Partial<Seal>) => void;
  enableSeal: (id: string) => void;
  getAvailableSealsByType: (sealType: string) => Seal[];
  addRegistration: (registration: SealRegistration) => void;
  getRegistrationById: (id: string) => SealRegistration | undefined;
  getApprovedApplicationsWithoutRegistration: () => SealApplication[];
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: mockUsers.find((u) => u.id === 'u004') || mockUsers[0],
  applications: mockApplications,
  seals: mockSeals,
  users: mockUsers,
  approvalRecords: mockApprovalRecords,
  registrations: mockRegistrations,

  setCurrentUser: (userId) =>
    set((state) => {
      const user = state.users.find((u) => u.id === userId);
      return { currentUser: user || state.currentUser };
    }),

  addApplication: (application) =>
    set((state) => ({
      applications: [application, ...state.applications],
    })),

  updateApplication: (id, data) =>
    set((state) => ({
      applications: state.applications.map((app) =>
        app.id === id ? { ...app, ...data, updatedAt: new Date().toISOString() } : app
      ),
    })),

  getApplicationById: (id) => get().applications.find((app) => app.id === id),

  getPendingApprovalsCount: () => {
    const { applications } = get();
    return applications.filter(
      (app) => app.status === 'pending_dept' || app.status === 'pending_leader'
    ).length;
  },

  getThisMonthSealCount: () => {
    const { applications } = get();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return applications
      .filter((app) => {
        const createdAt = new Date(app.createdAt);
        return (
          createdAt.getMonth() === currentMonth &&
          createdAt.getFullYear() === currentYear &&
          (app.status === 'approved' || app.status === 'registered')
        );
      })
      .reduce((sum, app) => sum + app.quantity, 0);
  },

  getExpiringSeals: (days) => {
    const { seals } = get();
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return seals.filter((seal) => {
      const expiryDate = new Date(seal.expiryDate);
      return expiryDate <= threshold && expiryDate >= now;
    });
  },

  getSealTypeDistribution: () => {
    const { applications } = get();
    const distribution: Record<string, number> = {};
    applications.forEach((app) => {
      distribution[app.sealType] = (distribution[app.sealType] || 0) + 1;
    });
    return Object.entries(distribution).map(([type, count]) => ({ type, count }));
  },

  getRecentApplications: (limit) => {
    const { applications } = get();
    return [...applications]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  getMyPendingApprovals: () => {
    const { applications, currentUser } = get();
    if (!currentUser) return [];
    if (currentUser.role === 'dept_head') {
      return applications.filter((app) => app.status === 'pending_dept');
    } else if (currentUser.role === 'leader') {
      return applications.filter((app) => app.status === 'pending_leader');
    }
    return [];
  },

  approveApplication: (applicationId, opinion) => {
    const { applications, currentUser, approvalRecords } = get();
    const application = applications.find((app) => app.id === applicationId);
    if (!application || !currentUser) return;

    let newStatus: ApplicationStatus;
    let newCurrentNode: ApprovalNode;

    if (application.currentNode === 'dept_head') {
      newStatus = 'pending_leader';
      newCurrentNode = 'leader';
    } else if (application.currentNode === 'leader') {
      newStatus = 'approved';
      newCurrentNode = 'leader';
    } else {
      return;
    }

    const newApprovalRecord: ApprovalRecord = {
      id: `ar${Date.now()}`,
      applicationId,
      node: application.currentNode,
      approverId: currentUser.id,
      approverName: currentUser.name,
      action: 'approve',
      opinion,
      timestamp: new Date().toISOString(),
    };

    set({
      applications: applications.map((app) =>
        app.id === applicationId
          ? {
              ...app,
              status: newStatus,
              currentNode: newCurrentNode,
              approvalTrail: [...app.approvalTrail, newApprovalRecord],
              updatedAt: new Date().toISOString(),
            }
          : app
      ),
      approvalRecords: [...approvalRecords, newApprovalRecord],
    });
  },

  rejectApplication: (applicationId, opinion) => {
    const { applications, currentUser, approvalRecords } = get();
    const application = applications.find((app) => app.id === applicationId);
    if (!application || !currentUser) return;

    let newCurrentNode: ApprovalNode;

    if (application.currentNode === 'dept_head') {
      newCurrentNode = 'submitter';
    } else if (application.currentNode === 'leader') {
      newCurrentNode = 'dept_head';
    } else {
      return;
    }

    const newApprovalRecord: ApprovalRecord = {
      id: `ar${Date.now()}`,
      applicationId,
      node: application.currentNode,
      approverId: currentUser.id,
      approverName: currentUser.name,
      action: 'reject',
      opinion,
      timestamp: new Date().toISOString(),
    };

    set({
      applications: applications.map((app) =>
        app.id === applicationId
          ? {
              ...app,
              status: 'rejected',
              currentNode: newCurrentNode,
              approvalTrail: [...app.approvalTrail, newApprovalRecord],
              updatedAt: new Date().toISOString(),
            }
          : app
      ),
      approvalRecords: [...approvalRecords, newApprovalRecord],
    });
  },

  addSeal: (seal) =>
    set((state) => ({
      seals: [seal, ...state.seals],
    })),

  updateSeal: (id, data) =>
    set((state) => ({
      seals: state.seals.map((seal) =>
        seal.id === id ? { ...seal, ...data, updatedAt: new Date().toISOString() } : seal
      ),
    })),

  enableSeal: (id) =>
    set((state) => ({
      seals: state.seals.map((seal) =>
        seal.id === id
          ? {
              ...seal,
              status: 'in_use' as SealStatus,
              enableDate: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : seal
      ),
    })),

  getAvailableSealsByType: (sealType) => {
    const { seals } = get();
    return seals.filter(
      (seal) => seal.sealType === sealType && (seal.status === 'stored' || seal.status === 'in_use')
    );
  },

  addRegistration: (registration) =>
    set((state) => ({
      registrations: [registration, ...state.registrations],
    })),

  getRegistrationById: (id) => get().registrations.find((reg) => reg.id === id),

  getApprovedApplicationsWithoutRegistration: () => {
    const { applications, registrations } = get();
    const registeredApplicationIds = new Set(registrations.map((reg) => reg.applicationId));
    return applications.filter(
      (app) => app.status === 'approved' && !registeredApplicationIds.has(app.id)
    );
  },
}));

export type { ApplicationStatus, SealStatus, UrgencyLevel };
