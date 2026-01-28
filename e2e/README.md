# Working with E2E Tests

## Running all E2E Tests

As you can find in the root repository's `./package.json`, there are several ways to execute E2E tests and all their dependencies easily on your local machine. Just like the `npm run dev` script, all the test scripts use the `./scripts/run-tests.js` script. For stepping through the tests, for example, you can run `npm run test:e2e:debug` in the root of the project.

## How to Add or Debug E2Es

**It is important to understand that many of our E2E tests require the correct database state** to run as expected. To ensure the state is as expected we do not run tests in parallel and we use the test step syntax, which you can find in test files by looking for the `.step` keyword. The state issue is also one of the reasons, why we kept the extension tests (which use real LLM APIs) separately.

Note that the "extension tests" will be skipped if no `AZURE_OPEN_AI_API_KEY` environment variable is set.

**Run single E2E files** when you are debugging or developing them. While you are in the root of the c4 repository you can run test files (from within the `e2e` directory) as in the examples below. The `--debug` flag allows for the debug mode to run. The `--noAutoKill` flag will keep all dependency servers for the tests running after the tests, such that you can login with another browser after the test to work on your tests. Try using playwright's code generator to append to the end of test files easily with `npx playwright codegen http://localhost:5173/login` and some manual help.

Examples:
```bash
node scripts/run-tests.js --file tests/administration/permissions.spec.ts
node scripts/run-tests.js --file tests/extension/user-args.spec.ts --debug
node scripts/run-tests.js --file tests/extension/mcp-server.spec.ts --noAutoKill
node scripts/run-tests.js --file expensive-tests/azure-vision.spec.ts
```
## Known Issues with E2Es running locally

- Sometimes the automatic termination of the docker containers started by the script fails (observed on mac)

# Pipeline fails and you don't know why?

In the GitHub Actions workflows, we upload the reports and the trace, as well as screenshots and videos of failed tests.
The trace can be used to view it in the playwright [trace viewer](https://playwright.dev/docs/trace-viewer-intro#recording-a-trace)

Then you can go to the [web version](https://trace.playwright.dev/) of the trace viewer that unzip your trace locally for you.
