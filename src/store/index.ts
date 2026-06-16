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
} from '@/shared/types';
import {
  mockApplications,
  mockSeals,
  mockUsers,
  mockApprovalRecords,
  mockRegistrations,
} from '@/shared/mockData';
import { isSealUsable, isSealExpired, isSealReadyForRegistration } from '@/shared/utils';
import {
  fetchApplications,
  fetchApplicationById,
  createApplication as apiCreateApplication,
  updateApplication as apiUpdateApplication,
  approveApplication as apiApproveApplication,
  rejectApplication as apiRejectApplication,
  fetchSeals,
  createSeal as apiCreateSeal,
  enableSeal as apiEnableSeal,
  updateSeal as apiUpdateSeal,
  fetchRegistrations,
  createRegistration as apiCreateRegistration,
} from '@/api/client';

interface AppState {
  currentUser: User | null;
  applications: SealApplication[];
  seals: Seal[];
  users: User[];
  approvalRecords: ApprovalRecord[];
  registrations: SealRegistration[];

  initFromApi: () => Promise<void>;
  setCurrentUser: (userId: string) => void;
  addApplication: (application: SealApplication) => Promise<void>;
  updateApplication: (id: string, data: Partial<SealApplication> & { submit?: boolean }) => Promise<void>;
  getApplicationById: (id: string) => SealApplication | undefined;
  getPendingApprovalsCount: () => number;
  getThisMonthSealCount: () => number;
  getExpiringSeals: (days: number) => Seal[];
  getSealTypeDistribution: () => { type: string; count: number }[];
  getRecentApplications: (limit: number) => SealApplication[];
  getMyPendingApprovals: () => SealApplication[];
  approveApplication: (applicationId: string, opinion: string) => Promise<void>;
  rejectApplication: (applicationId: string, opinion: string) => Promise<void>;
  addSeal: (seal: Seal) => Promise<void>;
  updateSeal: (id: string, data: Partial<Seal>) => Promise<void>;
  enableSeal: (id: string) => Promise<void>;
  getAvailableSealsByType: (sealType: string) => Seal[];
  addRegistration: (registration: SealRegistration) => Promise<void>;
  getRegistrationById: (id: string) => SealRegistration | undefined;
  getRegistrationsByApplicationId: (applicationId: string) => SealRegistration[];
  getRegistrationsBySealId: (sealId: string) => SealRegistration[];
  getSealById: (id: string) => Seal | undefined;
  getApprovedApplicationsWithoutRegistration: () => SealApplication[];
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: mockUsers.find((u) => u.id === 'u004') || mockUsers[0],
  applications: mockApplications,
  seals: mockSeals,
  users: mockUsers,
  approvalRecords: mockApprovalRecords,
  registrations: mockRegistrations,

  initFromApi: async () => {
    try {
      const [applications, seals, registrations] = await Promise.all([
        fetchApplications(),
        fetchSeals(),
        fetchRegistrations(),
      ]);
      set({ applications, seals, registrations });
    } catch (error) {
      console.error('Failed to initialize data from API:', error);
    }
  },

  setCurrentUser: (userId) =>
    set((state) => {
      const user = state.users.find((u) => u.id === userId);
      return { currentUser: user || state.currentUser };
    }),

  addApplication: async (application) => {
    try {
      const submit = application.status === 'pending_dept';
      const created = await apiCreateApplication({
        applicantId: application.applicantId,
        applicantName: application.applicantName,
        department: application.department,
        sealType: application.sealType,
        sealId: application.sealId,
        reason: application.reason,
        documentName: application.documentName,
        quantity: application.quantity,
        urgency: application.urgency,
        submit,
      });
      set((state) => ({
        applications: [created, ...state.applications],
      }));
    } catch (error) {
      console.error('Failed to create application:', error);
      throw error;
    }
  },

  updateApplication: async (id, data) => {
    try {
      const updated = await apiUpdateApplication(id, data);
      set((state) => ({
        applications: state.applications.map((app) =>
          app.id === id ? updated : app
        ),
      }));
    } catch (error) {
      console.error('Failed to update application:', error);
      throw error;
    }
  },

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

  approveApplication: async (applicationId, opinion) => {
    const { applications, currentUser, approvalRecords } = get();
    const application = applications.find((app) => app.id === applicationId);
    if (!application || !currentUser) return;

    try {
      const updated = await apiApproveApplication(applicationId, {
        approverId: currentUser.id,
        approverName: currentUser.name,
        opinion,
        node: application.currentNode,
      });

      const newApprovalRecords = updated.approvalTrail.filter(
        (record) => !approvalRecords.some((ar) => ar.id === record.id)
      );

      set({
        applications: applications.map((app) =>
          app.id === applicationId ? updated : app
        ),
        approvalRecords: [...approvalRecords, ...newApprovalRecords],
      });
    } catch (error) {
      console.error('Failed to approve application:', error);
      throw error;
    }
  },

  rejectApplication: async (applicationId, opinion) => {
    const { applications, currentUser, approvalRecords } = get();
    const application = applications.find((app) => app.id === applicationId);
    if (!application || !currentUser) return;

    try {
      const updated = await apiRejectApplication(applicationId, {
        approverId: currentUser.id,
        approverName: currentUser.name,
        opinion,
        node: application.currentNode,
      });

      const newApprovalRecords = updated.approvalTrail.filter(
        (record) => !approvalRecords.some((ar) => ar.id === record.id)
      );

      set({
        applications: applications.map((app) =>
          app.id === applicationId ? updated : app
        ),
        approvalRecords: [...approvalRecords, ...newApprovalRecords],
      });
    } catch (error) {
      console.error('Failed to reject application:', error);
      throw error;
    }
  },

  addSeal: async (seal) => {
    try {
      const created = await apiCreateSeal({
        batchNumber: seal.batchNumber,
        sealType: seal.sealType,
        serialNumber: seal.serialNumber,
        receivedDate: seal.receivedDate,
        expiryDate: seal.expiryDate,
        custodian: seal.custodian,
        enableDate: seal.enableDate,
        remark: seal.remark,
      });
      set((state) => ({
        seals: [created, ...state.seals],
      }));
    } catch (error) {
      console.error('Failed to create seal:', error);
      throw error;
    }
  },

  updateSeal: async (id, data) => {
    try {
      const updated = await apiUpdateSeal(id, data);
      set((state) => ({
        seals: state.seals.map((seal) =>
          seal.id === id ? updated : seal
        ),
      }));
    } catch (error) {
      console.error('Failed to update seal:', error);
      throw error;
    }
  },

  enableSeal: async (id) => {
    try {
      const updated = await apiEnableSeal(id);
      set((state) => ({
        seals: state.seals.map((seal) =>
          seal.id === id ? updated : seal
        ),
      }));
    } catch (error) {
      console.error('Failed to enable seal:', error);
      throw error;
    }
  },

  getAvailableSealsByType: (sealType) => {
    const { seals } = get();
    return seals.filter(
      (seal) => seal.sealType === sealType && isSealReadyForRegistration(seal) && !isSealExpired(seal)
    );
  },

  addRegistration: async (registration) => {
    try {
      const created = await apiCreateRegistration({
        applicationId: registration.applicationId,
        sealId: registration.sealId,
        registrarId: registration.registrarId,
        registrarName: registration.registrarName,
        registrant: registration.registrant,
        registrantDepartment: registration.registrantDepartment,
        usageTime: registration.usageTime,
        photoEvidence: registration.photoEvidence,
        remark: registration.remark,
      });
      set((state) => {
        const registeredAppId = created.applicationId;
        const updatedApplications = state.applications.map((app) =>
          app.id === registeredAppId
            ? { ...app, status: 'registered' as ApplicationStatus, sealId: created.sealId }
            : app
        );
        return {
          registrations: [created, ...state.registrations],
          applications: updatedApplications,
        };
      });
    } catch (error) {
      console.error('Failed to create registration:', error);
      throw error;
    }
  },

  getRegistrationById: (id) => get().registrations.find((reg) => reg.id === id),

  getRegistrationsByApplicationId: (applicationId) =>
    get()
      .registrations.filter((r) => r.applicationId === applicationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

  getRegistrationsBySealId: (sealId) =>
    get()
      .registrations.filter((r) => r.sealId === sealId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

  getSealById: (id) => get().seals.find((seal) => seal.id === id),

  getApprovedApplicationsWithoutRegistration: () => {
    const { applications, registrations } = get();
    const registeredApplicationIds = new Set(registrations.map((reg) => reg.applicationId));
    return applications.filter(
      (app) => app.status === 'approved' && !registeredApplicationIds.has(app.id)
    );
  },
}));


