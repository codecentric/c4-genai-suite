import { Body, Controller, ForbiddenException, Get, Logger, Post, Redirect, Req, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GithubAuthGuard, GoogleAuthGuard, LocalAuthGuard, MicrosoftAuthGuard, OAuthAuthGuard } from 'src/domain/auth';
import { AuthService } from 'src/domain/auth/auth.service';
import { isString } from 'src/lib';
import { AuthSettingsDto, LoginDto, ProfileDto } from './dtos';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  private readonly logger = new Logger(AuthController.name);

  @Get('settings')
  @ApiOperation({ operationId: 'getAuthSettings', description: 'The settings.' })
  @ApiOkResponse({ type: AuthSettingsDto })
  getSettings() {
    const config = this.authService.config;

    return AuthSettingsDto.fromDomain(config);
  }

  @Get('profile')
  @ApiOperation({ operationId: 'getProfile', description: 'Provides the profile.' })
  @ApiOkResponse({ type: ProfileDto })
  @UseGuards(LocalAuthGuard)
  getProfile(@Req() req: Request) {
    return ProfileDto.fromDomain(req.user);
  }

  @Get('logout')
  @ApiExcludeEndpoint()
  @Redirect(process.env.AUTH_LOGOUT_REDIRECT || '/')
  async getLogout(@Req() req: Request) {
    await this.authService.logout(req);
  }

  @Post('login')
  @ApiOperation({ operationId: 'login', description: 'Login completed.' })
  @ApiNoContentResponse()
  async login(@Req() req: Request, @Body() body: LoginDto) {
    await this.authService.loginWithPassword(body.email, body.password, req);
  }

  @Get('login/github')
  @ApiExcludeEndpoint()
  @Redirect()
  @UseGuards(GithubAuthGuard)
  async githubAuth() {}

  @Get('login/github/callback')
  @ApiExcludeEndpoint()
  @UseGuards(GithubAuthGuard)
  async githubAuthCallback(@Req() req: Request, @Res() res: Response) {
    await this.loginAndRedirect(req, res);
  }

  @Get('login/google')
  @ApiExcludeEndpoint()
  @Redirect()
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('login/google/callback')
  @ApiExcludeEndpoint()
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    await this.loginAndRedirect(req, res);
  }

  @Get('login/microsoft')
  @ApiExcludeEndpoint()
  @Redirect()
  @UseGuards(MicrosoftAuthGuard)
  async microsoftAuth() {}

  @Get('login/microsoft/callback')
  @ApiExcludeEndpoint()
  @UseGuards(MicrosoftAuthGuard)
  async microsoftAuthCallback(@Req() req: Request, @Res() res: Response) {
    await this.loginAndRedirect(req, res);
  }

  @Get('login/oauth')
  @ApiExcludeEndpoint()
  @Redirect()
  @UseGuards(OAuthAuthGuard)
  async oauthAuth() {}

  @Get('login/oauth/callback')
  @ApiExcludeEndpoint()
  @UseGuards(OAuthAuthGuard)
  async oauthAuthCallback(@Req() req: Request, @Res() res: Response) {
    await this.loginAndRedirect(req, res);
  }

  private async loginAndRedirect(req: Request, res: Response) {
    try {
      await this.authService.login(req.user, req);
      this.redirectToApplication(req, res);
    } catch (e) {
      if (e instanceof ForbiddenException) {
        res.redirect('/login?error=forbidden');
      } else {
        this.logger.warn('Unexpected error during login callback', e);
        res.redirect('/login?error=auth');
      }
    }
  }

  private redirectToApplication(req: Request, res: Response) {
    const redirect = req.cookies['post-login-redirect'] as string | undefined;
    if (isString(redirect) && redirect.startsWith('/')) {
      const secure = this.authService.config.baseUrl.startsWith('https');
      const sameSite = secure ? 'none' : 'strict';
      res.clearCookie('post-login-redirect', { path: '/', secure, sameSite });
      res.redirect(redirect);
    } else {
      res.redirect('/');
    }
  }
}
