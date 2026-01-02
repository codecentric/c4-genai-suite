import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';

const app = express();
const port = Number(process.env.PORT || 9999); // Fixed port 9999

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function generateId(username: string) {
  const encoder = new TextEncoder();
  const hashArray = Array.from(encoder.encode(username));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

interface AuthCode {
  user: string;
  clientId: string;
  expiresAt: number;
}

interface TokenData {
  user: string;
  clientId: string;
  expiresAt: number;
}

interface Config {
  clientId: string;
  clientSecret: string;
  brandName: string;
}

// Store active authorization codes and tokens
const authCodes: Record<string, AuthCode> = {};
const tokens: Record<string, TokenData> = {};
const activeSessions: Set<string> = new Set(); // Track active sessions

// Configuration from environment variables
const config: Config = {
  clientId: process.env.AUTH_OAUTH_CLIENTID || 'client_id',
  clientSecret: process.env.AUTH_OAUTH_CLIENTSECRET || 'client_secret',
  brandName: process.env.AUTH_OAUTH_BRAND_NAME || 'Local OIDC'
};

// Helper function to render login form with optional error message
function renderLoginForm(
  res: Response,
  clientId: string = '',
  redirectUri: string = '',
  state: string = '',
  responseType: string = '',
  errorMessage: string = ''
) {
  res.send(`
    <html>
      <head>
        <title>${config.brandName} - Login</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .container { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input[type="text"], input[type="password"] { width: 100%; padding: 8px; box-sizing: border-box; }
          button { padding: 10px 15px; background-color: #4CAF50; color: white; border: none; cursor: pointer; }
          .error-message { color: #f44336; margin-bottom: 15px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>${config.brandName}</h2>
          ${errorMessage ? `<div class="error-message">${errorMessage}</div>` : ''}
          <form method="POST" action="/default/login">
            <input type="hidden" name="redirect_uri" value="${redirectUri}" />
            <input type="hidden" name="state" value="${state}" />
            <input type="hidden" name="response_type" value="${responseType}" />
            <input type="hidden" name="client_id" value="${clientId}" />
            
            <div class="form-group">
              <label for="username">Username:</label>
              <input type="text" id="username" name="username" required />
            </div>
            
            <div class="form-group">
              <label for="password">Password:</label>
              <input type="password" id="password" name="password" required />
            </div>
            
            <button type="submit">Login</button>
          </form>
        </div>
      </body>
    </html>
  `);
}

// Authorization endpoint - renders a login form
app.get('/default/authorize', (req: Request, res: Response) => {
  const { client_id, redirect_uri, state, response_type } = req.query as {
    client_id?: string;
    redirect_uri?: string;
    state?: string;
    response_type?: string;
  };

  // Validate client_id
  if (client_id !== config.clientId) {
    res.status(400).send('Invalid client_id');
    return;
  }

  // Render the login form
  renderLoginForm(res, client_id, redirect_uri, state, response_type);
});

// Login endpoint - processes the login form
app.post('/default/login', (req: Request, res: Response) => {
  const { username, password, redirect_uri, state, client_id, response_type } = req.body;

  // Find user
  if (!username) {
    return renderLoginForm(
      res,
      client_id,
      redirect_uri,
      state,
      response_type,
      "Invalid username. User not found."
    );
  }

  // Verify password
  if (password !== 'secret') {
    return renderLoginForm(
      res,
      client_id,
      redirect_uri,
      state,
      response_type,
      "Incorrect password. Please try again."
    );
  }

  // Password is correct, proceed with authentication

  // Generate an authorization code
  const code = crypto.randomBytes(16).toString('hex');

  // Store the code with user info
  authCodes[code] = {
    user: username,
    clientId: client_id,
    expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes expiration
  };

  // Add to active sessions
  activeSessions.add(username);

  // Redirect back to the client with the auth code
  if (!redirect_uri) {
    res.status(400).send('Missing redirect_uri');
    return;
  }

  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.append('code', code);
  if (state) {
    redirectUrl.searchParams.append('state', state);
  }

  res.redirect(redirectUrl.toString());
});

// Token endpoint - exchanges auth code for access token
app.post('/default/token', (req: Request, res: Response) => {
  const { grant_type, code, client_id, client_secret } = req.body;

  // Validate client credentials
  if (client_id !== config.clientId || client_secret !== config.clientSecret) {
    res.status(401).json({ error: 'invalid_client' });
    return;
  }

  // Validate grant type
  if (grant_type !== 'authorization_code') {
    res.status(400).json({ error: 'unsupported_grant_type' });
    return;
  }

  // Validate the authorization code
  const authCodeData = authCodes[code];
  if (!authCodeData || authCodeData.expiresAt < Date.now()) {
    res.status(400).json({ error: 'invalid_grant' });
    return;
  }

  // Generate access token
  const accessToken = crypto.randomBytes(32).toString('hex');
  const idToken = crypto.randomBytes(32).toString('hex');

  // Store token information
  tokens[accessToken] = {
    user: authCodeData.user,
    clientId: client_id,
    expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour expiration
  };

  // Remove used authorization code
  delete authCodes[code];

  // Return the tokens
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    id_token: idToken
  });
});

// UserInfo endpoint - returns user information
app.get('/default/userinfo', (req: Request, res: Response) => {
  // Extract the token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const tokenData = tokens[token];

  // Validate token
  if (!tokenData || tokenData.expiresAt < Date.now()) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  res.json({
    sub: generateId(tokenData.user),
    name: tokenData.user,
    email: tokenData.user,
    groups: ['admin', 'gpt-oss', 'mistral'],
  });
});

// End Session endpoint - handles logout
app.get('/default/endsession', (req: Request, res: Response) => {
  const { post_logout_redirect_uri, id_token_hint } = req.query as {
    post_logout_redirect_uri?: string;
    id_token_hint?: string;
  };

  // In a real implementation, you would validate the id_token_hint
  // and ensure the user is actually logged in

  // If a token was provided, find and invalidate it
  if (id_token_hint) {
    // This is simplified - in a real implementation you would decode and validate the ID token
    Object.keys(tokens).forEach(key => {
      const token = tokens[key];
      // Remove the user's session
      activeSessions.delete(token.user);
      // Invalidate the token
      delete tokens[key];
    });
  }

  // Show logout confirmation page if no redirect URI is provided
  if (!post_logout_redirect_uri) {
    res.send(`
      <html>
        <head>
          <title>${config.brandName} - Logged Out</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>You have been logged out</h2>
            <p>Your session has been terminated.</p>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // Redirect to the provided URI
  res.redirect(post_logout_redirect_uri);
});

// Discovery document endpoint
app.get('/.well-known/openid-configuration', (_req: Request, res: Response) => {
  res.json({
    issuer: `http://localhost:${port}`,
    authorization_endpoint: `http://localhost:${port}/default/authorize`,
    token_endpoint: `http://localhost:${port}/default/token`,
    userinfo_endpoint: `http://localhost:${port}/default/userinfo`,
    end_session_endpoint: `http://localhost:${port}/default/endsession`,
    jwks_uri: `http://localhost:${port}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'profile', 'email'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    claims_supported: ['sub', 'name', 'email']
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Mock OAuth server running at http://localhost:${port}`);
  console.log(`Authorization URL: http://localhost:${port}/default/authorize`);
  console.log(`Token URL: http://localhost:${port}/default/token`);
  console.log(`UserInfo URL: http://localhost:${port}/default/userinfo`);
  console.log(`End Session URL: http://localhost:${port}/default/endsession`);
});