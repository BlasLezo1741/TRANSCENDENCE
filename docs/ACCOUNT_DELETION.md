# Account Deletion & Anonymization

## Overview

For data integrity reasons, accounts are **never hard-deleted** from the database. Instead, they are **anonymized**: all personal data is overwritten and the account is marked with a dedicated status (`p_status = 6`) that prevents it from appearing in any user-facing feature.

Match history, scores, and competitor records are **intentionally preserved** so that other users' histories remain complete and accurate.

---

## Process Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                    │
│                                                                     │
│  ProfileScreen.tsx                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. User clicks "Delete account"                            │   │
│  │         │                                                   │   │
│  │         ▼                                                   │   │
│  │  2. Confirmation modal (prof.delete_account_confirm)        │   │
│  │         │                                                   │   │
│  │         ▼                                                   │   │
│  │  3. handleDeleteAccount() → deleteMyAccount()               │   │
│  └─────────────────────┬───────────────────────────────────────┘   │
│                        │  POST /auth/delete-account                 │
│                        │  Authorization: Bearer <JWT>               │
└────────────────────────┼────────────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────────────────┐
│                        ▼          BACKEND                           │
│                                                                     │
│  auth.controller.ts                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  4. Extract userId from JWT token                           │   │
│  │         │                                                   │   │
│  │         ▼                                                   │   │
│  │  auth.service.ts → anonymizeUser(userId)                    │   │
│  │         │                                                   │   │
│  │         ├─ Verify user exists (findUserById)                │   │
│  │         │                                                   │   │
│  │         ▼                                                   │   │
│  │  5. db.execute(SELECT anonymize_player_by_id(userId))       │   │
│  └─────────────────────┬───────────────────────────────────────┘   │
│                        │  Drizzle ORM → PostgreSQL                  │
└────────────────────────┼────────────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────────────────┐
│                        ▼          DATABASE                          │
│                                                                     │
│  10_functions.sql → anonymize_player_by_id(player_id)               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  6a. UPDATE PLAYER SET                                      │   │
│  │      p_nick     = 'Legacy_' + unix_timestamp                │   │
│  │      p_mail     = 'deleted_' + p_pk + '@legacy.local'       │   │
│  │      p_pass     = NULL                                      │   │
│  │      p_avatar_url = 'deleted'          ← sentinel value     │   │
│  │      p_status   = 6                    ← deletion flag      │   │
│  │      ... (all other PII fields → NULL)                      │   │
│  │                                                             │   │
│  │  6b. DELETE FROM player_friend                              │   │
│  │      WHERE f_1 = player_id OR f_2 = player_id              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────────────────┐
│                        ▼          FRONTEND                          │
│                                                                     │
│  ProfileScreen.tsx                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  7. result.ok === true → window.location.href = '/'         │   │
│  │     (user session ends, redirected to home)                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Avatar Resolution Flow

The `Avatar` component (`Avatar.tsx`) resolves what image to display using the following priority chain. The `index.ts` module provides the helper functions for gallery and default resolution.

```
Avatar receives src prop
         │
         ▼
  src === 'deleted'?
    YES → nouser_chatgpt.png          ← deleted account sentinel
         │
         NO
         ▼
  src is null or load error?
    YES → getDefaultAvatar(userId)    ← deterministic fallback based on userId % total_avatars
         │                               (from index.ts → avatarModules glob)
         NO
         ▼
  src starts with http(s)?
    YES → use as-is (OAuth URL)       ← Google / 42 profile picture
         │
         NO
         ▼
  getAvatarUrlById(src)               ← gallery ID (e.g. "avatar-3") resolved
    found?                               via import.meta.glob in index.ts
    YES → resolved URL
    NO  → getDefaultAvatar(userId)    ← fallback if ID not found
```

### Key files

| File | Role |
|------|------|
| `srcs/frontend/src/components/Avatar.tsx` | Renders the avatar; contains the resolution logic above |
| `srcs/frontend/src/assets/avatars/index.ts` | Eagerly imports all `*.png` files in the avatars folder via `import.meta.glob`; exports `getAvatarUrlById()`, `getDefaultAvatar()`, `getAvatarList()` |
| `srcs/frontend/src/assets/nouser_chatgpt.png` | The anonymous avatar image shown for deleted accounts |

---

## What Changes After Deletion

### PLAYER table fields

| Field | New value | Purpose |
|-------|-----------|---------|
| `p_nick` | `'Legacy_' + unix_timestamp` | Pseudonymized, unique, DB-safe |
| `p_mail` | `'deleted_' + p_pk + '@legacy.local'` | Non-functional, unique per row |
| `p_pass` | `NULL` | Login disabled |
| `p_totp_secret` | `NULL` | 2FA credentials removed |
| `p_totp_enabled` | `FALSE` | 2FA disabled |
| `p_totp_enabled_at` | `NULL` | Timestamp cleared |
| `p_totp_backup_codes` | `NULL` | Backup codes removed |
| `p_oauth_provider` | `NULL` | OAuth link removed |
| `p_oauth_id` | `NULL` | OAuth ID removed |
| `p_avatar_url` | `'deleted'` | **Sentinel** → triggers anonymous avatar in frontend |
| `p_profile_complete` | `FALSE` | Profile marked incomplete |
| `p_reg` | `NULL` | Registration date cleared |
| `p_bir` | `NULL` | Date of birth cleared |
| `p_lang` | `NULL` | Language preference cleared |
| `p_country` | `NULL` | Country cleared |
| `p_role` | `1` | Reset to default role |
| `p_status` | `6` | **Key deletion flag** — checked by all queries |

### PLAYER_FRIEND table

All friendship rows where `f_1 = player_id` or `f_2 = player_id` are **hard-deleted**. Friendships have no historical value worth preserving.

### Everything else

Match records, competitor entries, and all metrics are **preserved** for historical integrity.

---

## How p_status = 6 is Enforced Across the Stack

| Layer | File | How |
|-------|------|-----|
| SQL — Leaderboard | `10_functions.sql` | `WHERE p.p_status != 6` in `get_leaderboard()` |
| SQL — Match history | `10_functions.sql` | `opponent_status` returned in `get_match_history()` |
| Backend — Friend candidates | `friends.service.ts` | `AND p.p_status != 6` in `getUsersToInvite()` |
| Frontend — Opponent name | `MatchHistory.tsx` | `opponentStatus === 6 ? t('history.deletedAccount') : match.opponent` |
| Frontend — Avatar | `Avatar.tsx` | `src === 'deleted'` → `nouser_chatgpt.png` |

---

## Translation Key

A dedicated i18n key is used for all four supported languages:

```
history.deletedAccount
```

| Locale | Value |
|--------|-------|
| `en` | Deleted account |
| `es` | Cuenta eliminada |
| `ca` | Compte eliminat |
| `fr` | Compte supprimé |

---

## Files Involved

```
srcs/
├── dbserver/
│   └── scripts_init/
│       └── 10_functions.sql              ← anonymize_player_by_id(), get_leaderboard(),
│                                            get_match_history()
├── backend/src/
│   ├── auth/
│   │   └── auth.service.ts               ← anonymizeUser()
│   └── friends/
│   │   └── friends.service.ts            ← getUsersToInvite() excludes p_status=6
│   └── stats/
│       └── stats.service.ts              ← getMatchHistory() maps opponent_status
└── frontend/src/
    ├── screens/
    │   └── ProfileScreen.tsx             ← handleDeleteAccount() UI trigger
    ├── components/
    │   ├── Avatar.tsx                    ← anonymous avatar rendering
    │   └── MatchHistory.tsx              ← deleted opponent display
    └── assets/
        ├── nouser_chatgpt.png            ← anonymous avatar image
        ├── avatars/
        │   └── index.ts                  ← avatar resolution utilities
        └── i18n/
            └── translation_*.json        ← history.deletedAccount in EN/ES/CA/FR
```

---

## Notes for Future Development

- **Adding a new user-facing list or query** that shows players must always include `WHERE p.p_status != 6` (or equivalent) to exclude deleted accounts.
- **The `'deleted'` sentinel in `p_avatar_url`** must not be used as an actual avatar ID. The gallery uses IDs in the format `avatar-N`; the `'deleted'` value is reserved.
- **The synthetic data generator** (`02_data_syntetic.sql`) uses `WHERE status_pk < 6` to ensure test users are never created with the deleted status.
