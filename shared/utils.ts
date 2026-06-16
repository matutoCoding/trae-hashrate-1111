import type { Seal, ApprovalNode, ApplicationStatus } from './types';

export function isSealExpired(seal: Seal): boolean {
  const now = new Date();
  const expiry = new Date(seal.expiryDate);
  return expiry.getTime() <= now.getTime();
}

export function isSealLocked(seal: Seal): boolean {
  return seal.status === 'locked' || seal.status === 'expired' || isSealExpired(seal);
}

export function isSealUsable(seal: Seal): boolean {
  if (isSealLocked(seal)) return false;
  return seal.status === 'in_use' || seal.status === 'warning' || seal.status === 'stored';
}

export function isSealReadyForRegistration(seal: Seal): boolean {
  if (isSealLocked(seal)) return false;
  return seal.status === 'in_use' || seal.status === 'warning';
}

export function getSealDaysRemaining(seal: Seal): number {
  const now = new Date();
  const expiry = new Date(seal.expiryDate);
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getPreviousNode(currentNode: ApprovalNode): ApprovalNode {
  if (currentNode === 'dept_head') return 'submitter';
  if (currentNode === 'leader') return 'dept_head';
  return 'submitter';
}

export function getNextNode(currentNode: ApprovalNode): ApprovalNode | null {
  if (currentNode === 'submitter') return 'dept_head';
  if (currentNode === 'dept_head') return 'leader';
  return null;
}

export function getStatusForNode(node: ApprovalNode): ApplicationStatus | null {
  if (node === 'submitter') return 'draft';
  if (node === 'dept_head') return 'pending_dept';
  if (node === 'leader') return 'pending_leader';
  return null;
}

export function canSubmitApplication(status: ApplicationStatus, currentNode: ApprovalNode): boolean {
  if (status === 'draft' && currentNode === 'submitter') return true;
  if (status === 'rejected' && currentNode === 'submitter') return true;
  return false;
}

export function canApproveNode(status: ApplicationStatus, currentNode: ApprovalNode, targetNode: ApprovalNode): boolean {
  if (targetNode === 'dept_head') {
    return status === 'pending_dept' && currentNode === 'dept_head';
  }
  if (targetNode === 'leader') {
    return status === 'pending_leader' && currentNode === 'leader';
  }
  return false;
}

export function generateId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
