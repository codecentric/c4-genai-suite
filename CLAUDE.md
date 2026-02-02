# C4_llmeval project

I'm integrating the old llmeval project as a service into the C4 genai suite.

The root inlcudes my working copy of c4 genai suite, where I'm integrating the eval service.

The c4 backend/frontend can directly use the eval service, with the proxy system we've implemented. Therefore you can directly use the openapi code generated in the frontend to access the eval service.
If you need to have a specific change to eval service, that should be implemented in the eval service, the c4 backend should not have any logic related to eval service and only proxies requests to the eval service.

## Eval Service: EVAL (previously known as llmeval)

This is found under c4-genai-suite/services/eval, I possibly address it eval, llmeval etc. and you should solely look into this folder.

The reference llmeval is found under directly llmeval, and you shouldn't look there unless I explicitly tell you to.
