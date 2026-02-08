import type { Bot } from "./bot.js";
import type { ILogger } from "./logger.js";
import { PermissionsResolver } from "./permissions.js";

export type GenericCtx = {
	bot: Bot;
	permissions: PermissionsResolver;
	logger: ILogger;
};

export function createGenericContext(bot: Bot): GenericCtx {
	return {
		bot,
		permissions: new PermissionsResolver(bot),
		logger: bot.logger
	};
}
