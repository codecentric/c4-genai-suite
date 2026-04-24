import { All, Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { fetch as undiciFetch } from 'undici';
import { LocalAuthGuard, RoleGuard } from 'src/domain/auth';
import { Role } from 'src/domain/auth/role.decorator';
import { BUILTIN_USER_GROUP_ADMIN } from 'src/domain/database';
import { EvalServiceStatusDto } from './dtos';

/**
 * Authenticated controller for eval service requests.
 *
 * This controller forwards requests to the internal eval service with authentication.
 * All routes are protected with LocalAuthGuard (session auth) and RoleGuard (admin only).
 *
 * Guards execute BEFORE the controller method, ensuring req.user is populated.
 * The controller method then forwards authenticated requests to the eval service.
 */
@Controller('eval')
@UseGuards(LocalAuthGuard, RoleGuard)
@Role(BUILTIN_USER_GROUP_ADMIN)
@ApiTags('eval')
export class EvalController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Check whether the eval service feature is enabled.
   *
   * Returns `{ available: true }` when the `EVAL_SERVICE_ENABLED` environment
   * variable is set to `"true"`, otherwise `{ available: false }`.
   *
   * The frontend uses this to conditionally show/hide the Evaluations section
   * in the admin sidebar. When the eval service is not deployed, the entire
   * UI section is hidden so users don't encounter dead functionality.
   *
   * This route is defined BEFORE the wildcard `@All('*')` so NestJS matches
   * it first and doesn't forward it to the eval service proxy.
   *
   * Access: Admin users only (inherits controller-level guards)
   */
  @Get('status')
  @ApiOperation({
    operationId: 'getEvalServiceStatus',
    summary: 'Check if the eval service feature is enabled',
    description:
      'Returns whether the evaluation service is enabled via the EVAL_SERVICE_ENABLED env var. ' +
      'Used by the frontend to conditionally render the evaluations UI.',
  })
  @ApiOkResponse({ type: EvalServiceStatusDto })
  getStatus(): EvalServiceStatusDto {
    const dto = new EvalServiceStatusDto();
    dto.available = this.configService.get<string>('EVAL_SERVICE_ENABLED', 'false') === 'true';
    return dto;
  }

  /**
   * Proxy all requests to eval service.
   *
   * This wildcard route matches all HTTP methods and paths under /eval/*.
   * Guards execute first to validate authentication and admin role.
   * Then this method forwards the request to the eval service.
   *
   * Access: Admin users only
   */
  @All('*')
  @ApiExcludeEndpoint()
  async proxy(@Req() req: Request, @Res() res: Response) {
    const evalServiceUrl = this.configService.get<string>('EVAL_SERVICE_URL', 'http://localhost:3202');

    // Remove /api/eval prefix from path for forwarding
    const targetPath = req.path.replace(/^\/api\/eval/, '');

    // Build query string
    const queryString =
      Object.keys(req.query).length > 0 ? '?' + new URLSearchParams(req.query as Record<string, string>).toString() : '';

    const targetUrl = `${evalServiceUrl}${targetPath}${queryString}`;

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'X-User-Id': req.user.id,
        'X-User-Name': req.user.name,
      };

      if (req.user.email) {
        headers['X-User-Email'] = req.user.email;
      }

      if (req.headers['content-type']) {
        headers['Content-Type'] = req.headers['content-type'];
      }

      // Prepare request body
      let body: string | undefined;
      if (!['GET', 'HEAD'].includes(req.method)) {
        if (req.body) {
          // Body is already parsed by body-parser middleware
          body = JSON.stringify(req.body);
          // Ensure content-type is set for JSON
          if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
          }
        }
      }

      // Forward request to eval service
      const response = await undiciFetch(targetUrl, {
        method: req.method,
        headers,
        body,
      });

      // Get response body
      const buffer = await response.arrayBuffer();
      const responseBody = Buffer.from(buffer);

      // Forward response headers
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // Forward status and body
      res.status(response.status);
      res.send(responseBody);
    } catch (error) {
      console.error('Eval proxy error:', error instanceof Error ? error.message : String(error));

      if (!res.headersSent) {
        res.status(502).json({
          error: 'Bad Gateway',
          message: 'Eval service is unavailable',
        });
      }
    }
  }
}
