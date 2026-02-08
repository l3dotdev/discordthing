import type { ESLint, Linter, Rule } from "eslint";
import { ESLintUtils } from "@typescript-eslint/utils";
import type {
	ExportAllDeclaration,
	ExportNamedDeclaration,
	ImportDeclaration
} from "@typescript-eslint/types/dist/generated/ast-spec";

const plugin = {
	meta: {
		name: "eslint-plugin-require-extensions"
	},
	rules: {
		"require-extensions": ESLintUtils.RuleCreator(() => "unknown")<[], "use-js-extensions">({
			name: "require-extensions",
			meta: {
				type: "problem",
				fixable: "code",
				docs: {
					description: "Enforce the use of .js extensions for imports and exports"
				},
				messages: {
					"use-js-extensions": "Relative imports and exports must end with .js"
				},
				schema: []
			},
			create(context) {
				function rule(node: ImportDeclaration | ExportNamedDeclaration | ExportAllDeclaration) {
					const source = node.source?.value;
					if (!source || !source.startsWith(".") || source.endsWith(".js")) return;

					context.report({
						node,
						messageId: "use-js-extensions",
						fix: (fixer) => {
							return fixer.replaceText(node.source!, `"${source}.js"`);
						}
					});
				}

				return {
					ImportDeclaration: rule,
					ExportNamedDeclaration: rule,
					ExportAllDeclaration: rule
				};
			}
		})
	} as unknown as Record<string, Rule.RuleModule>
} satisfies ESLint.Plugin;

const recommendedConfig = {
	name: "slint-plugin-require-extensions",
	files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
	plugins: {
		"require-extensions": plugin
	},
	rules: {
		"require-extensions/require-extensions": "error"
	}
} satisfies Linter.Config;

export default {
	...plugin,
	configs: {
		recommended: recommendedConfig
	}
} satisfies ESLint.Plugin;
