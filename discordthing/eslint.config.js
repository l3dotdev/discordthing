import "eslint-import-resolver-typescript";

import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import zod from "eslint-plugin-zod";
import globals from "globals";
import tseslint from "typescript-eslint";
import requireExtensions from "eslint-plugin-require-extensions";

export default defineConfig(
	globalIgnores(["eslint.config.js", "build/", "dist/"]),
	js.configs.recommended,
	...tseslint.configs.recommended,
	zod.configs.recommended,
	importPlugin.flatConfigs.recommended,
	requireExtensions.configs.recommended,
	prettier,
	{
		name: "globals",
		languageOptions: {
			globals: {
				...globals.node,
				App: "readonly"
			}
		}
	},
	{
		name: "import/settings",
		settings: {
			"import/parsers": {
				"@typescript-eslint/parser": [".ts"]
			},
			"import/resolver": {
				typescript: {
					project: import.meta.dirname + "/tsconfig.json",
					tsconfigRootDir: import.meta.dirname
				},
				node: {
					extensions: [".js", ".jsx", ".ts", ".tsx"]
				}
			}
		}
	},
	{
		name: "global/custom-rules",
		rules: {
			"import/no-duplicates": "off",
			"import/order": [
				"warn",
				{
					groups: ["builtin", "external", "internal", ["sibling", "parent"], "index"],
					alphabetize: {
						order: "asc",
						caseInsensitive: true
					},
					"newlines-between": "always",
					pathGroups: [
						{
							pattern: "\$**",
							group: "internal"
						},
						{
							pattern: "$env/**",
							group: "internal"
						},
						{
							pattern: "$app/**",
							group: "internal"
						}
					]
				}
			],
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_"
				}
			],
			"@typescript-eslint/no-namespace": "off",
			"@typescript-eslint/no-empty-object-type": "off"
		}
	}
);
