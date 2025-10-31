/**
 * ============================================
 * FAMILY API SERVICE
 * ============================================
 */

import { apiClient } from '../client/apiClient';

// ============================================
// TYPES
// ============================================

export interface FamilyMember {
  id: number;
  name: string;
  email: string;
  avatar_path?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Family {
  id: number;
  name: string;
  code: string;
  ownerId: number;
  members: FamilyMember[];
  createdAt: string;
}

export interface CreateFamilyInput {
  name: string;
}

export interface InviteMemberInput {
  email: string;
  role?: 'admin' | 'member';
}

export interface FamilyInvitation {
  id: number;
  familyId: number;
  familyName: string;
  inviterName: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get current user's family
 */
export async function getCurrentFamily(): Promise<Family | null> {
  return await apiClient.get<Family | null>('/family/current');
}

/**
 * Create a new family
 */
export async function createFamily(input: CreateFamilyInput): Promise<Family> {
  return await apiClient.post<Family>('/family', input);
}

/**
 * Update family name
 */
export async function updateFamily(id: number, name: string): Promise<Family> {
  return await apiClient.put<Family>(`/family/${id}`, { name });
}

/**
 * Delete family (owner only)
 */
export async function deleteFamily(id: number): Promise<void> {
  await apiClient.delete(`/family/${id}`);
}

/**
 * Get family members
 */
export async function getFamilyMembers(familyId: number): Promise<FamilyMember[]> {
  return await apiClient.get<FamilyMember[]>(`/family/${familyId}/members`);
}

/**
 * Invite member to family
 */
export async function inviteMember(familyId: number, input: InviteMemberInput): Promise<FamilyInvitation> {
  return await apiClient.post<FamilyInvitation>(`/family/${familyId}/invite`, input);
}

/**
 * Remove member from family
 */
export async function removeMember(familyId: number, memberId: number): Promise<void> {
  await apiClient.delete(`/family/${familyId}/members/${memberId}`);
}

/**
 * Update member role
 */
export async function updateMemberRole(familyId: number, memberId: number, role: 'admin' | 'member'): Promise<FamilyMember> {
  return await apiClient.patch<FamilyMember>(`/family/${familyId}/members/${memberId}/role`, { role });
}

/**
 * Leave family
 */
export async function leaveFamily(familyId: number): Promise<void> {
  await apiClient.post(`/family/${familyId}/leave`);
}

/**
 * Join family by code
 */
export async function joinFamilyByCode(code: string): Promise<Family> {
  return await apiClient.post<Family>('/family/join', { code });
}

/**
 * Get pending invitations
 */
export async function getPendingInvitations(): Promise<FamilyInvitation[]> {
  return await apiClient.get<FamilyInvitation[]>('/family/invitations');
}

/**
 * Accept family invitation
 */
export async function acceptInvitation(invitationId: number): Promise<Family> {
  return await apiClient.post<Family>(`/family/invitations/${invitationId}/accept`);
}

/**
 * Reject family invitation
 */
export async function rejectInvitation(invitationId: number): Promise<void> {
  await apiClient.post(`/family/invitations/${invitationId}/reject`);
}

/**
 * Regenerate family code (owner only)
 */
export async function regenerateFamilyCode(familyId: number): Promise<{ code: string }> {
  return await apiClient.post<{ code: string }>(`/family/${familyId}/regenerate-code`);
}

// ============================================
// EXPORT ALL
// ============================================

export const familyService = {
  getCurrentFamily,
  createFamily,
  updateFamily,
  deleteFamily,
  getFamilyMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
  leaveFamily,
  joinFamilyByCode,
  getPendingInvitations,
  acceptInvitation,
  rejectInvitation,
  regenerateFamilyCode,
};

// Legacy export
export const familyApi = familyService;
export default familyService;
