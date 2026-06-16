export type UserRole =
  | 'employee'
  | 'dept_head'
  | 'leader'
  | 'seal_admin'
  | 'admin';

export type ApplicationStatus =
  | 'draft'
  | 'pending_dept'
  | 'pending_leader'
  | 'approved'
  | 'rejected'
  | 'registered'
  | 'cancelled';

export type SealStatus =
  | 'stored'
  | 'in_use'
  | 'warning'
  | 'expired'
  | 'locked';

export type ApprovalNode =
  | 'submitter'
  | 'dept_head'
  | 'leader';

export type UrgencyLevel =
  | 'normal'
  | 'urgent'
  | 'emergency';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  email: string;
  avatar?: string;
}

export interface ApprovalRecord {
  id: string;
  applicationId: string;
  node: ApprovalNode;
  approverId: string;
  approverName: string;
  status: 'approved' | 'rejected';
  comment?: string;
  createdAt: string;
}

export interface SealApplication {
  id: string;
  title: string;
  applicantId: string;
  applicantName: string;
  applicantDepartment: string;
  urgency: UrgencyLevel;
  sealType: string;
  sealCount: number;
  documentType: string;
  documentName: string;
  purpose: string;
  relatedFiles?: string[];
  status: ApplicationStatus;
  currentNode: ApprovalNode;
  approvalTrail: ApprovalRecord[];
  createdAt: string;
  updatedAt: string;
  registeredAt?: string;
  cancelledAt?: string;
}

export interface Seal {
  id: string;
  batchNumber: string;
  sealType: string;
  sealName: string;
  totalCount: number;
  usedCount: number;
  remainingCount: number;
  status: SealStatus;
  issuedDate: string;
  expiryDate: string;
  storageLocation: string;
  custodianId: string;
  custodianName: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SealRegistration {
  id: string;
  applicationId: string;
  sealId: string;
  sealBatchNumber: string;
  applicantId: string;
  applicantName: string;
  documentType: string;
  documentName: string;
  sealCount: number;
  registrantId: string;
  registrantName: string;
  registeredAt: string;
  remark?: string;
}

export interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  registeredApplications: number;
  totalSeals: number;
  sealsInUse: number;
  sealsWarning: number;
  sealsExpired: number;
  myPendingCount: number;
  mySubmittedCount: number;
  monthlyTrend: {
    month: string;
    submitted: number;
    approved: number;
  }[];
}
