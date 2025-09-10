import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { InternalError } from 'src/lib';
import { AuthService } from '../auth.service';
import { withStore } from './strategy-helper';

type Profile = {
  sub: string;
  email: string;
  [key: string]: string;
};

type ErrorResponse =
  | {
      error: {
        code: string | number;
        message: string;
      };
    }
  | {
      error: string | number;
      error_description: string;
    };

@Injectable()
export class OAuthStrategy extends PassportStrategy(Strategy, 'oauth2') {
  private readonly userInfoURL;
  private readonly userGroupsProperty;

  constructor(authService: AuthService) {
    super(
      withStore({
        authorizationURL: authService.config.oauth?.authorizationURL || 'INVALID',
        callbackURL: `${authService.config.baseUrl}/auth/login/oauth/callback`,
        clientID: authService.config.oauth?.clientId || 'INVALID',
        clientSecret: authService.config.oauth?.clientSecret || 'INVALID',
        scope: ['openid', 'profile', 'email'],
        tokenURL: authService.config.oauth?.tokenURL || 'INVALID',
      }),
    );

    this.userInfoURL = authService.config.oauth?.userInfoURL || 'INVALID';
    this.userGroupsProperty = authService.config.userGroupsPropertyName;
  }

  userProfile(accessToken: string, done: (error?: Error | null, result?: any) => void) {
    this._oauth2.useAuthorizationHeaderforGET(true);
    this._oauth2.get(this.userInfoURL, accessToken, function (err, body) {
      let json;

      if (err) {
        if (err.data) {
          try {
            json = JSON.parse(err.data as string) as ErrorResponse;
          } catch (_) {
            return done(new InternalError('Failed to fetch user profile, invalid json', { cause: err }));
          }
        }

        if (json && json.error) {
          if (typeof json.error === 'object') {
            return done(new Error(`Error: ${json.error.message}. Status Code: ${json.error.code}.`));
          } else if ('error_description' in json) {
            return done(new Error(`Error: ${json.error_description}. Status Code: ${json.error}.`));
          }
        }
        return done(new InternalError('Failed to fetch user profile', { cause: err }));
      }

      try {
        // We cannot know the type here.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        json = JSON.parse(body as string);
      } catch (ex) {
        return done(new InternalError('Failed to parse user profile', { cause: ex }));
      }

      done(null, json);
    });
  }

  validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { sub: id, name, email, [this.userGroupsProperty]: userGroupIds } = profile;

    return {
      id,
      accessToken,
      email,
      name: name || email,
      userGroupIds,
      refreshToken,
    };
  }
}
