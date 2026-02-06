# C4_llmeval project

I'm integrating the old llmeval project as a service into the C4 genai suite.

The c4 backend/frontend can directly use the eval service, with the proxy system we've implemented. Therefore you can directly use the openapi code generated in the frontend to access the eval service.
If you need to have a specific change to eval service, that should be implemented in the eval service, the c4 backend should not have any logic related to eval service and only proxies requests to the eval service.

## Workflow

If I give you tasks to complete from EVAL_INTEGRATION_PLAN.md, please update the task status on plan after you complete it, or started working on it. so that we can track the progress.

## Eval Service: EVAL (previously known as llmeval)

This is found under ./services/eval, I possibly address it eval, llmeval etc. and you should solely look into this folder.

The reference llmeval is found under directly ../llmeval, and you shouldn't look there unless I explicitly tell you to.

## Write good, working, bug-less code fast: use Test-Driven Development (TDD)

When you’re adding new logic—or fixing older code with no tests—**TDD** helps you verify correctness as you go.

You **must** follow the TDD cycle for _all_ code generation. **Do not write any implementation code until a failing test has been established.**

### The Cycle

#### 1) RED — Write the test

- Analyze the requirement.
- Write a test that captures the expected behavior.
- **Stop.** Confirm the test fails (or ask the user to confirm it fails).

#### 2) GREEN — Make it pass

- Write the **minimum** implementation needed to pass the test.
- Don’t add extra features or optimizations yet.
- **Stop.** Confirm the test passes.

#### 3) REFACTOR — Clean it up

- Improve readability, structure, and performance **without changing behavior**.
- Ensure the tests still pass.

### Critical Rules

- **Never** include implementation code in the same response as test code.
- During **GREEN**, always prefer the simplest possible implementation.
