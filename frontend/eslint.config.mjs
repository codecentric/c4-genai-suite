import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import react from "eslint-plugin-react";
import _import from "eslint-plugin-import";
import reactRefresh from "eslint-plugin-react-refresh";
import typescriptEslintEslintPlugin from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import noRestrictedApiConversations from "./eslint-rules/no-restricted-api-conversations.js";
import noZustandOutsideState from "./eslint-rules/no-zustand-outside-state.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores([
    "**/.eslintrc.js",
    "src/api/generated",
    "**/vite.config.ts",
    "**/vitest.setup.ts",
    "./mock/*.js",
    "./node_modules/**/*",
    "**/*.js",
    "**/*.mjs",
    "**/*.cjs",
]), {
    extends: fixupConfigRules(compat.extends(
        "plugin:react/jsx-runtime",
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:prettier/recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:testing-library/react",
    )),

    plugins: {
        react: fixupPluginRules(react),
        import: fixupPluginRules(_import),
        "react-refresh": reactRefresh,
        "@typescript-eslint": fixupPluginRules(typescriptEslintEslintPlugin),
        "custom": {
            rules: {
                "no-restricted-api-conversations": noRestrictedApiConversations,
                "no-zustand-outside-state": noZustandOutsideState
            }
        }
    },

    languageOptions: {
        globals: {
            ...globals.browser,
        },

        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "module",

        parserOptions: {
            project: "tsconfig.json",
            tsconfigRootDir: __dirname,

            ecmaFeatures: {
                jsx: true,
            },
        },
    },

    settings: {
        react: {
            version: "detect",
        },
    },

    rules: {
        "no-unused-vars": "off", // replaced by @typescript-eslint/no-unused-vars
        "@typescript-eslint/no-unused-vars": [
           "error",
           {
              "varsIgnorePattern": "^_.*",
              "argsIgnorePattern": "^_.*",
              "caughtErrorsIgnorePattern": "^_",
              "ignoreRestSiblings": true,  // e.g.: c is not unused in ```const {a, ...x} = {a:1, b:2, c:3}```
           }
        ],
        "import/extensions": ["error", "never"],
        "import/no-extraneous-dependencies": "off",
        "import/no-useless-path-segments": "off",

        "import/order": ["error", {
            pathGroupsExcludedImportTypes: ["builtin"],

            pathGroups: [{
                pattern: "src/**",
                group: "external",
                position: "after",
            }],

            alphabetize: {
                order: "asc",
            },
        }],

        "custom/no-zustand-outside-state": ["error"],

        // To enforce api-calles are managed via hooks, and not within random tsx files.
        "custom/no-restricted-api-conversations": ["error", {
            allowedPaths: [
                "src/pages/chat/state",
		"src/hooks/api/files.ts",
		"src/hooks/conversation-extension-context.ts",
            ]
        }],

        // Restrict imports from zustand state to only within the state directory
        "no-restricted-imports": ["error", {
	    patterns: [{
	      group: ["*/state/zustand/*"],
	      message: "Access Zustand state only via hooks from '*/state/*' that expose specific sub-states or handle sync between API and local state.",
	    }],
	}],

        "prettier/prettier": ["error"],

        "react-refresh/only-export-components": ["error", {
            allowConstantExport: true,
        }],

        "sort-imports": ["error", {
            ignoreCase: true,
            ignoreDeclarationSort: true,
        }],

        "react/react-in-jsx-scope": "off",
        "react/jsx-uses-react": "off",
        "react/display-name": "off",

        "react/no-unknown-property": [1, {
            requireDataLowercase: true,
        }],

        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "semi": ["error", "always"],

        // allow "unused" promises to be passed as props, since we are using react-hook-form and `form.handleSubmit` returns a promise.
        // see discussions https://github.com/orgs/react-hook-form/discussions/10965
        "@typescript-eslint/no-misused-promises": ["off", {
            checksVoidReturn: {
                attributes: false,
            },
        }],
        "no-warning-comments": "error",
    },
}, {
    files: ["**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
    extends: fixupConfigRules(compat.extends("plugin:testing-library/react")),
}]);
