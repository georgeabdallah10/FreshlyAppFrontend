// api/user/family.ts
import * as SecureStore from "expo-secure-store";
import { BASE_URL as API_URL } from "../env/baseUrl";
async function getAuthHeader() {
  const token = await SecureStore.getItemAsync("access_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// 🏠 Create a new family
export async function createFamily(display_name: string) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/families`, {
    method: "POST",
    headers,
    body: JSON.stringify({ display_name }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create family: ${res.status}`);
  }
  return await res.json(); // Returns { id, display_name, invite_code }
}

// 👨‍👩‍👧‍👦 Get all families the user is part of
export async function listMyFamilies() {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/families`, { headers });
  if (!res.ok) throw new Error("Failed to fetch families");
  return await res.json();
}

// 📨 Join a family via invite code
export async function joinFamilyByCode(invite_code: string) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/families/join`, {
    method: "POST",
    headers,
    body: JSON.stringify({ invite_code }),
  });
  if (!res.ok) throw new Error("Invalid or expired invite code");
  return await res.json(); // Returns membership info
}

// 🚫 Kick a member (admin/owner only)
export async function removeFamilyMember(familyId: number, userId: number) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/families/${familyId}/members/${userId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to remove member");
  return true;
}

// ↩️ Leave the family (just remove yourself)
export async function leaveFamily(familyId: number, userId: number) {
  // Reuse same endpoint as remove — the backend will check permissions
  return await removeFamilyMember(familyId, userId);
}

// 🔁 Regenerate family invite code (admin/owner)
export async function regenerateInviteCode(familyId: number) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/families/${familyId}/invite/regenerate`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error("Failed to regenerate invite code");
  return await res.json(); // Returns updated FamilyOut with new invite_code
}

// 👀 List members in a family
export async function listFamilyMembers(familyId: number) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/families/${familyId}/members`, {
    method: "GET",
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch members");
  return await res.json(); // Returns list of MembershipOut
}