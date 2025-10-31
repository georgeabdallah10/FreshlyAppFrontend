/**
 * React Query hooks for Family operations
 * 
 * @module hooks/useFamily
 * @description Provides hooks for managing family groups with React Query
 */

import { queryKeys } from '@/src/config/queryClient';
import type {
    CreateFamilyInput,
    Family,
    FamilyInvitation,
    FamilyMember,
    InviteMemberInput,
} from '@/src/services/family.service';
import { familyService } from '@/src/services/family.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook to fetch user's current family
 */
export function useFamily(enabled = true) {
  return useQuery({
    queryKey: queryKeys.family.current(),
    queryFn: () => familyService.getCurrentFamily(),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes (family data changes less frequently)
  });
}

/**
 * Hook to fetch family members
 */
export function useFamilyMembers(familyId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.family.members(),
    queryFn: () => familyService.getFamilyMembers(familyId),
    enabled: enabled && !!familyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch pending family invitations
 */
export function usePendingInvitations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.family.invitations(),
    queryFn: () => familyService.getPendingInvitations(),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes (invitations should be fresh)
  });
}

/**
 * Hook to create a new family
 * 
 * @example
 * const createFamily = useCreateFamily();
 * 
 * await createFamily.mutateAsync({
 *   name: 'The Smiths'
 * });
 */
export function useCreateFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFamilyInput) =>
      familyService.createFamily(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.family.current() });
      queryClient.invalidateQueries({ queryKey: queryKeys.family.members() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });
}

/**
 * Hook to update family name
 * 
 * @example
 * const updateFamily = useUpdateFamily();
 * 
 * await updateFamily.mutateAsync({
 *   id: 123,
 *   name: 'The Smith Family'
 * });
 */
export function useUpdateFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      familyService.updateFamily(id, name),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.family.current() });

      const previousFamily = queryClient.getQueryData<Family>(
        queryKeys.family.current()
      );

      if (previousFamily) {
        queryClient.setQueryData<Family>(
          queryKeys.family.current(),
          { ...previousFamily, name }
        );
      }

      return { previousFamily };
    },
    onError: (err, variables, context) => {
      if (context?.previousFamily) {
        queryClient.setQueryData(
          queryKeys.family.current(),
          context.previousFamily
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.family.current() });
    },
  });
}

/**
 * Hook to leave family
 */
export function useLeaveFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (familyId: number) => familyService.leaveFamily(familyId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.family.current() });
      queryClient.removeQueries({ queryKey: queryKeys.family.members() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });
}

/**
 * Hook to delete family (owner only)
 */
export function useDeleteFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (familyId: number) => familyService.deleteFamily(familyId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.family.current() });
      queryClient.removeQueries({ queryKey: queryKeys.family.members() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });
}

/**
 * Hook to invite member to family
 * 
 * @example
 * const inviteMember = useInviteMember();
 * 
 * await inviteMember.mutateAsync({
 *   familyId: 123,
 *   email: 'john@example.com',
 *   role: 'member'
 * });
 */
export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ familyId, ...input }: InviteMemberInput & { familyId: number }) =>
      familyService.inviteMember(familyId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.family.invitations() });
    },
  });
}

/**
 * Hook to accept family invitation
 * 
 * @example
 * const acceptInvite = useAcceptInvitation();
 * await acceptInvite.mutateAsync(123);
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: number) =>
      familyService.acceptInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.family.current() });
      queryClient.invalidateQueries({ queryKey: queryKeys.family.members() });
      queryClient.invalidateQueries({ queryKey: queryKeys.family.invitations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });
}

/**
 * Hook to reject family invitation
 */
export function useRejectInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: number) =>
      familyService.rejectInvitation(invitationId),
    onMutate: async (invitationId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.family.invitations() });

      const previousInvitations = queryClient.getQueryData<FamilyInvitation[]>(
        queryKeys.family.invitations()
      );

      if (previousInvitations) {
        queryClient.setQueryData<FamilyInvitation[]>(
          queryKeys.family.invitations(),
          previousInvitations.filter(inv => inv.id !== invitationId)
        );
      }

      return { previousInvitations };
    },
    onError: (err, variables, context) => {
      if (context?.previousInvitations) {
        queryClient.setQueryData(
          queryKeys.family.invitations(),
          context.previousInvitations
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.family.invitations() });
    },
  });
}

/**
 * Hook to update member role (admin/owner only)
 * 
 * @example
 * const updateRole = useUpdateMemberRole();
 * 
 * await updateRole.mutateAsync({
 *   familyId: 123,
 *   memberId: 456,
 *   role: 'admin'
 * });
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ familyId, memberId, role }: { familyId: number; memberId: number; role: 'admin' | 'member' }) =>
      familyService.updateMemberRole(familyId, memberId, role),
    onMutate: async ({ familyId, memberId, role }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.family.members() });

      const previousMembers = queryClient.getQueryData<FamilyMember[]>(
        queryKeys.family.members()
      );

      if (previousMembers) {
        queryClient.setQueryData<FamilyMember[]>(
          queryKeys.family.members(),
          previousMembers.map(member =>
            member.id === memberId
              ? { ...member, role }
              : member
          )
        );
      }

      return { previousMembers };
    },
    onError: (err, variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(
          queryKeys.family.members(),
          context.previousMembers
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.family.members() });
    },
  });
}

/**
 * Hook to remove member from family (admin/owner only)
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ familyId, memberId }: { familyId: number; memberId: number }) =>
      familyService.removeMember(familyId, memberId),
    onMutate: async ({ familyId, memberId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.family.members() });

      const previousMembers = queryClient.getQueryData<FamilyMember[]>(
        queryKeys.family.members()
      );

      if (previousMembers) {
        queryClient.setQueryData<FamilyMember[]>(
          queryKeys.family.members(),
          previousMembers.filter(member => member.id !== memberId)
        );
      }

      return { previousMembers };
    },
    onError: (err, variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(
          queryKeys.family.members(),
          context.previousMembers
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.family.members() });
      queryClient.invalidateQueries({ queryKey: queryKeys.family.current() });
    },
  });
}

/**
 * Hook to join family by code
 * 
 * @example
 * const joinFamily = useJoinFamilyByCode();
 * await joinFamily.mutateAsync('FAMILY123');
 */
export function useJoinFamilyByCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => familyService.joinFamilyByCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.family.current() });
      queryClient.invalidateQueries({ queryKey: queryKeys.family.members() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });
}

/**
 * Hook to regenerate family code (owner only)
 */
export function useRegenerateFamilyCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (familyId: number) => familyService.regenerateFamilyCode(familyId),
    onSuccess: (data) => {
      // Update family data with new code
      const familyData = queryClient.getQueryData<Family>(queryKeys.family.current());
      if (familyData) {
        queryClient.setQueryData<Family>(
          queryKeys.family.current(),
          { ...familyData, code: data.code }
        );
      }
    },
  });
}

/**
 * Composite hook for family management screen
 * Returns all family-related data in one hook
 * 
 * @example
 * const {
 *   family,
 *   members,
 *   invitations,
 *   isLoading
 * } = useFamilyManagement(familyId);
 */
export function useFamilyManagement(familyId?: number) {
  const familyQuery = useFamily();
  const membersQuery = useFamilyMembers(familyId || 0, !!familyId);
  const invitationsQuery = usePendingInvitations();

  return {
    family: familyQuery.data,
    members: membersQuery.data,
    invitations: invitationsQuery.data,
    isLoading:
      familyQuery.isLoading ||
      membersQuery.isLoading ||
      invitationsQuery.isLoading,
    isError:
      familyQuery.isError ||
      membersQuery.isError ||
      invitationsQuery.isError,
    error:
      familyQuery.error ||
      membersQuery.error ||
      invitationsQuery.error,
    refetch: () => {
      familyQuery.refetch();
      membersQuery.refetch();
      invitationsQuery.refetch();
    },
  };
}
