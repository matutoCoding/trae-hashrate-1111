import type { Seal, ApprovalNode } from './types';

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

export function generateId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
