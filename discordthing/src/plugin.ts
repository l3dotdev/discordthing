import type { SlashCommandBuilder } from "discord.js";

import type { Bot, BotOptions } from "./bot.js";
import type { Command } from "./commands/command.js";
import type { Listener } from "./events/listener.js";

export type PluginOptions = {
	name: string;
	commands?: Command<string, SlashCommandBuilder>[];
	listeners?: Listener<any>[];
	resolved?: (plugin: ResolvedPlugin, bot: Bot) => void;
};

export class ResolvedPlugin {
	readonly name: string;
	readonly commands: Command<string, SlashCommandBuilder>[];
	readonly listeners: Listener<any>[];

	constructor(private readonly options: PluginOptions) {
		this.name = options.name;
		this.commands = options.commands ?? [];
		this.listeners = options.listeners ?? [];
	}

	resolved(bot: Bot) {
		this.options.resolved?.(this, bot);
	}
}

export type Plugin = (botOptions: BotOptions) => ResolvedPlugin;

export function plugin(
	options: PluginOptions | ((botOptions: BotOptions) => PluginOptions)
): Plugin {
	return (botOptions) => {
		const resolvedOptions = typeof options === "function" ? options(botOptions) : options;
		return new ResolvedPlugin(resolvedOptions);
	};
}
