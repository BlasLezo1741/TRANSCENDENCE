# Avatar & Profile Synchronization System
## Technical Documentation

---

## Overview

This document describes the architecture and data flow for automatically synchronizing user avatars and profile data across the application. The system ensures that avatars display correctly in the Header component immediately after login, page refresh, and profile updates—without requiring the user to navigate to the Profile screen.

**Key Design Principle:** The JWT token and `localStorage` never carry the avatar URL. Instead, the application fetches it from the API via `GET /auth/profile` whenever a user becomes active. This single source of truth prevents stale data and ensures consistency.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [File Structure](#file-structure)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Detailed Component Breakdown](#detailed-component-breakdown)
5. [Edge Cases & Solutions](#edge-cases--solutions)
6. [Testing Guide](#testing-guide)
7. [Future Enhancements](#future-enhancements)

---

## System Architecture

### The Three-State Model

```
┌─────────────────────────────────────────────────────────────┐
│                    APP.TSX STATE                            │
├─────────────────────────────────────────────────────────────┤
│ currentUser: string           ← Nick from localStorage/JWT  │
│ currentUserId: number         ← ID from API after login     │
│ currentUserAvatarUrl: string  ← Avatar from API after login │
│ profileSynced: boolean        ← True once API responds      │
└─────────────────────────────────────────────────────────────┘
         │
         │ Props flow down ↓
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                   HEADER.TSX                                │
├─────────────────────────────────────────────────────────────┤
│ Receives: userName, userId, userAvatarUrl, profileSynced    │
│                                                             │
│ Renders:                                                    │
│   if (!profileSynced)  → Grey circle placeholder           │
│   if (profileSynced)   → <Avatar> component with real data │
└─────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

**Problem:** JWTs are stateless and immutable. Once issued, they cannot include dynamic data like avatars that change during the session.

**Solution:** Treat the JWT as authentication only. Fetch mutable profile data (avatar, preferences) from the API whenever needed.

**Benefits:**
- ✅ Avatar updates propagate instantly without re-login
- ✅ Works identically for OAuth and traditional login
- ✅ No stale data from cached tokens
- ✅ Single source of truth (the database)

---

## File Structure

### Frontend Files

```
srcs/frontend/src/
│
├── App.tsx                          ← Central state & sync logic
│   ├── currentUser                  ← Nick (from localStorage/JWT)
│   ├── currentUserId                ← ID (from API)
│   ├── currentUserAvatarUrl         ← Avatar URL/ID (from API)
│   ├── profileSynced                ← Sync completion flag
│   ├── syncProfile useEffect        ← Fetches profile on login
│   └── handleLogout                 ← Resets all state
│
├── components/
│   ├── Header.tsx                   ← Displays avatar in header
│   │   ├── Receives props from App
│   │   └── Shows placeholder until profileSynced=true
│   │
│   └── Avatar.tsx                   ← Avatar display component
│       ├── Handles OAuth URLs
│       ├── Resolves avatar IDs
│       └── Falls back to default
│
├── screens/
│   ├── LoginScreen.tsx              ← Login form (OAuth + traditional)
│   │   └── Calls setGlobalUser(nick) → triggers sync
│   │
│   └── ProfileScreen.tsx            ← Profile editor
│       ├── loadUserProfile()        ← Syncs on mount
│       ├── handleAvatarSelect()     ← Avatar picker
│       ├── handleUpdateProfile()    ← Text fields editor
│       └── Propagates changes via callbacks
│
└── services/
    └── user.service.ts              ← API communication
        ├── getMyProfile()           ← GET /auth/profile
        └── updateMyProfile()        ← PUT /auth/profile
```

### Backend Files

```
srcs/backend/src/auth/
│
├── auth.controller.ts               ← HTTP endpoints
│   ├── GET /auth/profile            ← Returns full UserProfile
│   └── PUT /auth/profile            ← Updates profile fields
│
└── auth.service.ts                  ← Business logic
    ├── getUserProfile()             ← Fetch from DB
    └── updateUserProfile()          ← Save to DB
```

### Database Schema

```sql
Table: player
├── p_pk (PRIMARY KEY)               ← User ID
├── p_nick VARCHAR(255)              ← Username
├── p_mail VARCHAR(255)              ← Email
├── p_avatar_url VARCHAR(255)        ← Avatar ID or OAuth URL
└── ... (other fields)
```

---

## Data Flow Diagrams

### Flow 1: Page Refresh (User Already Logged In)

```
┌──────────────┐
│  Browser     │ User refreshes page
│  Refresh     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ App.tsx - Component Mount                                    │
├──────────────────────────────────────────────────────────────┤
│ 1. const savedUserNick = localStorage.getItem("pong_user_   │
│    nick")                                                     │
│ 2. useState(savedUserNick)  → currentUser = "alice"          │
│ 3. useState(!savedUserNick) → profileSynced = false          │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ currentUser is truthy → syncProfile useEffect fires
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ syncProfile useEffect                                         │
├──────────────────────────────────────────────────────────────┤
│ 1. const profile = await getMyProfile()                      │
│    → Calls GET /auth/profile with JWT from localStorage      │
│                                                               │
│ 2. Backend returns:                                           │
│    {                                                          │
│      id: 42,                                                  │
│      nick: "alice",                                           │
│      email: "alice@example.com",                              │
│      avatarUrl: "dragon-egg",  ← The key field               │
│      ...                                                      │
│    }                                                          │
│                                                               │
│ 3. setCurrentUserId(42)                                       │
│ 4. setCurrentUserAvatarUrl("dragon-egg")                     │
│ 5. setProfileSynced(true)                                    │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ State changes → Header re-renders
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Header.tsx                                                    │
├──────────────────────────────────────────────────────────────┤
│ Before sync: profileSynced=false → Shows grey circle         │
│ After sync:  profileSynced=true  → Shows <Avatar>            │
│                                                               │
│ <Avatar src="dragon-egg" userId={42} />                      │
│   → Resolves to /assets/avatars/dragon-egg.png               │
│   → User sees their avatar ✅                                 │
└──────────────────────────────────────────────────────────────┘
```

**Timing:** ~100-300ms from page load to avatar display.

---

### Flow 2: OAuth Login (42 / Google)

```
┌──────────────┐
│   User       │ Clicks "Login with 42"
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Browser redirects to:                                         │
│ http://localhost:3000/auth/42                                 │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ 42 OAuth flow completes
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Backend redirects back to frontend with JWT:                 │
│ http://localhost:5173/?token=eyJhbGciOiJIUzI1NiIsInR5cCI...   │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ App.tsx OAuth useEffect detects ?token=... in URL
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ App.tsx - OAuth useEffect                                     │
├──────────────────────────────────────────────────────────────┤
│ 1. Extract token from URL                                     │
│ 2. Decode JWT payload:                                        │
│    { sub: 101, nick: "fcatala-", ... }                        │
│                                                               │
│ 3. localStorage.setItem("pong_token", token)                 │
│ 4. localStorage.setItem("pong_user_nick", "fcatala-")        │
│ 5. localStorage.setItem("pong_user_id", "101")               │
│                                                               │
│ 6. setCurrentUser("fcatala-")  ← State change                │
│ 7. setCurrentUserId(101)                                      │
│                                                               │
│ 8. window.history.replaceState() → Remove ?token from URL    │
│ 9. dispatch({ type: "MENU" })   → Navigate to menu           │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ currentUser changed from "" to "fcatala-"
       │ → syncProfile useEffect fires (same as Flow 1)
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ syncProfile useEffect                                         │
├──────────────────────────────────────────────────────────────┤
│ 1. const profile = await getMyProfile()                      │
│    → GET /auth/profile                                        │
│                                                               │
│ 2. Backend returns:                                           │
│    {                                                          │
│      id: 101,                                                 │
│      nick: "fcatala-",                                        │
│      avatarUrl: "https://cdn.intra.42.fr/.../fcatala-.jpg"   │
│      oauthProvider: "42"                                      │
│    }                                                          │
│                                                               │
│ 3. setCurrentUserAvatarUrl("https://cdn.intra.42.fr/...")    │
│ 4. setProfileSynced(true)                                    │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Header.tsx                                                    │
├──────────────────────────────────────────────────────────────┤
│ <Avatar src="https://cdn.intra.42.fr/.../fcatala-.jpg" />    │
│   → Avatar.tsx detects URL starts with "http"                │
│   → Renders OAuth profile picture directly ✅                 │
└──────────────────────────────────────────────────────────────┘
```

**Key Insight:** OAuth URLs work seamlessly because `Avatar.tsx` checks `src.startsWith('http')` and renders them directly without resolution.

---

### Flow 3: Traditional Login (Username + Password)

```
┌──────────────┐
│ LoginScreen  │ User submits form
│   .tsx       │
└──────┬───────┘
       │
       │ handleForm() is called
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ LoginScreen.tsx - handleForm()                                │
├──────────────────────────────────────────────────────────────┤
│ 1. const result = await checkLogin(user, password)           │
│    → Backend validates credentials                            │
│                                                               │
│ 2. Backend returns:                                           │
│    {                                                          │
│      ok: true,                                                │
│      token: "eyJhbGciOiJIUz...",                              │
│      user: {                                                  │
│        id: 51,                                                │
│        name: "bob",                                           │
│        totp: false                                            │
│      }                                                        │
│    }                                                          │
│                                                               │
│ 3. localStorage.setItem("pong_token", result.token)          │
│ 4. localStorage.setItem("pong_user_nick", "bob")             │
│ 5. localStorage.setItem("pong_user_id", "51")                │
│                                                               │
│ 6. setGlobalUser("bob")  ← Callback to App.tsx               │
│ 7. dispatch({ type: "MENU" })                                │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ setGlobalUser("bob") → currentUser changes in App.tsx
       │ → syncProfile useEffect fires
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ App.tsx - syncProfile useEffect                               │
├──────────────────────────────────────────────────────────────┤
│ (Same as Flow 1 & 2)                                          │
│                                                               │
│ Fetches full profile from API, including avatarUrl           │
│ Updates state → Header re-renders with correct avatar        │
└──────────────────────────────────────────────────────────────┘
```

**Critical Detail:** `localStorage.setItem()` is **synchronous**, so the token is guaranteed to be in storage before `setGlobalUser()` triggers the `syncProfile` effect. No race condition.

---

### Flow 4: User Changes Avatar in ProfileScreen

```
┌──────────────┐
│ ProfileScreen│ User clicks "Editar imagen"
│    .tsx      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ AvatarSelector Modal Opens                                    │
├──────────────────────────────────────────────────────────────┤
│ - Shows grid of 13 avatars from /assets/avatars/             │
│ - User clicks "centaur"                                       │
│ - User clicks "Seleccionar" button                            │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ onSelect("centaur") callback fires
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ ProfileScreen.tsx - handleAvatarSelect("centaur")             │
├──────────────────────────────────────────────────────────────┤
│ 1. Prepare update data:                                       │
│    {                                                          │
│      nick: "alice",                                           │
│      email: "alice@example.com",                              │
│      ...all existing fields...,                               │
│      avatarUrl: "centaur"  ← NEW VALUE                        │
│    }                                                          │
│                                                               │
│ 2. const result = await updateMyProfile(updateData)          │
│    → PUT /auth/profile                                        │
│                                                               │
│ 3. Backend updates database:                                  │
│    UPDATE player                                              │
│    SET p_avatar_url = 'centaur'                               │
│    WHERE p_pk = 42;                                           │
│                                                               │
│ 4. Backend returns:                                           │
│    {                                                          │
│      ok: true,                                                │
│      user: { ...profile with avatarUrl: "centaur" }           │
│    }                                                          │
│                                                               │
│ 5. Update local state:                                        │
│    setUserProfile(prev => ({...prev, avatarUrl: "centaur"})) │
│                                                               │
│ 6. Propagate to Header immediately:                           │
│    setGlobalAvatarUrl("centaur")  ← Callback to App.tsx      │
│                                                               │
│ 7. Close modal:                                               │
│    setIsSelectingAvatar(false)                                │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ App.tsx state updated → Header re-renders
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Header.tsx                                                    │
├──────────────────────────────────────────────────────────────┤
│ <Avatar src="centaur" userId={42} />                          │
│   → Avatar.tsx resolves "centaur" to                          │
│     /assets/avatars/centaur.png                               │
│   → New avatar displays instantly ✅                           │
│                                                               │
│ User sees change without page reload                          │
└──────────────────────────────────────────────────────────────┘
```

**Timing:** Avatar updates in ~200-500ms (API round-trip time). No page reload needed.

---

### Flow 5: User Changes Nickname in ProfileScreen

```
┌──────────────┐
│ ProfileScreen│ User clicks "Editar" button
│    .tsx      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Edit Mode Activated                                           │
├──────────────────────────────────────────────────────────────┤
│ - Form fields become editable                                 │
│ - User changes nick from "alice" to "alice_pro"               │
│ - User clicks "Guardar" button                                │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ handleUpdateProfile() is called
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ ProfileScreen.tsx - handleUpdateProfile()                     │
├──────────────────────────────────────────────────────────────┤
│ 1. Build update data:                                         │
│    {                                                          │
│      nick: "alice_pro",        ← NEW VALUE                    │
│      email: "alice@example.com",                              │
│      birth: "1995-03-15",                                     │
│      country: "ES",                                           │
│      lang: "en",                                              │
│      avatarUrl: "dragon-egg"   ← CARRIED FORWARD              │
│    }                                                          │
│                                                               │
│    ⚠️ CRITICAL: avatarUrl must be included                    │
│       Otherwise backend might clear it                        │
│                                                               │
│ 2. Check if nick changed:                                     │
│    if (editForm.nick !== userProfile?.nick) {                │
│      localStorage.setItem('pong_user_nick', 'alice_pro')     │
│      setGlobalUser('alice_pro')  ← Update App.tsx            │
│    }                                                          │
│                                                               │
│ 3. const result = await updateMyProfile(updateData)          │
│    → PUT /auth/profile                                        │
│                                                               │
│ 4. Backend updates database:                                  │
│    UPDATE player                                              │
│    SET p_nick = 'alice_pro',                                  │
│        p_avatar_url = 'dragon-egg'  ← Preserved              │
│    WHERE p_pk = 42;                                           │
│                                                               │
│ 5. Reload profile from API:                                   │
│    await loadUserProfile()                                    │
│    → Syncs everything back, including avatar                 │
│                                                               │
│ 6. Exit edit mode:                                            │
│    setIsEditing(false)                                        │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ App.tsx currentUser updated → Header re-renders
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Header.tsx                                                    │
├──────────────────────────────────────────────────────────────┤
│ <p><strong>alice_pro</strong></p>  ← New nick displays       │
│ <Avatar src="dragon-egg" userId={42} />  ← Avatar preserved  │
│                                                               │
│ Both nick and avatar update correctly ✅                      │
└──────────────────────────────────────────────────────────────┘
```

**Key Design Decision:** When updating any profile field, **always include `avatarUrl`** in the update payload. This prevents accidental deletion when editing unrelated fields.

---

## Detailed Component Breakdown

### App.tsx — Central State Management

**File:** `srcs/frontend/src/App.tsx`

#### State Variables

```typescript
// Bootstrap from localStorage on page load
const savedUserNick = localStorage.getItem("pong_user_nick") || "";
const savedUserId = Number(localStorage.getItem("pong_user_id")) || undefined;

// Primary state
const [currentUser, setCurrentUser] = useState<string>(savedUserNick);
const [currentUserId, setCurrentUserId] = useState<number | undefined>(savedUserId);
const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);

// Sync flag: prevents flashing wrong avatar during API fetch
// Initializes to true if no user (logged out), false if user exists (needs sync)
const [profileSynced, setProfileSynced] = useState<boolean>(!savedUserNick);
```

**Why `profileSynced` starts as `!savedUserNick`?**

| Scenario | savedUserNick | !savedUserNick | Result |
|----------|---------------|----------------|--------|
| No user logged in | `""` | `true` | No sync needed, render immediately |
| User logged in | `"alice"` | `false` | Sync pending, show placeholder |

This prevents the Header from rendering a wrong avatar during the ~200ms API fetch window.

---

#### useEffect 1: OAuth Token Handling

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (token) {
    // 1. Decode JWT to get nick & id
    const payload = JSON.parse(/* base64 decode */);

    // 2. Save to localStorage
    localStorage.setItem("pong_token", token);
    localStorage.setItem("pong_user_nick", payload.nick);
    localStorage.setItem("pong_user_id", payload.sub.toString());

    // 3. Update state (triggers syncProfile)
    setCurrentUser(payload.nick);
    setCurrentUserId(Number(payload.sub));
    // ❌ DO NOT set avatarUrl here — syncProfile will fetch it

    // 4. Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);

    // 5. Navigate
    dispatch({ type: "MENU" });
  }
}, []); // Runs once on mount
```

**Timing:** Executes before any render, catches OAuth redirects immediately.

---

#### useEffect 2: Profile Sync on Login/Refresh

```typescript
useEffect(() => {
  if (!currentUser) return;

  const syncProfile = async () => {
    try {
      const profile = await getMyProfile();
      if (profile) {
        setCurrentUserId(profile.id);
        setCurrentUserAvatarUrl(profile.avatarUrl ?? null);
        localStorage.setItem("pong_user_id", String(profile.id));
        console.log("✅ [App] Profile synced — avatarUrl:", profile.avatarUrl);
      }
    } catch (err) {
      console.warn("⚠️ [App] Could not sync profile on login:", err);
    } finally {
      setProfileSynced(true); // Always mark as done, even on error
    }
  };

  syncProfile();
}, [currentUser]); // Fires whenever currentUser becomes truthy
```

**Dependency:** `[currentUser]` — fires on:
- Page refresh (if savedUserNick exists)
- OAuth login (when `setCurrentUser` is called)
- Traditional login (when `LoginScreen` calls `setGlobalUser`)

**Error Handling:** Non-fatal. If the API call fails, `profileSynced` still becomes `true` so the UI doesn't hang. The avatar falls back to the default based on `userId`.

---

#### handleLogout Function

```typescript
const handleLogout = () => {
  // 1. Clear localStorage
  localStorage.removeItem("pong_user_nick");
  localStorage.removeItem("pong_user_id");
  localStorage.removeItem("pong_token");

  // 2. Disconnect socket
  socket.disconnect();

  // 3. Reset all state
  setCurrentUser("");
  setCurrentUserId(undefined);
  setCurrentUserAvatarUrl(null);
  setProfileSynced(false); // Next login will start with sync pending

  // 4. Navigate to login
  dispatch({ type: "LOGOUT" });
};
```

**Passed to:** `Header.tsx` via `onLogout` prop. Called when user clicks "Sign out".

---

### Header.tsx — Avatar Display

**File:** `srcs/frontend/src/components/Header.tsx`

#### Props Interface

```typescript
type HeaderProps = {
  dispatch: React.Dispatch<any>;
  userName: string;
  userId?: number;
  userAvatarUrl?: string | null;
  profileSynced: boolean;
  onLogout: () => void;
};
```

#### Render Logic

```typescript
{isLogged && (
  <div className="login" ref={dropdownRef} onClick={() => setOpen(!open)}>
    
    {profileSynced
      ? <Avatar
          src={userAvatarUrl}
          userId={userId ?? 0}
          size={36}
          alt={userName}
        />
      : <div style={{
          width: 36, height: 36,
          borderRadius: '50%',
          backgroundColor: '#d1d5db' // Neutral grey
        }} />
    }
    
    <p className="letters"><strong>{userName}</strong></p>
    
    {/* Dropdown menu */}
  </div>
)}
```

**Conditional Rendering:**
- **`profileSynced === false`:** Show grey circle (~100-300ms after login)
- **`profileSynced === true`:** Show real avatar via `<Avatar>` component

**Why grey circle?** Without it, the header would show the wrong avatar (fallback based on `userId ?? 0`) for a visible moment before the API returns. The grey circle is intentionally neutral and unobtrusive.

---

### LoginScreen.tsx — Traditional & OAuth Login

**File:** `srcs/frontend/src/screens/LoginScreen.tsx`

#### Props Interface

```typescript
type LoginScreenProps = ScreenProps & {
  setGlobalUser: (user: string) => void;
};
```

**Receives:** Single callback `setGlobalUser` which maps to `setCurrentUser` in `App.tsx`.

#### Traditional Login Flow

```typescript
const handleForm = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const result = await checkLogin(user, password);
  
  if (result.ok) {
    // 1. Save to localStorage (synchronous)
    localStorage.setItem("pong_token", result.token);
    localStorage.setItem("pong_user_nick", result.user.name);
    localStorage.setItem("pong_user_id", result.user.id.toString());

    // 2. Update App state (triggers syncProfile)
    setGlobalUser(result.user.name);

    // 3. Navigate
    dispatch({ type: "MENU" });
  }
};
```

**Note:** `LoginScreen` does **not** receive `setGlobalUserId` or `setGlobalAvatarUrl`. The `syncProfile` useEffect in `App.tsx` handles fetching those automatically.

#### OAuth Button

```typescript
const handleOAuth = (provider: 'google' | '42') => {
  window.location.href = `http://localhost:3000/auth/${provider}`;
};
```

**Flow:** Redirects to backend → OAuth provider → backend issues JWT → redirects back to frontend with `?token=...` in URL → `App.tsx` OAuth useEffect handles it.

---

### ProfileScreen.tsx — Profile Editor

**File:** `srcs/frontend/src/screens/ProfileScreen.tsx`

#### Props Interface

```typescript
interface ProfileScreenProps {
  setGlobalUser: (nick: string) => void;
  setGlobalUserId: (id: number) => void;
  setGlobalAvatarUrl: (url: string | null) => void;
}
```

**Receives:** Three callbacks to propagate changes back to `App.tsx` state.

---

#### loadUserProfile() — Sync on Mount

```typescript
const loadUserProfile = async () => {
  try {
    setIsLoadingProfile(true);
    const profile = await getMyProfile();
    
    if (!profile) {
      throw new Error(t('prof.prof_no_load'));
    }

    console.log("✅ [ProfileScreen] Profile loaded:", profile);
    setUserProfile(profile);
    
    // 🔥 CRITICAL: Sync to App.tsx immediately
    setGlobalUserId(profile.id);
    setGlobalAvatarUrl(profile.avatarUrl ?? null);
    
    // Initialize edit form
    setEditForm({
      nick: profile.nick || '',
      email: profile.email || '',
      // ... other fields
    });

  } catch (error) {
    console.error('❌ [ProfileScreen] Error loading user profile:', error);
    showModal({
      title: t('error'),
      message: t('prof.prof_no_load'),
      type: "alert"
    });
  } finally {
    setIsLoadingProfile(false);
  }
};
```

**Called:** Inside `useEffect` on component mount.

**Why sync here?** If the user navigates directly to `/profile` (e.g., via URL or "Profile" menu), `syncProfile` in `App.tsx` has already run, but this call ensures the Header stays in sync if the user changes their avatar during the session.

---

#### handleAvatarSelect() — Avatar Picker

```typescript
const handleAvatarSelect = async (newAvatarUrl: string) => {
  console.log('🔍 [ProfileScreen] STEP 3: handleAvatarSelect called');
  console.log('🔍 [ProfileScreen] Received value:', newAvatarUrl);
  
  try {
    // Prepare full profile update (preserving all fields)
    const updateData: UpdateProfileData = {
      nick: userProfile!.nick,
      email: userProfile!.email,
      birth: userProfile!.birth,
      country: userProfile!.country,
      lang: userProfile!.lang,
      avatarUrl: newAvatarUrl // ← NEW VALUE
    };

    console.log('🔍 [ProfileScreen] STEP 4: Prepared updateData:', updateData);

    const result = await updateMyProfile(updateData);

    console.log('🔍 [ProfileScreen] STEP 5: Backend response:', result);

    if (result.ok) {
      console.log('✅ [ProfileScreen] STEP 6: Update successful!');
      
      // Update local state
      setUserProfile(prev => {
        const updated = prev ? { ...prev, avatarUrl: newAvatarUrl } : null;
        console.log('🔍 [ProfileScreen] New userProfile state:', updated);
        return updated;
      });
      
      // 🔥 CRITICAL: Sync to App.tsx immediately
      setGlobalAvatarUrl(newAvatarUrl);
      
      console.log('🔍 [ProfileScreen] STEP 7: Closing modal');
      setIsSelectingAvatar(false);
    } else {
      console.error('❌ [ProfileScreen] STEP 6: Update FAILED!');
      console.error('❌ [ProfileScreen] Error message:', result.msg);
      
      showModal({
        title: t('error'),
        message: result.msg || t('prof.avatar_update_error'),
        type: "alert"
      });
    }
  } catch (error) {
    console.error('❌ [ProfileScreen] Exception in handleAvatarSelect:', error);
    
    showModal({
      title: t('error'),
      message: t('prof.avatar_update_error2'),
      type: "alert"
    });
  }
};
```

**Called by:** `AvatarSelector` component when user clicks "Seleccionar".

**Key Point:** `setGlobalAvatarUrl(newAvatarUrl)` ensures the Header updates instantly without page reload.

---

#### handleUpdateProfile() — Text Fields Editor

```typescript
const handleUpdateProfile = async () => {
  console.log("💾 [ProfileScreen] handleUpdateProfile() - Starting...");
  console.log("📝 [ProfileScreen] Form data:", editForm);

  // Validations
  if (!editForm.nick || !editForm.email) {
    console.warn("⚠️ [ProfileScreen] Validation failed: Missing required fields");
    showModal({
      title: t('error'),
      message: t('prof.fields_required'),
      type: "alert"
    });
    return;
  }

  if (editForm.nick !== userProfile?.nick) {
    console.log("🔄 [ProfileScreen] Updating localStorage with new nick:", editForm.nick);
    localStorage.setItem('pong_user_nick', editForm.nick);
    
    // 🔥 NEW: Update the global App state (Header) immediately
    setGlobalUser(editForm.nick);
  }

  // Password change validation (if applicable)
  if (editForm.newPassword) {
    // ... validation logic
  }

  try {
    const updateData: UpdateProfileData = {
      nick: editForm.nick,
      email: editForm.email,
      birth: editForm.birth,
      country: editForm.country,
      lang: editForm.lang,
      // 🔥 CRITICAL: Always carry avatarUrl forward
      // Otherwise saving text fields might clear the avatar
      avatarUrl: userProfile!.avatarUrl ?? undefined
    };

    // Include password fields if changing password
    if (editForm.newPassword) {
      updateData.currentPassword = editForm.currentPassword;
      updateData.newPassword = editForm.newPassword;
      console.log("🔐 [ProfileScreen] Including password change in update");
    }

    console.log("📡 [ProfileScreen] Sending update request...");
    const result = await updateMyProfile(updateData);

    if (!result.ok) {
      console.error("❌ [ProfileScreen] Update failed:", result.msg);
      throw new Error(result.msg || t('prof.update_error'));
    }

    console.log("✅ [ProfileScreen] Profile updated successfully");

    showModal({
      title: t('prof.update_success_title'),
      message: t('prof.update_success_msg'),
      type: "alert"
    });

    // Reload profile and exit edit mode
    await loadUserProfile();
    setIsEditing(false);
    
    // Clear password fields
    setEditForm(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));

    console.log("🏁 [ProfileScreen] handleUpdateProfile() - Success");

  } catch (error: any) {
    console.error('❌ [ProfileScreen] Error updating profile:', error);
    showModal({
      title: t('error'),
      message: error.message || t('prof.update_error'),
      type: "alert"
    });
  }
};
```

**🔥 Critical Line:**
```typescript
avatarUrl: userProfile!.avatarUrl ?? undefined
```

**Why?** When updating nick/email/country/etc., we must explicitly include the current `avatarUrl` in the payload. Otherwise, the backend's `if (updateData.avatarUrl !== undefined)` check skips the field, but TypeScript allows `undefined` to be passed, which could clear the field depending on backend implementation.

**Safe Pattern:** Always carry forward all fields when doing partial updates.

---

### user.service.ts — API Communication

**File:** `srcs/frontend/src/services/user.service.ts`

#### UserProfile Interface

```typescript
export interface UserProfile {
  id: number;
  nick: string;
  email: string;
  birth?: string;
  country: string;
  lang: string;
  avatarUrl?: string;        // ← Key field for this system
  oauthProvider?: string;    // '42', 'google', or null
}
```

#### getMyProfile() — Fetch Full Profile

```typescript
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
    
    return data; // Returns UserProfile object directly
  } catch (error) {
    console.error("❌ [user.service] Error in getMyProfile():", error);
    return null;
  }
};
```

**Returns:** `UserProfile` object directly (not wrapped in `{ user: ... }`).

**Called by:**
- `App.tsx` → `syncProfile` useEffect
- `ProfileScreen.tsx` → `loadUserProfile()`

---

#### updateMyProfile() — Save Changes

```typescript
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

    const url = `${API_URL}/auth/profile`;
    console.log("🔍 [user.service] STEP 9: Sending PUT request to:", url);

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
    console.error("❌ [user.service] Exception in updateMyProfile:", error);
    return { 
      ok: false, 
      msg: "Connection error" 
    };
  }
};
```

**Returns:** `{ ok: boolean, msg: string, user?: UserProfile }`

**Called by:**
- `ProfileScreen.tsx` → `handleAvatarSelect()`
- `ProfileScreen.tsx` → `handleUpdateProfile()`

---

### Avatar.tsx — Display Component

**File:** `srcs/frontend/src/components/Avatar.tsx`

**Purpose:** Intelligently renders avatars from three possible sources:
1. OAuth URLs (e.g., `https://cdn.intra.42.fr/...`)
2. Avatar IDs (e.g., `"dragon-egg"`) → resolved to local files
3. Fallback defaults based on `userId` modulo

#### Props Interface

```typescript
interface AvatarProps {
  src?: string | null;  // Can be: OAuth URL, avatar ID, or null
  userId: number;
  size?: number;
  alt?: string;
}
```

#### Resolution Logic

```typescript
export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  userId, 
  size = 80, 
  alt = 'User avatar' 
}) => {
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Determine the actual image URL to display
  let avatarSrc: string;
  let isOAuthUrl = false;
  
  if (!src || imgError) {
    // No avatar or error loading - use default based on user ID
    avatarSrc = getDefaultAvatar(userId);
    console.log('🎨 [Avatar] Using default avatar for user', userId);
  } else if (src.startsWith('http://') || src.startsWith('https://')) {
    // OAuth provider URL - use as is
    avatarSrc = src;
    isOAuthUrl = true;
    console.log('🌐 [Avatar] Using OAuth URL:', src);
  } else {
    // Avatar ID from gallery - resolve to actual URL
    const resolvedUrl = getAvatarUrlById(src);
    avatarSrc = resolvedUrl || getDefaultAvatar(userId);
    console.log('🖼️ [Avatar] Resolved avatar ID', src, 'to URL:', avatarSrc);
  }
  
  // ... error handling, loading states, render
};
```

**Key Decision Tree:**

```
src value?
├─ null/undefined → getDefaultAvatar(userId)
├─ "http://..." → Use as-is (OAuth)
└─ "dragon-egg" → getAvatarUrlById("dragon-egg")
                  → /assets/avatars/dragon-egg.png
```

---

## Edge Cases & Solutions

### Edge Case 1: Race Condition on Page Refresh

**Problem:** `syncProfile` fetches avatar from API (~200ms). During this time, if `userId` is wrong or `0`, `Avatar` component shows the wrong fallback image.

**Solution:** `profileSynced` flag. Header shows grey circle until sync completes.

**Code:**
```typescript
const [profileSynced, setProfileSynced] = useState<boolean>(!savedUserNick);
```

---

### Edge Case 2: User Changes Avatar Then Immediately Edits Nickname

**Problem:** If `handleUpdateProfile()` doesn't include `avatarUrl` in the payload, the backend's `if (updateData.avatarUrl !== undefined)` skips the field, but the user's recently-set avatar might be lost.

**Solution:** Always carry `avatarUrl` forward in `updateData`:

```typescript
const updateData: UpdateProfileData = {
  nick: editForm.nick,
  email: editForm.email,
  // ... other fields
  avatarUrl: userProfile!.avatarUrl ?? undefined // ← CRITICAL
};
```

---

### Edge Case 3: User Logs Out and Logs Back In

**Problem:** Stale state from previous session could cause wrong avatar to flash.

**Solution:** `handleLogout()` resets **all** state including `profileSynced = false`:

```typescript
const handleLogout = () => {
  // ... clear localStorage, disconnect socket
  
  setCurrentUser("");
  setCurrentUserId(undefined);
  setCurrentUserAvatarUrl(null);
  setProfileSynced(false); // ← Force next login to sync
  
  dispatch({ type: "LOGOUT" });
};
```

---

### Edge Case 4: API Call Fails During syncProfile

**Problem:** If `getMyProfile()` throws an error, `profileSynced` stays `false` forever and the Header shows grey circle permanently.

**Solution:** `finally` block always sets `profileSynced = true`:

```typescript
const syncProfile = async () => {
  try {
    const profile = await getMyProfile();
    // ... update state
  } catch (err) {
    console.warn("⚠️ [App] Could not sync profile on login:", err);
  } finally {
    setProfileSynced(true); // ← Always mark as done
  }
};
```

**Result:** If API fails, avatar falls back to default based on `userId`. Better than infinite loading.

---

### Edge Case 5: OAuth User Switches to Gallery Avatar

**Problem:** User's `avatarUrl` changes from `https://cdn.intra.42.fr/...` (OAuth) to `"centaur"` (gallery ID). Does the system handle this gracefully?

**Solution:** `Avatar.tsx` checks `src.startsWith('http')` on every render. When `src` changes from URL to ID, it automatically switches resolution logic:

```typescript
// Before: src = "https://cdn.intra.42.fr/.../user.jpg"
//   → isOAuthUrl = true → renders URL directly

// After: src = "centaur"
//   → isOAuthUrl = false → calls getAvatarUrlById("centaur")
//   → resolves to /assets/avatars/centaur.png
```

No special handling needed. ✅

---

### Edge Case 6: Token Expires Mid-Session

**Problem:** User leaves tab open for hours. Token expires. They navigate to Profile screen, `getMyProfile()` returns 401 Unauthorized.

**Current Behavior:** `syncProfile` catches the error, logs a warning, sets `profileSynced = true`. Avatar falls back to default. User can still navigate but won't see real avatar.

**Recommended Enhancement:** Add global 401 handler that redirects to login:

```typescript
// In user.service.ts
if (response.status === 401) {
  // Token expired
  localStorage.removeItem("pong_token");
  window.location.href = "/login";
  return null;
}
```

---

## Testing Guide

### Test Case 1: Page Refresh

**Steps:**
1. Log in with any method (OAuth or traditional)
2. Navigate to any screen (Menu, Profile, etc.)
3. Refresh the page (F5 or Ctrl+R)

**Expected Result:**
- Header shows grey circle for ~200ms
- Then correct avatar appears
- Username displays correctly

**Console Log Verification:**
```
✅ [App] Profile synced — avatarUrl: dragon-egg
```

---

### Test Case 2: OAuth Login (42)

**Steps:**
1. Start logged out
2. Click "Login with 42" button
3. Complete 42 OAuth flow
4. Redirected back to app

**Expected Result:**
- Header initially shows grey circle
- After ~200ms, 42 profile picture appears
- Console shows OAuth URL

**Console Log Verification:**
```
🔐 OAuth token detected in URL, processing...
🔓 OAuth Login successful: fcatala-
✅ [App] Profile synced — avatarUrl: https://cdn.intra.42.fr/.../fcatala-.jpg
🌐 [Avatar] Using OAuth URL: https://cdn.intra.42.fr/.../fcatala-.jpg
```

---

### Test Case 3: Traditional Login

**Steps:**
1. Enter username and password
2. Click "Enviar"

**Expected Result:**
- Redirected to menu
- Header shows grey circle briefly
- Then avatar appears (gallery avatar or default)

**Console Log Verification:**
```
📡 [user.service] getMyProfile() - Starting request...
✅ [user.service] Profile fetched successfully: {id: 51, nick: "bob", avatarUrl: "dragon-egg"}
✅ [App] Profile synced — avatarUrl: dragon-egg
🖼️ [Avatar] Resolved avatar ID dragon-egg to URL: /src/assets/avatars/dragon-egg.png
```

---

### Test Case 4: Avatar Change

**Steps:**
1. Navigate to Profile
2. Click "Editar imagen"
3. Select different avatar from gallery
4. Click "Seleccionar"

**Expected Result:**
- Modal closes
- Header avatar updates immediately (no page reload)
- Profile screen avatar also updates

**Console Log Verification:**
```
🔍 [ProfileScreen] STEP 3: handleAvatarSelect called
🔍 [ProfileScreen] Received value: centaur
🔍 [ProfileScreen] STEP 4: Prepared updateData: {...}
🔍 [user.service] STEP 8: updateMyProfile called
✅ [user.service] Profile updated successfully
✅ [ProfileScreen] STEP 6: Update successful!
```

---

### Test Case 5: Nickname Change

**Steps:**
1. Navigate to Profile
2. Click "Editar"
3. Change nickname from "alice" to "alice_pro"
4. Click "Guardar"

**Expected Result:**
- Header username updates immediately
- Header avatar remains the same (not cleared)
- Success modal appears

**Console Log Verification:**
```
💾 [ProfileScreen] handleUpdateProfile() - Starting...
🔄 [ProfileScreen] Updating localStorage with new nick: alice_pro
📡 [ProfileScreen] Sending update request...
✅ [ProfileScreen] Profile updated successfully
```

---

### Test Case 6: Logout & Re-login

**Steps:**
1. Log in and set custom avatar
2. Log out
3. Log in again with same account

**Expected Result:**
- Avatar displays correctly after second login
- No flashing of wrong avatar
- Same avatar from before logout

**What to Check:**
- `localStorage` cleared on logout
- `syncProfile` runs on second login
- Backend returns correct `avatarUrl`

---

### Test Case 7: OAuth to Gallery Avatar Switch

**Steps:**
1. Log in with OAuth (42 or Google)
2. See OAuth profile picture in header
3. Navigate to Profile
4. Click "Editar imagen"
5. Select gallery avatar (e.g., "centaur")
6. Click "Seleccionar"

**Expected Result:**
- Header switches from OAuth URL to gallery avatar
- No visual glitches
- Change persists after logout/login

**Console Log Verification:**
```
Before: 🌐 [Avatar] Using OAuth URL: https://...
After:  🖼️ [Avatar] Resolved avatar ID centaur to URL: /assets/avatars/centaur.png
```

---

## Comparison: Nick vs Avatar Sync

Both nickname and avatar use the same propagation pattern, but with subtle differences:

| Aspect | Nickname | Avatar |
|--------|----------|--------|
| **Stored in JWT?** | ✅ Yes (`payload.nick`) | ❌ No |
| **Stored in localStorage?** | ✅ Yes (`pong_user_nick`) | ❌ No |
| **Fetched from API on login?** | Optional (already have it) | ✅ Always required |
| **Propagation callback** | `setGlobalUser(nick)` | `setGlobalAvatarUrl(url)` |
| **Called from ProfileScreen?** | ✅ Yes, on nick change | ✅ Yes, on avatar change |
| **Carried in updateData?** | ✅ Yes, when saving | ✅ Yes, when saving |
| **Loading state needed?** | ❌ No | ✅ Yes (`profileSynced`) |

---

### Why Nickname is Simpler

**Nickname** is in the JWT payload, so on OAuth login:
```typescript
const payload = JSON.parse(/* decode JWT */);
localStorage.setItem("pong_user_nick", payload.nick);
setCurrentUser(payload.nick); // ← Available immediately
```

**Avatar** is NOT in the JWT payload, so we must fetch it:
```typescript
const profile = await getMyProfile(); // ← API call required
setCurrentUserAvatarUrl(profile.avatarUrl ?? null);
```

---

### Why Avatar Needs profileSynced Flag

**Nickname:**
- Available immediately from JWT/localStorage
- No async fetch → no loading state needed
- Header can render username instantly

**Avatar:**
- Requires async API call (~200ms)
- During fetch, `currentUserAvatarUrl` is `null`
- Without flag, `Avatar` component would show wrong fallback
- With flag, Header shows grey circle until ready

---

### Both Follow Same Propagation Pattern

When user changes **nickname** in ProfileScreen:
```typescript
// 1. Update localStorage
localStorage.setItem('pong_user_nick', newNick);

// 2. Propagate to App.tsx
setGlobalUser(newNick);

// 3. Header re-renders with new nick ✅
```

When user changes **avatar** in ProfileScreen:
```typescript
// 1. Update local state
setUserProfile(prev => ({...prev, avatarUrl: newAvatar}));

// 2. Propagate to App.tsx
setGlobalAvatarUrl(newAvatar);

// 3. Header re-renders with new avatar ✅
```

**Same pattern, different timing.** Nickname is synchronous, avatar is async.

---

## Future Enhancements

### Enhancement 1: Optimistic Avatar Updates

**Current:** Avatar updates after backend confirms.

**Proposed:** Update UI immediately, revert on error.

```typescript
const handleAvatarSelect = async (newAvatarUrl: string) => {
  // Optimistic update
  setUserProfile(prev => ({...prev, avatarUrl: newAvatarUrl}));
  setGlobalAvatarUrl(newAvatarUrl);
  
  try {
    const result = await updateMyProfile(updateData);
    if (!result.ok) throw new Error(result.msg);
  } catch (error) {
    // Revert on error
    setUserProfile(prev => ({...prev, avatarUrl: oldAvatarUrl}));
    setGlobalAvatarUrl(oldAvatarUrl);
    showModal({ title: "Error", message: error.message });
  }
};
```

**Benefit:** User sees change instantly (~0ms instead of ~300ms).

---

### Enhancement 2: Avatar Caching

**Current:** Every page refresh fetches avatar from API.

**Proposed:** Cache avatar in localStorage with timestamp.

```typescript
// On successful sync
const cacheData = {
  avatarUrl: profile.avatarUrl,
  userId: profile.id,
  timestamp: Date.now()
};
localStorage.setItem('avatar_cache', JSON.stringify(cacheData));

// On page refresh
const cache = JSON.parse(localStorage.getItem('avatar_cache') || '{}');
const isFresh = Date.now() - cache.timestamp < 5 * 60 * 1000; // 5 minutes
if (isFresh && cache.userId === savedUserId) {
  setCurrentUserAvatarUrl(cache.avatarUrl);
  setProfileSynced(true);
} else {
  // Fetch from API as usual
}
```

**Benefit:** Faster page loads. Reduces API calls.

**Tradeoff:** Introduces staleness risk if avatar is changed on another device.

---

### Enhancement 3: WebSocket Avatar Updates

**Current:** Avatar updates only when user refreshes or navigates.

**Proposed:** Push updates via WebSocket when avatar changes.

```typescript
// Backend emits on avatar update
socket.emit('avatar_updated', { userId, newAvatarUrl });

// Frontend listener in App.tsx
socket.on('avatar_updated', (data) => {
  if (data.userId === currentUserId) {
    setCurrentUserAvatarUrl(data.newAvatarUrl);
  }
});
```

**Benefit:** Real-time sync across multiple tabs/devices.

---

### Enhancement 4: Progressive Avatar Loading

**Current:** Grey circle → full avatar (binary states).

**Proposed:** Grey circle → skeleton → blurred thumbnail → full avatar.

```typescript
const [avatarState, setAvatarState] = useState<'loading' | 'thumbnail' | 'full'>('loading');

<Avatar
  src={userAvatarUrl}
  state={avatarState}
  onLoadStart={() => setAvatarState('thumbnail')}
  onLoad={() => setAvatarState('full')}
/>
```

**Benefit:** Better perceived performance, smoother UX.

---

### Enhancement 5: Avatar Upload Support

**Current:** Only gallery avatars and OAuth URLs.

**Proposed:** Allow custom image uploads.

```typescript
const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);
  
  const response = await fetch(`${API_URL}/auth/avatar`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  const { avatarUrl } = await response.json();
  setGlobalAvatarUrl(avatarUrl);
};
```

**Backend:** Store uploaded images in S3/CDN, return URL.

**Benefit:** Full personalization for users.

---

## Summary

### Key Architectural Decisions

1. **JWT carries authentication, API carries profile data**
   - Avatar never in JWT → always fetch from API
   - Single source of truth → database

2. **Centralized state in App.tsx**
   - All screens receive state as props
   - Changes propagate via callbacks
   - Ensures consistency across app

3. **Explicit sync trigger**
   - `syncProfile` useEffect on `[currentUser]`
   - Covers all login paths automatically
   - No duplication of fetch logic

4. **Visual feedback during async operations**
   - `profileSynced` flag prevents wrong avatar flash
   - Grey circle placeholder during fetch
   - Smooth transition to real avatar

5. **Defensive programming for profile updates**
   - Always carry all fields in `updateData`
   - Prevents accidental field deletion
   - Explicit > implicit

---

### Files Modified Summary

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `App.tsx` | ~30 | Central state + sync logic |
| `Header.tsx` | ~15 | Avatar display + placeholder |
| `ProfileScreen.tsx` | ~20 | Propagate changes to App |
| `user.service.ts` | 0 | Already correct (no changes) |

**Total:** ~65 lines of code to implement full sync system.

---

### Testing Checklist

- [ ] Page refresh shows correct avatar
- [ ] OAuth login shows OAuth profile picture
- [ ] Traditional login shows gallery/default avatar
- [ ] Avatar change reflects in header immediately
- [ ] Nickname change preserves avatar
- [ ] Logout clears all state
- [ ] Re-login shows correct avatar
- [ ] OAuth → Gallery switch works
- [ ] Gallery → OAuth switch works (if backend supports)
- [ ] Token expiry handled gracefully
- [ ] API failure doesn't break UI
- [ ] Multiple tabs stay in sync (optional with WebSocket)

---

**Document Version:** 1.0  
**Last Updated:** 2025-02-11  
**Author:** Technical Team  
**Status:** Production Ready ✅
