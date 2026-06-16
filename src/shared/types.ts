export type UserRole = 'employee' | 'dept_head' | 'leader' | 'seal_admin' | 'admin';

export type ApplicationStatus =
  | 'draft'
  | 'pending_dept'
  | 'pending_leader'
  | 'approved'
  | 'rejected'
  | 'registered'
  | 'cancelled';

export type SealStatus = 'stored' | 'in_use' | 'warning' | 'expired' | 'locked';

export type ApprovalNode = 'submitter' | 'dept_head' | 'leader';

export type ApprovalAction = 'approve' | 'reject' | 'submit';

export type UrgencyLevel = 'normal' | 'urgent' | 'emergency';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  email: string;
}

export interface ApprovalRecord {
  id: string;
  applicationId: string;
  node: ApprovalNode;
  approverId: string;
  approverName: string;
  action: ApprovalAction;
  opinion: string;
  timestamp: string;
}

export interface SealApplication {
  id: string;
  applicantId: string;
  applicantName: string;
  department: string;
  sealType: string;
  sealId?: string;
  reason: string;
  documentName: string;
  quantity: number;
  urgency: UrgencyLevel;
  status: ApplicationStatus;
  currentNode: ApprovalNode;
  createdAt: string;
  updatedAt: string;
  approvalTrail: ApprovalRecord[];
  remark?: string;
}

export interface Seal {
  id: string;
  batchNumber: string;
  sealType: string;
  serialNumber: string;
  receivedDate: string;
  expiryDate: string;
  status: SealStatus;
  custodian: string;
  enableDate?: string;
  remark?: string;
  updatedAt?: string;
}

export interface SealRegistration {
  id: string;
  applicationId: string;
  sealId: string;
  registrarId: string;
  registrarName: string;
  registrant: string;
  registrantDepartment: string;
  usageTime: string;
  photoEvidence?: string;
  remark?: string;
  createdAt: string;
}

export interface DashboardStats {
  pendingApprovals: number;
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  registeredApplications: number;
  totalSeals: number;
  warningSeals: number;
  expiredSeals: number;
  inUseSeals: number;
  monthlyTrend: {
    month: string;
    applications: number;
    approvals: number;
  }[];
  statusDistribution: {
    status: ApplicationStatus;
    count: number;
  }[];
}
