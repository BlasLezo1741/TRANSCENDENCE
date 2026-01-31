export class AuthResponseDto {
	accessToken: string;
	user: {
	  id: number;
	  nick: string;
	  email: string;
	  avatarUrl?: string;
	  profileComplete: boolean;
	};
  }
  
  export class OAuthCallbackDto {
	accessToken?: string;
	requiresProfileCompletion?: boolean;
	tempToken?: string;
	user?: {
	  id: number;
	  nick: string;
	  email: string;
	  avatarUrl?: string;
	};
  }