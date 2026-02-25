// srcs/frontend/src/services/user.service.ts

export interface UserProfile {
    id: number;
    nick: string;
    email: string;
    birth?: string;
    country: string;
    lang: string;
    avatarUrl?: string;
    oauthProvider?: string;
}

export interface Country {
    coun2_pk: string;
    coun_name: string;
}

export interface UpdateProfileData {
    nick?: string;
    email?: string;
    birth?: string;
    country?: string;
    lang?: string;
    currentPassword?: string;
    newPassword?: string;
    avatarUrl?: string;
}

//const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Helper to get token
const getToken = (): string | null => {
    const token = localStorage.getItem("pong_token");
    console.log("🔑 [user.service] Token retrieved:", token ? "✅ Found" : "❌ Not found");
    return token;
};

// 🔥 NEW: Handle 401 errors by clearing stale auth data and redirecting
function handle401Unauthorized() {
    console.error("════════════════════════════════════════════════════════");
    console.error("🚨 [user.service] 401 UNAUTHORIZED - Token is invalid or expired");
    console.error("   This usually happens after 'make re' wipes the database");
    console.error("   Clearing localStorage and redirecting to login...");
    console.error("════════════════════════════════════════════════════════");
    
    // Clear all pong-related localStorage
    localStorage.removeItem("pong_token");
    localStorage.removeItem("pong_user_nick");
    localStorage.removeItem("pong_user_id");
    
    // Redirect to home/login after a short delay to show console message
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}

// 1. Get full profile details
export const getMyProfile = async (): Promise<UserProfile | null> => {
    console.log("📡 [user.service] getMyProfile() - Starting request...");
    
    try {
        const token = getToken();
        if (!token) {
            console.error("❌ [user.service] No authentication token found");
            return null;
        }

        const url = `/auth/profile`;
        console.log("📡 [user.service] Fetching from:", url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("📡 [user.service] Response status:", response.status);

        // 🔥 CRITICAL: Handle 401 by auto-logout
        if (response.status === 401) {
            handle401Unauthorized();
            return null;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("❌ [user.service] Failed to fetch profile:", errorData);
            throw new Error(errorData.message || "Failed to fetch profile");
        }

        const data = await response.json();
        console.log("✅ [user.service] Profile fetched successfully:", data);
        
        return data;
    } catch (error) {
        console.error("❌ [user.service] Error in getMyProfile():", error);
        return null;
    }
};

// 2. Update profile
export const updateMyProfile = async (updateData: UpdateProfileData) => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 [user.service] STEP 8: updateMyProfile called");
    console.log("🔍 [user.service] Update data received:");
    console.log(JSON.stringify(updateData, null, 2));

    try {
        const token = getToken();
        if (!token) {
            console.error("❌ [user.service] No authentication token found");
            return { ok: false, msg: "No authentication token" };
        }

        const url = `/auth/profile`;
        console.log("🔍 [user.service] STEP 9: Sending PUT request to:", url);
        console.log("🔍 [user.service] Request body:", JSON.stringify(updateData));

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        console.log("🔍 [user.service] STEP 10: Response received");
        console.log("🔍 [user.service] Response status:", response.status);
        console.log("🔍 [user.service] Response ok:", response.ok);

        // 🔥 CRITICAL: Handle 401 by auto-logout
        if (response.status === 401) {
            handle401Unauthorized();
            return { ok: false, msg: "Session expired" };
        }

        const data = await response.json();
        console.log("🔍 [user.service] STEP 11: Response data:");
        console.log(JSON.stringify(data, null, 2));
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        if (!response.ok) {
            console.error("❌ [user.service] Update failed");
            return { 
                ok: false, 
                msg: data.message || "Update failed" 
            };
        }

        console.log("✅ [user.service] Profile updated successfully");
        return { 
            ok: true, 
            msg: data.message || "Profile updated successfully", 
            user: data.user 
        };
    } catch (error) {
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.error("❌ [user.service] Exception in updateMyProfile:", error);
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return { 
            ok: false, 
            msg: "Connection error" 
        };
    }
};

// 3. Get list of countries
export const getCountries = async (): Promise<Country[]> => {
    console.log("📡 [user.service] getCountries() - Starting request...");

    try {
        const url = `/auth/countries`;
        console.log("📡 [user.service] Fetching from:", url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log("📡 [user.service] Response status:", response.status);

        if (!response.ok) {
            console.error("❌ [user.service] Failed to fetch countries");
            throw new Error("Failed to fetch countries");
        }

        const data = await response.json();
        console.log("✅ [user.service] Countries fetched:", data.length, "countries");
        
        return data;
    } catch (error) {
        console.error("❌ [user.service] Error in getCountries():", error);
        return [];
    }
};

// 4. Delete (anonymize) my account
export const deleteMyAccount = async (): Promise<{ ok: boolean; msg: string }> => {
    console.log("🗑️ [user.service] deleteMyAccount() - Starting...");

    try {
        const token = getToken();
        if (!token) {
            return { ok: false, msg: "No authentication token" };
        }

        const url = `/auth/profile`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            handle401Unauthorized();
            return { ok: false, msg: "Session expired" };
        }

        const data = await response.json();

        if (!response.ok) {
            return { ok: false, msg: data.message || "Delete failed" };
        }

        // Clear local auth data
        localStorage.removeItem("pong_token");
        localStorage.removeItem("pong_user_nick");
        localStorage.removeItem("pong_user_id");

        console.log("✅ [user.service] Account deleted successfully");
        return { ok: true, msg: "Account deleted" };
    } catch (error) {
        console.error("❌ [user.service] Error in deleteMyAccount():", error);
        return { ok: false, msg: "Connection error" };
    }
};

// 5. Stats Leaderboard
// export const getLeaderboard = async () => {
//     const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/stats/leaderboard`, {
//         method: 'GET',
//         headers: {
//             // Asegúrate de enviar el token como lo hagáis en el resto del archivo
//             'Authorization': `Bearer ${localStorage.getItem('token')}` 
//         }
//     });
    
//     if (!response.ok) {
//         throw new Error('Error fetching leaderboard');
//     }
//     return response.json();
// };
export const getLeaderboard = async () => {
    console.log("[user.service] getLeaderboard() - Starting request...");

    try {
        const token = getToken();
        if (!token) {
            console.error("❌ [user.service] No authentication token found for leaderboard");
            return []; // Devolvemos array vacío para no romper la pantalla
        }
        // Usamos la ruta relativa EXACTAMENTE igual que en getCountries
        const url = `/auth/stats/leaderboard`;
        console.log("[user.service] Fetching from:", url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("[user.service] Response status:", response.status);
        if (response.status === 401) {
            handle401Unauthorized();
            return [];
        }

        if (!response.ok) {
            console.error("❌ [user.service] Failed to fetch leaderboard");
            throw new Error("Failed to fetch leaderboard");
        }

        const data = await response.json();
        console.log("✅ [user.service] Leaderboard fetched:", data.length, "players");
        
        return data;
    } catch (error) {
        console.error("❌ [user.service] Error in getLeaderboard():", error);
        return [];
    }
};