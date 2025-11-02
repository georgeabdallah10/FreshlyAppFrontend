// api/user/family.ts
import { BASE_URL as API_URL } from "../env/baseUrl";
import { Storage } from "../utils/storage";

async function getAuthHeader() {
  const token = await Storage.getItem("access_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// 🏠 Create a new family
export async function createFamily(display_name: string) {
  const headers = await getAuthHeader();
  
  try {
    const res = await fetch(`${API_URL}/families`, {
      method: "POST",
      headers,
      body: JSON.stringify({ display_name }),
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = `Failed to create family: ${res.status}`;
      
      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 409) {
        errorMessage = "A family with this name already exists. Please choose a different name.";
      } else if (res.status === 422) {
        errorMessage = "Invalid family name. Please check your input.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 100);
        }
      }
      
      throw new Error(errorMessage);
    }
    
    return await res.json(); // Returns { id, display_name, invite_code }
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

// 👨‍👩‍👧‍👦 Get all families the user is part of
export async function listMyFamilies() {
  const headers = await getAuthHeader();
  
  try {
    const res = await fetch(`${API_URL}/families`, { headers });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to fetch families";
      
      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 100);
        }
      }
      
      throw new Error(errorMessage);
    }
    
    return await res.json();
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

// 📨 Join a family via invite code
export async function joinFamilyByCode(invite_code: string) {
  const headers = await getAuthHeader();
  
  try {
    const res = await fetch(`${API_URL}/families/join`, {
      method: "POST",
      headers,
      body: JSON.stringify({ invite_code }),
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Invalid or expired invite code";
      
      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 404) {
        errorMessage = "Invalid invite code. Please check and try again.";
      } else if (res.status === 409) {
        errorMessage = "You are already a member of this family.";
      } else if (res.status === 410) {
        errorMessage = "This invite code has expired. Please ask for a new one.";
      } else if (res.status === 422) {
        errorMessage = "Invalid invite code format. Please check and try again.";
      } else if (res.status === 429) {
        errorMessage = "Too many attempts. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 100);
        }
      }
      
      throw new Error(errorMessage);
    }
    
    return await res.json(); // Returns membership info
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

// 🚫 Kick a member (admin/owner only)
export async function removeFamilyMember(familyId: number, userId: number) {
  const headers = await getAuthHeader();
  
  try {
    const res = await fetch(`${API_URL}/families/${familyId}/members/${userId}`, {
      method: "DELETE",
      headers,
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to remove member";
      
      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 403) {
        errorMessage = "You don't have permission to remove this member.";
      } else if (res.status === 404) {
        errorMessage = "Member not found or already removed.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 100);
        }
      }
      
      throw new Error(errorMessage);
    }
    
    return true;
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

// ↩️ Leave the family (just remove yourself)
export async function leaveFamily(familyId: number, userId: number) {
  // Reuse same endpoint as remove — the backend will check permissions
  return await removeFamilyMember(familyId, userId);
}

// 🔁 Regenerate family invite code (admin/owner)
export async function regenerateInviteCode(familyId: number) {
  const headers = await getAuthHeader();
  
  try {
    const res = await fetch(`${API_URL}/families/${familyId}/invite/regenerate`, {
      method: "POST",
      headers,
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to regenerate invite code";
      
      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 403) {
        errorMessage = "Only family owners can regenerate invite codes.";
      } else if (res.status === 404) {
        errorMessage = "Family not found.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 100);
        }
      }
      
      throw new Error(errorMessage);
    }
    
    return await res.json(); // Returns updated FamilyOut with new invite_code
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

// 👀 List members in a family
export async function listFamilyMembers(familyId: number) {
  const headers = await getAuthHeader();
  
  try {
    const res = await fetch(`${API_URL}/families/${familyId}/members`, {
      method: "GET",
      headers,
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to fetch members";
      
      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 403) {
        errorMessage = "You don't have permission to view this family's members.";
      } else if (res.status === 404) {
        errorMessage = "Family not found.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 100);
        }
      }
      
      throw new Error(errorMessage);
    }
    
    return await res.json(); // Returns list of MembershipOut
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw error;
  }
}