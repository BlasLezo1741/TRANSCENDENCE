# OAuth 2.0 Remote Authentication

## Executive Summary

The OAuth 2.0 remote authentication system provides seamless third-party authentication integration for the Transcendence platform. By implementing the industry-standard OAuth 2.0 authorization framework with Passport.js strategies, the system enables users to authenticate using their existing accounts from trusted providers including Google and 42 School Network.

The architecture decouples authentication concerns from the core application logic, leveraging NestJS guards and strategies for provider-specific implementations while maintaining a unified user experience. The system automatically handles user registration, profile synchronization, JWT token generation, and secure session management across both traditional password-based and OAuth-based authentication flows.

## System Architecture Diagram

The following Mermaid diagrams illustrate the OAuth 2.0 authentication flow and system integration.

### OAuth Authentication Sequence

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend (React)
    participant Backend as NestJS Backend
    participant OAuth as OAuth Provider (Google/42)
    participant DB as PostgreSQL Database
    participant JWT as JWT Service

    Note over User, JWT: Phase 1: OAuth Initiation
    User->>Frontend: Click "Sign in with Google/42"
    Frontend->>Backend: GET /auth/{provider}
    Backend->>Backend: @UseGuards(AuthGuard('{provider}'))
    Backend->>OAuth: Redirect to OAuth Provider
    OAuth->>User: Display OAuth Consent Screen
    
    Note over User, JWT: Phase 2: OAuth Callback
    User->>OAuth: Grant Permission
    OAuth->>Backend: GET /auth/{provider}/callback?code=...
    Backend->>OAuth: Exchange code for user profile
    OAuth-->>Backend: Return user profile data
    
    Note over User, JWT: Phase 3: User Processing
    Backend->>DB: findOrCreateOAuthUser()
    alt New User
        DB-->>Backend: User not found
        Backend->>DB: INSERT new user with OAuth data
        DB-->>Backend: Return new user
    else Existing User
        DB-->>Backend: Return existing user
    end
    
    Note over User, JWT: Phase 4: Token Generation & Redirect
    Backend->>JWT: generateJwtToken(user)
    JWT-->>Backend: Return access token
    Backend->>Frontend: Redirect to /?token={jwt}
    Frontend->>Frontend: Parse JWT, extract user data
    Frontend->>Frontend: localStorage.setItem("jwt_token", token)
    Frontend->>Frontend: setGlobalUser(username)
    Frontend->>User: Redirect to MENU screen
```

### OAuth System Architecture

```mermaid
graph TD
    subgraph "Frontend Layer (React/TypeScript)"
        A[SignScreen.tsx] -- "handleOAuth()" --> B[LoginScreen.tsx]
        B -- "window.location.href" --> C[OAuth Buttons]
        D[auth.ts utils] -- "API calls" --> E[HTTP Client]
    end

    subgraph "Backend Layer (NestJS)"
        F[AuthController] -- "@UseGuards()" --> G[Passport Strategies]
        G --> G1[GoogleStrategy]
        G --> G2[FortyTwoStrategy]
        G --> G3[JwtStrategy]
        F --> H[AuthService]
        H --> I[Database Layer]
    end

    subgraph "OAuth Providers"
        J[Google OAuth 2.0]
        K[42 School API]
    end

    subgraph "Data Persistence"
        I --> L[(PostgreSQL)]
        L --> M[player table]
        M --> N["p_oauth_provider<br/>p_oauth_id<br/>p_avatar_url"]
    end

    subgraph "Security Layer"
        O[JWT Service] --> P[Access Tokens]
        P --> Q[7-day expiration]
        R[JwtAuthGuard] --> S[Protected Routes]
    end

    %% Flow Connections
    C -.->|"HTTP Redirect"| G1
    C -.->|"HTTP Redirect"| G2
    G1 -.->|"OAuth Flow"| J
    G2 -.->|"OAuth Flow"| K
    J -.->|"User Profile"| H
    K -.->|"User Profile"| H
    H --> O
    O --> F
    F -.->|"JWT Token"| E

    style A fill:#e1f5ff,stroke:#333,stroke-width:2px
    style B fill:#e1f5ff,stroke:#333,stroke-width:2px
    style F fill:#ffe1e1,stroke:#333,stroke-width:2px
    style H fill:#ffe1e1,stroke:#333,stroke-width:2px
    style J fill:#fff4e1,stroke:#333,stroke-width:2px
    style K fill:#fff4e1,stroke:#333,stroke-width:2px
    style L fill:#e1ffe1,stroke:#333,stroke-width:2px
    style O fill:#f4e1ff,stroke:#333,stroke-width:2px
```

## OAuth 2.0 Implementation Overview

### Supported OAuth Providers

The system currently supports two OAuth providers:

1. **Google OAuth 2.0** - Enables authentication using Google accounts
2. **42 School Network** - Enables authentication for 42 School students and alumni

### Database Schema for OAuth

The `player` table includes OAuth-specific fields and constraints:

**Drizzle ORM Schema Definition:**

```typescript
export const player = pgTable("player", {
  pPk: integer("p_pk").primaryKey().generatedAlwaysAsIdentity(),
  pNick: varchar("p_nick", { length: 255 }).notNull(),
  pMail: text("p_mail").notNull(),
  pPass: text("p_pass"),  // NULL for OAuth users
  
  // 2FA Fields
  pTotpSecret: bytea("p_totp_secret"),
  pTotpEnabled: boolean("p_totp_enabled").default(false),
  pTotpEnabledAt: timestamp("p_totp_enabled_at", { mode: 'string' }),
  pTotpBackupCodes: text("p_totp_backup_codes").array(),
  
  // OAuth Fields
  pOauthProvider: varchar("p_oauth_provider", { length: 20 }),  // 'google' or '42'
  pOauthId: varchar("p_oauth_id", { length: 255 }),             // Provider's user ID
  pAvatarUrl: varchar("p_avatar_url", { length: 500 }),         // Profile picture URL
  pProfileComplete: boolean("p_profile_complete").default(false), // Profile completion flag
  
  // User Information
  pReg: timestamp("p_reg", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
  pBir: date("p_bir"),
  pLang: char("p_lang", { length: 2 }),
  pCountry: char("p_country", { length: 2 }),
  pRole: smallint("p_role").default(1),
  pStatus: smallint("p_status").default(1),
}, (table) => [
  // Foreign key constraints
  foreignKey({
    columns: [table.pLang],
    foreignColumns: [pLanguage.langPk],
    name: "player_p_lang_fkey"
  }),
  foreignKey({
    columns: [table.pCountry],
    foreignColumns: [country.coun2Pk],
    name: "player_p_country_fkey"
  }),
  // Unique constraints
  unique("player_p_nick_key").on(table.pNick),
  unique("player_p_mail_key").on(table.pMail),
  unique("unique_oauth_user").on(table.pOauthProvider, table.pOauthId),  // ← OAuth constraint
]);
```

**OAuth-Specific Fields:**

| Field | Type | Length | Description |
|-------|------|--------|-------------|
| `p_oauth_provider` | VARCHAR | 20 | OAuth provider name: 'google' or '42' |
| `p_oauth_id` | VARCHAR | 255 | Provider's unique user identifier |
| `p_avatar_url` | VARCHAR | 500 | User's profile picture URL from OAuth provider |
| `p_profile_complete` | BOOLEAN | - | Tracks if OAuth user completed additional profile setup |
| `p_pass` | TEXT | - | Password hash (NULL for OAuth-only users) |

**Unique Constraint: `unique_oauth_user`**
```sql
CONSTRAINT unique_oauth_user UNIQUE(p_oauth_provider, p_oauth_id)
```

**Important Note on NULL Handling**: 

PostgreSQL treats NULL values as non-equal for UNIQUE constraints. This means:

✅ **Multiple traditional users** can have `(NULL, NULL)` in `(p_oauth_provider, p_oauth_id)`  
✅ **UNIQUE constraint only applies** when BOTH values are NOT NULL  
✅ **OAuth users** cannot duplicate `(provider, id)` combinations  
✅ **Same email** can exist for different OAuth providers (separate accounts)

**Example Data:**

| p_pk | p_nick | p_oauth_provider | p_oauth_id | p_pass | p_profile_complete |
|------|--------|------------------|------------|--------|-------------------|
| 1 | john_doe | NULL | NULL | $2a$10$hash... | TRUE |
| 2 | Jane_Smith | google | 1234567890 | NULL | FALSE |
| 3 | user42 | 42 | 98765 | NULL | FALSE |
| 4 | another_user | NULL | NULL | $2a$10$hash... | TRUE |

**Country Table Structure:**

```typescript
export const country = pgTable("country", {
  counName: char("coun_name", { length: 52 }),
  coun2Pk: char("coun2_pk", { length: 2 }).primaryKey().notNull(),  // ISO 2-letter code
  coun3: char({ length: 3 }),                                        // ISO 3-letter code
  counCode: char("coun_code", { length: 3 }),
  counIsoCode: char("coun_iso_code", { length: 13 }),
  counRegion: char("coun_region", { length: 8 }),
  counRegionSub: char("coun_region_sub", { length: 31 }),
  // ... additional region fields
});
```

The `getCountryCode()` function in AuthService maps country names to 2-letter ISO codes by querying this table.

## Frontend Implementation

### SignScreen.tsx - OAuth Registration Flow

The sign-up screen provides OAuth authentication options alongside traditional registration.

**Key Features:**
- OAuth buttons for Google and 42 providers
- Conditional rendering (hidden when 2FA QR code is displayed)
- Seamless provider selection and redirection

**Implementation:**

```typescript
// OAuth handler function
const handleOAuth = (provider: 'google' | '42') => {
    console.log(`Redirigiendo a OAuth con ${provider}`);
    window.location.href = `http://localhost:3000/auth/${provider}`;
};

// OAuth buttons UI (rendered conditionally)
{showOAuthButtons && (
    <>
        <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
                {t('crear_cuenta')} / {t('init_ses')}: 
            </span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
            <button
                type="button"
                onClick={() => handleOAuth('42')}
                className="w-full inline-flex justify-center..."
            >
                <span className="font-bold text-black">42 Network</span>
            </button>
            <button
                type="button"
                onClick={() => handleOAuth('google')}
                className="w-full inline-flex justify-center..."
            >
                Google
            </button>
        </div>
    </>
)}
```

**OAuth Button States:**
- **Visible**: During initial form display
- **Hidden**: When displaying 2FA QR code setup
- **Reset**: When user clicks "Reset" button

### LoginScreen.tsx - OAuth Login Flow

The login screen handles both traditional and OAuth authentication with 2FA support.

**OAuth Integration:**

```typescript
// OAuth handler - redirects to backend OAuth endpoint
const handleOAuth = (provider: 'google' | '42') => {
    window.location.href = `http://localhost:3000/auth/${provider}`;
};
```

**OAuth Button Rendering:**
- OAuth buttons are only displayed when NOT in 2FA verification mode
- Uses the same `handleOAuth` function as SignScreen.tsx
- Provides consistent user experience across registration and login

**Note**: The OAuth callback handling has been moved to `App.tsx` for centralized token management (see commented code in lines 23-62).

### auth.ts - Frontend Utility Functions

This utility file provides the API communication layer between frontend and backend.

**Key Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `checkPassword` | password, repeat | `{ok, msg}` | Client-side password validation (min 8 chars, uppercase, lowercase, digits) |
| `registUser` | username, password, email, birth, country, language, enabled2FA | `{ok, msg, qrCode?, backupCodes?}` | Registers new user via POST /auth/register |
| `checkLogin` | username, password | `{ok, msg, user?, token?}` | Authenticates user via POST /auth/login |
| `send2FACode` | userId, totpCode | `{ok, msg, token?}` | Verifies 2FA code (6 digits = TOTP, 8 chars = backup code) |

**API Base URL Configuration:**
```typescript
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
```

### App.tsx - OAuth Callback Handler

The main App component handles OAuth token processing at the application level, ensuring centralized authentication state management.

**OAuth Callback Implementation:**

```typescript
// OAuth token verification on app mount
useEffect(() => {
    // Check URL for OAuth token on app load
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      try {
        console.log("🔐 OAuth token detected in URL, processing...");
        
        // Decode JWT payload to get user info
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          window.atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );

        const payload = JSON.parse(jsonPayload); // { sub: 1, nick: 'foo', ... }

        // 1. Save data to localStorage
        localStorage.setItem("pong_token", token);
        localStorage.setItem("pong_user_nick", payload.nick);
        localStorage.setItem("pong_user_id", payload.sub.toString());

        // 2. Update Global State (triggers app to show user as logged in)
        // NOTE: avatarUrl is NOT in JWT - syncProfile useEffect will fetch it
        setCurrentUser(payload.nick);
        setCurrentUserId(Number(payload.sub));
        console.log("🔓 OAuth Login successful:", payload.nick);

        // 3. Clean URL (remove token from address bar)
        window.history.replaceState({}, document.title, window.location.pathname);

        // 4. Navigate to Menu
        dispatch({ type: "MENU" });

      } catch (err) {
        console.error("❌ Error processing OAuth token:", err);
      }
    }
  }, []); // Run only once on mount
```

**Profile Synchronization:**

After OAuth login, the app fetches the user's avatar and other profile data from the API:

```typescript
// Fetch avatar + user data after login
useEffect(() => {
    if (!currentUser) return;

    const syncProfile = async () => {
      try {
        const profile = await getMyProfile();
        if (profile) {
          setCurrentUserId(profile.id);
          setCurrentUserAvatarUrl(profile.avatarUrl ?? null);
          localStorage.setItem("pong_user_id", String(profile.id));
          console.log("✅ [App] Profile synced – avatarUrl:", profile.avatarUrl);
        }
      } catch (err) {
        console.warn("⚠️ [App] Could not sync profile on login:", err);
      } finally {
        setProfileSynced(true);
      }
    };

    syncProfile();
  }, [currentUser]);
```

**Key Features:**
- **Centralized OAuth handling**: All OAuth callbacks processed in App.tsx
- **JWT manual decoding**: Extracts user data without external library
- **LocalStorage persistence**: Token and user data saved for session persistence
- **URL cleanup**: Removes token from URL bar for security
- **Avatar lazy loading**: Avatar fetched separately via API, not stored in JWT
- **Error handling**: Graceful error handling for invalid tokens
- **Single execution**: `useEffect` runs only once on mount to prevent duplicate processing

## Data Transfer Objects (DTOs)

DTOs provide validation and type safety for API requests.

### RegisterUserDto

Validates traditional user registration requests.

```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  @MaxLength(20, { message: 'El nick no puede exceder los 20 caracteres' })
  user: string;

  @IsEmail({}, { message: 'El formato del email no es válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}
```

**Validation Rules:**
- Username: Required, max 20 characters, string type
- Email: Required, valid email format
- Password: Required, minimum 8 characters

**Note**: OAuth registration bypasses this DTO as users are created server-side.

### CompleteProfileDto

Validates profile completion requests (typically for OAuth users).

```typescript
import { IsString, Length } from 'class-validator';

export class CompleteProfileDto {
  @IsString()
  @Length(2, 2)
  country: string;  // 2-letter ISO country code

  @IsString()
  @Length(2, 2)
  language: string; // 2-letter ISO language code
}
```

**Validation Rules:**
- Country: Required, exactly 2 characters (ISO code like "US", "FR", "ES")
- Language: Required, exactly 2 characters (ISO code like "en", "es", "fr")

**Usage Context:**
- OAuth users created with `p_profile_complete = false`
- Frontend can prompt for additional information
- Updates user record to `p_profile_complete = true`

## Backend Implementation

### AuthController - OAuth Endpoints

The controller defines the OAuth routes and handles the authentication flow.

**Google OAuth Endpoints:**

```typescript
// Initiates Google OAuth flow
@Get('google')
@UseGuards(AuthGuard('google'))
async googleAuth(@Req() req) {
    this.logger.log('🔗 [google] Redirecting to Google OAuth...');
    // Passport automatically redirects to Google login page
}

// Handles Google OAuth callback
@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleAuthRedirect(@Req() req, @Res() res: Response) {
    this.logger.log('📡 [google/callback] Google OAuth callback received');
    
    // 1. Find or create user from OAuth profile
    const user = await this.authService.findOrCreateOAuthUser(req.user);
    this.logger.log(`✅ [google/callback] User authenticated: ${user.pNick}`);
    
    // 2. Generate JWT token
    const { accessToken } = this.authService.generateJwtToken(user);

    // 3. Redirect to frontend with token
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 
                        'http://localhost:5173';
    this.logger.log(`🔄 [google/callback] Redirecting to: ${frontendUrl}/?token=${accessToken}`);
    res.redirect(`${frontendUrl}/?token=${accessToken}`);
}
```

**42 School OAuth Endpoints:**

```typescript
// Initiates 42 School OAuth flow
@Get('42')
@UseGuards(AuthGuard('42'))
async fortyTwoAuth(@Req() req) {
    this.logger.log('🔗 [42] Redirecting to 42 School OAuth...');
}

// Handles 42 School OAuth callback
@Get('42/callback')
@UseGuards(AuthGuard('42'))
async fortyTwoAuthRedirect(@Req() req, @Res() res: Response) {
    this.logger.log('📡 [42/callback] 42 School OAuth callback received');
    
    const user = await this.authService.findOrCreateOAuthUser(req.user);
    this.logger.log(`✅ [42/callback] User authenticated: ${user.pNick}`);
    
    const { accessToken } = this.authService.generateJwtToken(user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 
                        'http://localhost:5173';
    
    this.logger.log(`🔄 [42/callback] Redirecting to: ${frontendUrl}/?token=${accessToken}`);
    res.redirect(`${frontendUrl}/?token=${accessToken}`);
}
```

**Controller Logging:**
Each endpoint includes comprehensive logging for debugging:
- 🔗 OAuth initiation
- 📡 Callback reception
- ✅ User authentication success
- 🔄 Frontend redirection
- ⚠️ Error conditions

### AuthService - OAuth User Management

The service handles the core OAuth logic including user creation and profile management.

**Core OAuth Function:**

```typescript
/**
 * Find or create OAuth user
 * Handles both new user registration and existing user login
 */
async findOrCreateOAuthUser(oauthProfile: any) {
    const provider = oauthProfile.provider;  // 'google' or '42'
    const oauthId = oauthProfile.id;

    this.logger.log(`🔍 [findOrCreateOAuthUser] Looking for ${provider} user: ${oauthId}`);

    // 1. Try to find existing user
    const existingUser = await this.db
        .select()
        .from(player)
        .where(
            and(
                eq(player.pOauthProvider, provider),
                eq(player.pOauthId, oauthId)
            )
        )
        .limit(1);

    if (existingUser.length > 0) {
        this.logger.log(`✅ [findOrCreateOAuthUser] Existing ${provider} user found`);
        return existingUser[0];
    }

    // 2. User doesn't exist, create new OAuth user
    this.logger.log(`➕ [findOrCreateOAuthUser] Creating new ${provider} user`);

    const username = oauthProfile.username || 
                     oauthProfile.email?.split('@')[0] || 
                     `user_${Date.now()}`;
    const email = oauthProfile.email || `${username}@oauth.local`;
    const avatarUrl = oauthProfile.picture || oauthProfile.avatar || null;

    // Map country from OAuth provider locale
    const countryCode = oauthProfile.locale 
        ? await this.getCountryCode(oauthProfile.locale)
        : 'FR';

    const now = new Date().toISOString();

    // 3. Insert new OAuth user
    const [newUser] = await this.db.insert(player).values({
        pNick: username,
        pMail: email,
        pPass: null,                    // No password for OAuth users
        pOauthProvider: provider,       // 'google' or '42'
        pOauthId: oauthId,              // Provider's user ID
        pAvatarUrl: avatarUrl,
        pCountry: countryCode,
        pLang: oauthProfile.locale?.substring(0, 2) || 'en',
        pReg: now,
        pRole: 1,
        pStatus: 1,
        pProfileComplete: false,        // OAuth users need to complete profile
        pTotpEnabled: false,            // 2FA disabled by default
        pTotpSecret: null,
        pTotpBackupCodes: null,
    }).returning();

    this.logger.log(`✅ [findOrCreateOAuthUser] New ${provider} user created: ${newUser.pNick}`);

    return newUser;
}
```

**JWT Token Generation:**

```typescript
generateJwtToken(user: any) {
    const payload: JwtPayload = {
        sub: user.pPk,          // User ID
        nick: user.pNick,       // Username
        email: user.pMail,      // Email
    };

    return {
        accessToken: this.jwtService.sign(payload),
    };
}
```

**Key Service Features:**
- Automatic user creation for new OAuth users
- Avatar URL extraction from OAuth profile
- Country/locale mapping from OAuth data
- Profile completion tracking for OAuth users
- Null password for OAuth-only accounts
- Unified return format for all authentication methods

### AuthModule - OAuth Configuration

The module configures Passport strategies and JWT authentication.

**OAuth Strategy Registration:**

```typescript
@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        ConfigModule,
        DatabaseModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '7d' },  // 7-day token validity
            }),
        }),
        HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,        // JWT authentication strategy
        JwtAuthGuard,       // JWT guard for protected routes
        GoogleStrategy,     // Google OAuth strategy
        FortyTwoStrategy,   // 42 School OAuth strategy
    ],
    exports: [AuthService, JwtAuthGuard, JwtStrategy],
})
export class AuthModule {}
```

**Required Environment Variables:**

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRATION=7d

# 42 School OAuth
OAUTH_42_CLIENT_ID=your-42-application-uid
OAUTH_42_CLIENT_SECRET=your-42-application-secret
OAUTH_42_CALLBACK_URL=http://localhost:3000/auth/42/callback

# Google OAuth
OAUTH_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
OAUTH_GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
OAUTH_GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Frontend URL (for OAuth redirects)
VITE_FRONTEND_URL=http://localhost:5173
```

**Environment Variable Naming Convention:**
- Google OAuth uses `OAUTH_GOOGLE_*` prefix (not `GOOGLE_*`)
- 42 OAuth uses `OAUTH_42_*` prefix (not `FORTYTWO_*`)
- JWT expiration uses `JWT_EXPIRATION` (defaults to 7 days in code)

## OAuth Strategy Implementation

### GoogleStrategy (Actual Implementation)

The Google OAuth strategy extracts user profile information and handles locale/country parsing.

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      // Environment variables with fallback for TypeScript safety
      clientID: configService.get<string>('OAUTH_GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('OAUTH_GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('OAUTH_GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, displayName, emails, photos, _json } = profile;
    
    // Parse locale into language and country
    let lang = 'ca'; // Default language
    let country = 'FR'; // Default country
    
    if (_json.locale) {
      const parts = _json.locale.split('-'); // Split "en-US" into ["en", "US"]
      if (parts.length > 0) lang = parts[0];
      if (parts.length > 1) country = parts[1].toUpperCase();
    }

    // Log full profile for debugging
    console.log("Google Profile _json:", JSON.stringify(profile._json, null, 2));
    
    // Extract avatar URL and remove size parameter for full resolution
    const photoUrl = photos?.[0]?.value;
    const fullPicture = photoUrl?.split('=');

    const user = {
      oauthId: id,
      oauthProvider: 'google',
      email: emails?.[0]?.value,
      nick: displayName.replace(/\s+/g, '_').substring(0, 20), // Replace spaces, max 20 chars
      avatarUrl: fullPicture?.[0] ?? photoUrl, // Full resolution avatar
      lang,
      country,
    };

    done(null, user);
  }
}
```

**Key Features:**
- Locale parsing: Extracts language and country from Google's locale string (e.g., "en-US" → "en" + "US")
- Avatar optimization: Removes size parameter from Google photo URL for full resolution
- Nickname sanitization: Replaces spaces with underscores and limits to 20 characters
- Debug logging: Outputs full Google profile for troubleshooting

### FortyTwoStrategy (Actual Implementation)

The 42 School OAuth strategy handles campus-specific data and avatar extraction from nested JSON.

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
// Use 'require' to avoid TypeScript import compatibility issues with this specific library
const Strategy = require('passport-42').Strategy;
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('OAUTH_42_CLIENT_ID'),
      clientSecret: configService.get<string>('OAUTH_42_CLIENT_SECRET'),
      callbackURL: configService.get<string>('OAUTH_42_CALLBACK_URL'),
      scope: ['public'],
      // Explicitly add these URLs to satisfy TypeScript/Passport requirements
      authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
      tokenURL: 'https://api.intra.42.fr/oauth/token',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any, // Use 'any' because the library doesn't export Profile interface cleanly
  ): Promise<any> {
    const { id, username, emails } = profile;
    
    // Log full profile for debugging
    console.log("42 Profile _json:", JSON.stringify(profile._json, null, 2));
    
    // Extract avatar URL from nested JSON structure with fallback chain
    const avatarUrl = profile._json?.image?.versions?.medium 
                   || profile._json?.image?.link 
                   || null;
    
    // Extract language from campus data
    const languageIdentifier = profile._json?.campus?.[0]?.language?.identifier || 'ca';
    
    // Extract country from campus and map to country code
    const campusCountry = profile._json?.campus?.[0]?.country || null;
    const countryCode = await this.authService.getCountryCode(campusCountry);
    console.log(`Campus country: ${campusCountry} -> Country code: ${countryCode}`);
    
    const user = {
      oauthId: id,
      oauthProvider: '42',
      email: emails?.[0]?.value || `${username}@student.42.fr`,
      nick: username,
      avatarUrl: avatarUrl,
      lang: languageIdentifier,
      country: countryCode,
    };

    return user;
  }
}
```

**Key Features:**
- Campus data extraction: Retrieves language and country from user's primary campus
- Avatar resolution: Tries multiple avatar sources (medium version → link → null)
- Country mapping: Uses `authService.getCountryCode()` to map country names to ISO codes
- Email fallback: Generates `@student.42.fr` email if not provided
- 42 API endpoints: Explicitly configured for 42 School's OAuth endpoints
- Debug logging: Outputs full 42 profile for troubleshooting

### JwtStrategy (Actual Implementation)

The JWT strategy validates access tokens and extracts user information for protected routes.

```typescript
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: number;      // User ID (subject)
  email: string;    // User email
  nick: string;     // Username
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    // CRITICAL: This MUST return an object with 'sub' property
    // This becomes req.user in the controller
    return { 
      sub: payload.sub,       // User ID - MUST be present
      email: payload.email,   // User email
      nick: payload.nick      // Username
    };
  }
}
```

**Key Features:**
- Bearer token extraction: Reads JWT from `Authorization: Bearer <token>` header
- Expiration validation: Rejects expired tokens automatically
- Payload validation: Returns structured user object for controllers
- Type safety: Defines `JwtPayload` interface for type checking

### JwtAuthGuard (Actual Implementation)

Simple guard that wraps Passport's JWT authentication.

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**Usage:**
```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@Request() req) {
  // req.user contains validated JWT payload
  const userId = req.user.sub;
  // ...
}
```

## API Endpoints Reference

| Method | Endpoint | Guards | Description |
|--------|----------|--------|-------------|
| **POST** | `/auth/login` | None | Traditional username/password login |
| **POST** | `/auth/register` | None | Traditional user registration |
| **POST** | `/auth/verify-totp` | None | Verify 2FA TOTP code (6 digits) |
| **POST** | `/auth/verify-backup` | None | Verify 2FA backup code (8 chars) |
| **GET** | `/auth/google` | AuthGuard('google') | Initiate Google OAuth flow |
| **GET** | `/auth/google/callback` | AuthGuard('google') | Google OAuth callback handler |
| **GET** | `/auth/42` | AuthGuard('42') | Initiate 42 School OAuth flow |
| **GET** | `/auth/42/callback` | AuthGuard('42') | 42 School OAuth callback handler |
| **GET** | `/auth/profile` | JwtAuthGuard | Get current user profile (protected) |
| **PUT** | `/auth/profile` | JwtAuthGuard | Update user profile (protected) |
| **GET** | `/auth/countries` | None | Get list of all countries |

## CORS Configuration

The backend's `main.ts` configures CORS to allow OAuth redirects and frontend API calls.

**Actual CORS Configuration:**

```typescript
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Ports and URLs from environment
  const port = process.env.BE_CONTAINER_PORT || 3000;
  const frontendUrl = process.env.VITE_FRONTEND_URL;
  logger.log(`Permitiendo CORS para: ${frontendUrl}`);

  // Enable CORS for HTTP requests
  app.enableCors({
    // Reflects the origin of the request automatically (useful for Codespaces/dynamic URLs)
    origin: true, 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,  // Allow cookies and Authorization headers
    allowedHeaders: 'Content-Type, Accept, Authorization',
    preflightContinue: false,  // NestJS responds to preflight automatically
    optionsSuccessStatus: 204,  // Standard for successful OPTIONS requests
  });

  // Listen on 0.0.0.0 (CRITICAL for Docker)
  // This allows the container to accept connections from outside itself
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Servidor corriendo en puerto: ${port}`);
}
bootstrap();
```

**CORS Configuration Explanation:**

- **`origin: true`**: Automatically reflects the request's origin
  - Very useful for development environments with dynamic URLs (GitHub Codespaces)
  - In production, replace with specific allowed origins: `origin: ['https://yourdomain.com']`
  
- **`credentials: true`**: Allows sending cookies and Authorization headers
  - Required for JWT Bearer tokens in Authorization header
  - Enables session-based authentication if needed
  
- **`allowedHeaders`**: Specifies which headers can be sent
  - `Content-Type`: For JSON request bodies
  - `Accept`: For content negotiation
  - `Authorization`: For JWT Bearer tokens
  
- **`methods`**: All standard HTTP methods allowed
  - Includes OPTIONS for CORS preflight requests
  
- **`preflightContinue: false`**: NestJS handles OPTIONS requests automatically
  
- **`optionsSuccessStatus: 204`**: Standard success code for OPTIONS

**Production CORS Configuration:**

For production, use specific origins instead of `origin: true`:

```typescript
app.enableCors({
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
  allowedHeaders: 'Content-Type, Accept, Authorization',
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
```

## Security Considerations

### OAuth Security Best Practices

1. **State Parameter Validation** (Implemented by Passport)
   - Prevents CSRF attacks during OAuth flow
   - Passport strategies automatically handle state validation

2. **Secure Token Storage**
   - JWT tokens stored in `localStorage` (frontend)
   - 7-day token expiration configured in JwtModule
   - Tokens include user ID, nickname, and email claims

3. **Unique OAuth User Constraint**
   - Database constraint: `UNIQUE(p_oauth_provider, p_oauth_id)`
   - Prevents duplicate OAuth accounts
   - Allows same email for different providers

4. **Password Handling for OAuth Users**
   - OAuth users have `p_pass = NULL`
   - Traditional login rejected for OAuth users with clear error message
   - Profile updates prevent password changes for OAuth accounts

5. **HTTPS Requirements** (Production)
   - All OAuth callback URLs must use HTTPS in production
   - Development allows HTTP for localhost testing

### JWT Security Features

- **Token Payload:**
  ```json
  {
    "sub": 123,              // User ID (subject)
    "nick": "username",      // Username
    "email": "user@example.com",
    "iat": 1234567890,       // Issued at timestamp
    "exp": 1235172690        // Expiration timestamp (7 days)
  }
  ```

- **Signature Verification:** All JWT tokens are verified using `JWT_SECRET`
- **Guard Protection:** Sensitive routes protected with `@UseGuards(JwtAuthGuard)`

**Token Storage in Frontend:**

The application uses `localStorage` for token persistence:

```typescript
// OAuth callback stores token
localStorage.setItem("pong_token", token);           // JWT access token
localStorage.setItem("pong_user_nick", payload.nick); // Username
localStorage.setItem("pong_user_id", payload.sub.toString()); // User ID
```

**Token Usage in API Requests:**

Protected API calls should include the token in the Authorization header:

```typescript
const token = localStorage.getItem("pong_token");

const response = await fetch(`${API_URL}/auth/profile`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

**LocalStorage Keys:**
- `pong_token`: JWT access token (7-day expiration)
- `pong_user_nick`: Username for display
- `pong_user_id`: User ID for API calls and avatar generation

**Logout Implementation:**

The App.tsx provides a centralized logout function:

```typescript
const handleLogout = () => {
    // 1. Clear localStorage
    localStorage.removeItem("pong_user_nick");
    localStorage.removeItem("pong_user_id");
    localStorage.removeItem("pong_token");
    
    // 2. Disconnect socket
    socket.disconnect();
    
    // 3. Clear state
    setCurrentUser("");
    setCurrentUserId(undefined);
    setCurrentUserAvatarUrl(null);
    setProfileSynced(false);
    
    // 4. Navigate to login
    dispatch({ type: "LOGOUT" });
};
```

**Logout Steps:**
1. Remove all authentication tokens and user data from `localStorage`
2. Disconnect WebSocket connection to prevent unauthorized socket events
3. Reset all global state variables to initial values
4. Redirect user to login screen

**Security Notes:**
- Tokens stored in `localStorage` persist across browser sessions
- Tokens are NOT httpOnly cookies (vulnerable to XSS)
- Always validate token server-side using `JwtAuthGuard`
- Clear tokens on logout to prevent unauthorized access
- Server-side token invalidation not implemented (tokens valid until expiration)

## OAuth Flow Detailed Steps

### Google OAuth Flow

1. **User clicks "Sign in with Google"** → Frontend redirects to `http://localhost:3000/auth/google`
2. **Backend receives request** → `AuthController.googleAuth()` triggered
3. **Passport redirects** → User sent to Google OAuth consent screen
4. **User grants permission** → Google redirects to `/auth/google/callback?code=...`
5. **Backend exchanges code** → `GoogleStrategy.validate()` fetches user profile
6. **User processing** → `AuthService.findOrCreateOAuthUser()` creates or retrieves user
7. **Token generation** → JWT token created with 7-day expiration
8. **Frontend redirect** → User sent to `http://localhost:5173/?token={jwt}`
9. **Token extraction** → Frontend parses URL, stores token in `localStorage`
10. **Session established** → User redirected to MENU screen

### 42 School OAuth Flow

Identical to Google OAuth flow with provider-specific differences:
- Different OAuth provider endpoints
- 42-specific user profile structure
- 42 School avatar/image handling
- Student email domain defaults (`@student.42.fr`)

## Error Handling

### Common OAuth Errors

| Error Scenario | Response | Handling |
|---------------|----------|----------|
| OAuth provider unavailable | Passport throws error | User sees connection error |
| User denies permission | OAuth provider redirects with error | No user created, return to login |
| Duplicate email (different provider) | Database constraint allows | Separate accounts created |
| Invalid OAuth credentials (env) | Passport initialization fails | Application startup error |
| Network timeout during callback | HTTP timeout (5000ms) | User sees timeout error |
| JWT secret not configured | JwtModule fails to initialize | Application startup error |

### Frontend Error States

```typescript
// OAuth errors are handled by try-catch in callback processing
try {
    const payload = JSON.parse(jsonPayload);
    localStorage.setItem("jwt_token", token);
    localStorage.setItem("pong_user_nick", payload.nick);
    localStorage.setItem("pong_user_id", payload.sub.toString());
    setGlobalUser(payload.nick);
    dispatch({ type: "MENU" });
} catch (err) {
    console.error("Error processing token:", err);
    setError("Error validando el inicio de sesión OAuth");
}
```

## Testing OAuth Integration

### Development Testing Checklist

- [ ] Google OAuth credentials configured in `.env`
- [ ] 42 School OAuth credentials configured in `.env`
- [ ] Callback URLs match environment configuration
- [ ] Frontend URL configured correctly
- [ ] Database migrations applied (OAuth columns exist)
- [ ] JWT secret configured
- [ ] CORS enabled for frontend origin
- [ ] HTTP allowed for localhost development

### Manual Testing Flow

1. **Test Google Registration:**
   - Click "Google" button on sign-up screen
   - Complete Google OAuth flow
   - Verify new user created in database
   - Verify redirect to frontend with token
   - Verify localStorage contains token and user data

2. **Test Google Login (Existing User):**
   - Click "Google" button on login screen
   - Complete Google OAuth flow
   - Verify existing user retrieved from database
   - Verify redirect to frontend with new token

3. **Test 42 School OAuth:**
   - Repeat steps 1-2 with 42 School provider

4. **Test Mixed Authentication:**
   - Register with traditional password
   - Attempt Google OAuth with same email → Separate account created
   - Verify both accounts can coexist

## Integration with Existing Features

### 2FA Compatibility

OAuth users currently have 2FA disabled by default:
- `p_totp_enabled = false`
- `p_totp_secret = null`
- Future enhancement: Allow OAuth users to enable 2FA

### Profile Completion Flow

OAuth users are created with `p_profile_complete = false`:
- Indicates incomplete profile requiring additional information
- Can be used to trigger profile completion screen after OAuth login
- Traditional registration sets `p_profile_complete = true` immediately

### Avatar System Integration

OAuth profiles include avatar URLs:
- Google: `photos[0].value`
- 42 School: `_json.image.link`
- Stored in `p_avatar_url` column
- Can be used in avatar display system

## Dependencies

### Backend Dependencies

```json
{
  "@nestjs/passport": "^11.0.0",
  "@nestjs/jwt": "^11.0.0",
  "passport": "^0.7.0",
  "passport-google-oauth20": "^2.0.0",
  "passport-42": "^1.2.6",
  "bcryptjs": "^3.0.3"
}
```

### Frontend Dependencies

```json
{
  "react": "^18.3.1",
  "react-router-dom": "^6.x",
  "i18next": "^23.x",
  "react-i18next": "^13.x"
}
```

## Configuration Files

### docker-compose.yml (OAuth Environment Configuration)

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: ${BE_CONTAINER_NAME}
    ports:
      - "${BE_CONTAINER_PORT}:3000"
    environment:
      # Database
      DATABASE_URL: ${DATABASE_URL}
      
      # JWT Configuration
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRATION: ${JWT_EXPIRATION}
      
      # OAuth 42 School
      OAUTH_42_CLIENT_ID: ${OAUTH_42_CLIENT_ID}
      OAUTH_42_CLIENT_SECRET: ${OAUTH_42_CLIENT_SECRET}
      OAUTH_42_CALLBACK_URL: ${OAUTH_42_CALLBACK_URL}
      
      # OAuth Google
      OAUTH_GOOGLE_CLIENT_ID: ${OAUTH_GOOGLE_CLIENT_ID}
      OAUTH_GOOGLE_CLIENT_SECRET: ${OAUTH_GOOGLE_CLIENT_SECRET}
      OAUTH_GOOGLE_CALLBACK_URL: ${OAUTH_GOOGLE_CALLBACK_URL}
      
      # Frontend URL (for OAuth redirects)
      VITE_FRONTEND_URL: ${VITE_FRONTEND_URL}
      
      # TOTP Service
      TOTP_SERVICE_URL: http://totp:8070
    depends_on:
      - dbserver
      - totp
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: ${FE_CONTAINER_NAME}
    ports:
      - "${FE_CONTAINER_PORT}:5173"
    environment:
      VITE_BACKEND_URL: http://localhost:${BE_CONTAINER_PORT}
    depends_on:
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

**Key Configuration Points:**
- All OAuth credentials passed as environment variables
- Backend must be accessible from frontend for OAuth callbacks
- Frontend URL must match OAuth provider's authorized redirect URIs
- TOTP service URL uses Docker network name for service-to-service communication

### .env (Template)

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRATION=7d

# 42 School OAuth
OAUTH_42_CLIENT_ID=u-s4t2ud-your-42-client-id-here
OAUTH_42_CLIENT_SECRET=s-s4t2ud-your-42-client-secret-here
OAUTH_42_CALLBACK_URL=http://localhost:3000/auth/42/callback

# Google OAuth 2.0
OAUTH_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
OAUTH_GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
OAUTH_GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Frontend URL (for OAuth redirects)
VITE_FRONTEND_URL=http://localhost:5173

# Backend Configuration
BE_CONTAINER_PORT=3000
VITE_BACKEND_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=postgres://postgres:example@localhost:5432/transcendence
```

**Production Considerations:**
- Change all callback URLs to use HTTPS
- Use strong, randomly generated JWT_SECRET (minimum 32 characters)
- Never commit actual credentials to version control
- Use different credentials for development and production

## Obtaining OAuth Credentials

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable Google+ API
4. Navigate to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - `https://yourdomain.com/auth/google/callback` (production)
7. Copy Client ID and Client Secret to `.env`

### 42 School OAuth Setup

1. Go to [42 School Intra](https://profile.intra.42.fr/oauth/applications)
2. Click "Register a new application"
3. Fill in application details:
   - Name: Your application name
   - Redirect URI: `http://localhost:3000/auth/42/callback`
4. Copy UID (Client ID) and SECRET to `.env`

## Known Limitations

1. **OAuth-only Users Cannot Set Passwords**
   - OAuth users have `p_pass = NULL`
   - Password changes blocked in profile update
   - Workaround: Not applicable (by design)

2. **Email Uniqueness Across Providers**
   - Same email can be used for different providers
   - Each creates a separate account
   - Future enhancement: Account linking feature

3. **Profile Completion Required**
   - OAuth users may need to complete additional profile fields
   - Currently tracked via `p_profile_complete` flag
   - Profile completion screen not yet implemented

4. **2FA Not Available for OAuth Users**
   - OAuth users created with 2FA disabled
   - Future enhancement: Optional 2FA for OAuth accounts

## Future Enhancements

1. **Account Linking**
   - Allow users to link multiple OAuth providers to one account
   - Unified profile across providers

2. **Additional OAuth Providers**
   - GitHub OAuth integration
   - Microsoft/Azure AD
   - Discord
   - Apple Sign In

3. **OAuth Profile Completion Screen**
   - Guided onboarding for new OAuth users
   - Request missing profile information
   - Update `p_profile_complete` flag

4. **2FA for OAuth Users**
   - Optional TOTP setup for OAuth accounts
   - Enhanced security for sensitive operations

5. **OAuth Token Refresh**
   - Store and manage refresh tokens
   - Extended session support
   - Automatic token renewal

## Troubleshooting

### Common Issues

**Issue: "OAuth provider unavailable"**
- Check network connectivity
- Verify OAuth credentials in `.env` use correct prefix (`OAUTH_GOOGLE_*`, `OAUTH_42_*`)
- Ensure callback URLs match configuration exactly
- Check provider status pages (api.intra.42.fr, accounts.google.com)
- Verify backend service is running and accessible

**Issue: "Redirect URI mismatch"**
- Verify callback URL in provider console matches `.env` exactly
  - Google: `OAUTH_GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback`
  - 42: `OAUTH_42_CALLBACK_URL=http://localhost:3000/auth/42/callback`
- Check for trailing slashes (include or exclude consistently)
- Ensure protocol matches (http vs https)
- In production, use HTTPS for all callback URLs

**Issue: "User not found after OAuth login"**
- Check database for created user record: `SELECT * FROM player WHERE p_oauth_provider = 'google';`
- Verify `findOrCreateOAuthUser` logs in backend console
- Check for database constraint violations (duplicate email/nick)
- Verify database connection in `DATABASE_URL`
- Check that Drizzle schema migrations have been applied

**Issue: "Token not received in frontend"**
- Verify `VITE_FRONTEND_URL` matches actual frontend URL
- Check browser console for redirect errors or CORS issues
- Ensure frontend is running on correct port (5173 for Vite)
- Check backend logs for successful JWT token generation
- Verify App.tsx OAuth callback handler is executing (check console logs)
- Ensure URL parameter `?token=` is being parsed correctly

**Issue: "CORS errors during OAuth flow"**
- Check `main.ts` CORS configuration allows frontend origin
- Verify `origin: true` is set for development (or specific origins for production)
- Check that `credentials: true` is enabled
- Ensure `Authorization` is in `allowedHeaders`
- Verify backend is listening on `0.0.0.0` not `localhost`

**Issue: "Cannot login with password after OAuth registration"**
- This is **expected behavior**
- OAuth users have `p_pass = NULL` in database
- Must use OAuth provider for subsequent logins
- Traditional login will return: "Por favor inicia sesión con tu proveedor OAuth (42 o Google)"
- To enable password login, user must set password via profile update (requires non-OAuth account)

**Issue: "Avatar not displaying after OAuth login"**
- Avatar URL is NOT stored in JWT token
- Check that `syncProfile` useEffect in App.tsx is executing
- Verify `getMyProfile()` API call returns `avatarUrl`
- Check that `p_avatar_url` was saved to database during OAuth user creation
- Fallback to default avatar generation using user ID if `avatarUrl` is null

**Issue: "Environment variables not loading"**
- Ensure `.env` file is in correct location (backend root for backend, frontend root for frontend)
- Restart backend service after changing `.env` (variables loaded at startup)
- Check for typos in variable names (must match exactly)
- Verify `dotenv/config` is imported in `main.ts`
- Frontend variables must start with `VITE_` prefix

**Issue: "42 Strategy initialization error"**
- Check that `passport-42` is installed: `npm install passport-42`
- Verify `require('passport-42').Strategy` syntax (not ES6 import)
- Ensure `authorizationURL` and `tokenURL` are explicitly set
- Check that 42 API endpoints are accessible from backend

**Issue: "JWT token expired"**
- Tokens expire after 7 days (`JWT_EXPIRATION=7d`)
- User must re-authenticate via OAuth or password login
- Logout and login again to generate fresh token
- Check token expiration with JWT decoder (jwt.io)

**Issue: "Database constraint violation on user creation"**
- Check for duplicate nick: `unique("player_p_nick_key")`
- Check for duplicate email: `unique("player_p_mail_key")`
- Check for duplicate OAuth user: `unique("unique_oauth_user")` on `(p_oauth_provider, p_oauth_id)`
- Verify data sanitization in strategy `validate()` method
- Check that nickname doesn't exceed 20 characters (truncated in GoogleStrategy)

### Debug Logging

Enable detailed logging for OAuth flow:

**Backend (auth.controller.ts):**
```typescript
console.log("🔗 [google] Redirecting to Google OAuth...");
console.log("📡 [google/callback] Google OAuth callback received");
console.log("✅ [google/callback] User authenticated:", user.pNick);
console.log("🔑 [google/callback] Token generated for user:", user.pNick);
```

**Backend (auth.service.ts):**
```typescript
console.log("🔍 [findOrCreateOAuthUser] Looking for google user:", oauthId);
console.log("✅ [findOrCreateOAuthUser] Existing google user found");
console.log("➕ [findOrCreateOAuthUser] Creating new google user");
```

**Frontend (App.tsx):**
```typescript
console.log("🔐 OAuth token detected in URL, processing...");
console.log("🔓 OAuth Login successful:", payload.nick);
console.log("✅ [App] Profile synced – avatarUrl:", profile.avatarUrl);
```

**OAuth Strategy Debugging:**
```typescript
// In google.strategy.ts or fortytwo.strategy.ts
console.log("Google Profile _json:", JSON.stringify(profile._json, null, 2));
console.log("42 Profile _json:", JSON.stringify(profile._json, null, 2));
```

These logs will help trace the entire OAuth flow from initiation to token storage.

## File Structure Reference

```
transcendence/
├── frontend/
│   ├── src/
│   │   ├── screens/
│   │   │   ├── SignScreen.tsx          # OAuth sign-up buttons (lines 142-147, 402-426)
│   │   │   ├── LoginScreen.tsx         # OAuth login buttons (lines 141-145, 308-338)
│   │   │   └── ProfileScreen.tsx       # Profile editing (uses getMyProfile API)
│   │   ├── ts/
│   │   │   └── utils/
│   │   │       └── auth.ts             # Auth utility functions (API calls)
│   │   ├── services/
│   │   │   ├── socketService.ts        # WebSocket management
│   │   │   └── user.service.ts         # User profile API (getMyProfile)
│   │   ├── App.tsx                     # OAuth callback handler (lines 66-110)
│   │   └── main.tsx                    # App entry point
│   └── .env                            # VITE_BACKEND_URL, VITE_FRONTEND_URL
│
└── backend/
    ├── src/
    │   ├── auth/
    │   │   ├── auth.controller.ts      # OAuth endpoints (@Get, @Post routes)
    │   │   ├── auth.service.ts         # OAuth user management (findOrCreateOAuthUser)
    │   │   ├── auth.module.ts          # OAuth strategy configuration
    │   │   ├── strategies/
    │   │   │   ├── google.strategy.ts  # Google OAuth strategy (passport-google-oauth20)
    │   │   │   ├── fortytwo.strategy.ts # 42 OAuth strategy (passport-42)
    │   │   │   └── jwt.strategy.ts     # JWT validation strategy (passport-jwt)
    │   │   ├── guards/
    │   │   │   └── jwt-auth.guard.ts   # JWT route protection guard
    │   │   └── dto/
    │   │       ├── register-user.dto.ts      # Registration validation
    │   │       └── complete-profile.dto.ts   # Profile completion validation
    │   ├── schema.ts                   # Drizzle ORM database schema (player table)
    │   ├── database.module.ts          # Database connection configuration
    │   ├── app.module.ts               # Main application module
    │   └── main.ts                     # App bootstrap + CORS configuration
    ├── .env                            # OAuth credentials, JWT_SECRET, DATABASE_URL
    └── docker-compose.yml              # Container orchestration with OAuth env vars
```

**Key File Locations:**

| File | Purpose | Key Features |
|------|---------|--------------|
| **frontend/src/App.tsx** | OAuth callback handler | JWT decoding, localStorage management, profile sync |
| **frontend/src/screens/LoginScreen.tsx** | Login UI | OAuth buttons, 2FA support, password login |
| **frontend/src/screens/SignScreen.tsx** | Registration UI | OAuth buttons, traditional signup, 2FA setup |
| **backend/src/auth/auth.controller.ts** | OAuth routes | Google/42 endpoints, JWT generation, profile endpoints |
| **backend/src/auth/auth.service.ts** | Auth business logic | User creation, OAuth user management, password hashing |
| **backend/src/auth/strategies/google.strategy.ts** | Google OAuth | Profile parsing, locale handling, avatar extraction |
| **backend/src/auth/strategies/fortytwo.strategy.ts** | 42 OAuth | Campus data, country mapping, email fallback |
| **backend/src/auth/strategies/jwt.strategy.ts** | JWT validation | Token verification, payload extraction |
| **backend/src/main.ts** | Backend entry point | CORS configuration, port binding |
| **backend/src/schema.ts** | Database schema | Player table with OAuth fields, constraints |

## Credits

- **NestJS Passport Module**: OAuth integration framework
- **Passport.js**: Authentication middleware
- **Google OAuth 2.0**: Google authentication provider
- **42 School API**: 42 Network authentication provider

## License

This OAuth implementation follows the same license as the Transcendence project.
