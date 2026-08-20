import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { User } from 'src/domain/users';
import { AuthService } from '../auth.service';
import { withStore } from './strategy-helper';

type Profile = {
  id: string;
  emails?: { value: string }[];
  displayName: string;
  photos?: { value: string }[];
};

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(authService: AuthService) {
    super(
      withStore({
        callbackURL: `${authService.config.baseUrl}/auth/login/github/callback`,
        clientID: authService.config.github?.clientId || 'INVALID',
        clientSecret: authService.config.github?.clientSecret || 'INVALID',
        scope: ['profile', 'email'],
      }),
    );
  }

  validate(accessToken: string, refreshToken: string, profile: Profile): Promise<Partial<User>> {
    const { id, emails, displayName: name, photos } = profile;

    // passport-github2 exposes emails as an array (never a singular `email`).
    // Use the provided email if present, but NEVER fall back to displayName:
    // a user can set their display name to anyone else's address and take over
    // that account via the email-based lookup in AuthService.login().
    const user = {
      id,
      accessToken,
      email: emails?.[0]?.value,
      name,
      picture: photos?.[0]?.value,
      refreshToken,
    };

    return Promise.resolve(user);
  }
}
