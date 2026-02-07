// srcs/frontend/src/services/user.service.ts

export interface UserProfile {
    id: number;
    nick: string;
    email: string;
    birth?: string; // YYYY-MM-DD (optional)
    country: string; // 2-letter code, e.g., 'ES'
    lang: string; // 'es', 'en', 'ca', 'fr'
    avatarUrl?: string; // URL from backend
    oauthProvider?: string; // '42', 'google', or null for traditional users
}

export interface Country {
    coun2_pk: string; // 2-letter code
    coun_name: string; // Full country name
}

export interface UpdateProfileData {
    nick?: string;
    email?: string;
    birth?: string;
    country?: string;
    lang?: string;
    currentPassword?: string;
    newPassword?: string;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Helper to get token
const getToken = (): string | null => {
    const token = localStorage.getItem("pong_token");
    console.log("🔑 [user.service] Token retrieved:", token ? "✅ Found" : "❌ Not found");
    return token;
};

// 1. Get full profile details
export const getMyProfile = async (): Promise<UserProfile | null> => {
    console.log("📡 [user.service] getMyProfile() - Starting request...");
    
    try {
        const token = getToken();
        if (!token) {
            console.error("❌ [user.service] No authentication token found");
            return null;
        }

        const url = `${API_URL}/auth/profile`;
        console.log("📡 [user.service] Fetching from:", url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("📡 [user.service] Response status:", response.status);

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
    console.log("📡 [user.service] updateMyProfile() - Starting request...");
    console.log("📝 [user.service] Update data:", updateData);

    try {
        const token = getToken();
        if (!token) {
            console.error("❌ [user.service] No authentication token found");
            return { ok: false, msg: "No authentication token" };
        }

        const url = `${API_URL}/auth/profile`;
        console.log("📡 [user.service] Sending PUT to:", url);

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        console.log("📡 [user.service] Response status:", response.status);

        const data = await response.json();
        console.log("📡 [user.service] Response data:", data);

        if (!response.ok) {
            console.error("❌ [user.service] Update failed:", data);
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
        console.error("❌ [user.service] Error in updateMyProfile():", error);
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
        const url = `${API_URL}/auth/countries`;
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