import Cookies from 'universal-cookie';
import { create } from 'zustand';

import { Configuration, Middleware } from 'src/api/generated-eval';
import { useTransientNavigate } from 'src/hooks';
import { i18next } from 'src/texts/i18n';
import { EvalClient } from '../apiEvalClient';

type TransientNavigateFn = ReturnType<typeof useTransientNavigate>;

type EvalClientActions = {
  getEvalClient: (navigate: TransientNavigateFn) => EvalClient;
};

const createEvalClientMiddleware: (navigate: TransientNavigateFn) => Middleware = (navigate) => ({
  pre: async (context) => {
    context.init.credentials = 'include';
    context.init.headers = {
      ...context.init.headers,
      'Accept-Language': i18next.language,
    };
    return Promise.resolve();
  },
  post: async (context) => {
    if (context.response?.status === 401) {
      const secure = window.location.protocol === 'https:';
      const sameSite = secure ? 'none' : 'strict';
      const cookies = new Cookies(null, { path: '/', secure, sameSite });
      cookies.set('post-login-redirect', window.location.pathname);
      navigate('/login');
    }
    return Promise.resolve();
  },
});

/**
 * @description An evalClient provider that can be reused without reinitializing
 * the evalClient. The singleton functionality of Zustand enables us to do so.
 *
 * The eval service is accessed through the C4 backend proxy at /eval
 */
export const useEvalClientStore = create<EvalClientActions>(() => {
  let evalClient: EvalClient | undefined;

  const initializeEvalClient = (navigate: TransientNavigateFn): EvalClient => {
    if (!evalClient) {
      const basePath = import.meta.env.VITE_SERVER_URL || '';
      // Eval service is proxied through C4 backend at /eval
      const configuration = new Configuration({
        basePath: `${basePath}/api/eval`,
      });
      const middleware = createEvalClientMiddleware(navigate);
      evalClient = new EvalClient(configuration, middleware);
    }

    return evalClient;
  };

  return {
    getEvalClient: (navigate: TransientNavigateFn) => initializeEvalClient(navigate),
  };
});
