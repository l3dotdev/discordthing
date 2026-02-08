import { Client, Events, REST, SlashCommandBuilder, type ClientOptions } from "discord.js";
import { Logger } from "tslog";

import type { Command } from "./commands/command.js";
import { CommandManager } from "./commands/manager.js";
import type { Listener } from "./events/listener.js";
import { EventsManager } from "./events/manager.js";
import type { ILogger } from "./logger.js";
import type { Plugin, ResolvedPlugin } from "./plugin.js";

export type BotOptions = {
	name?: string;
	plugins?: Plugin[];
	commands?: Command<string, SlashCommandBuilder>[];
	listeners?: Listener<any>[];
	logger?: ILogger;
};

export class Bot {
	readonly client: Client<boolean>;
	private _rest: REST;
	get rest() {
		return this._rest;
	}

	readonly logger: ILogger;
	readonly commands: CommandManager;
	readonly events: EventsManager;

	private readonly plugins: ResolvedPlugin[];

	constructor(options: BotOptions, clientOptions: ClientOptions) {
		this._rest = new REST({ version: "10" });
		this.client = new Client(clientOptions);

		this.plugins = (options.plugins ?? []).map((plugin) => plugin(options));
		this.logger =
			options.logger ??
			new Logger({
				name: options.name ?? "discordthing-bot"
			});

		for (const plugin of this.plugins) {
			plugin.resolved(this);
		}

		this.commands = new CommandManager(this, {
			commands: [...(options.commands ?? []), ...this.plugins.flatMap((plugin) => plugin.commands)]
		});

		this.events = new EventsManager(this, {
			listeners: [
				...(options.listeners ?? []),
				...this.plugins.flatMap((plugin) => plugin.listeners)
			]
		});

		this.client.on(Events.Debug, (message) => {
			this.logger.debug(message);
		});
		this.client.on(Events.ClientReady, this.onReady.bind(this));
	}

	/**
	 * Starts the bot and establishes a WebSocket connection to Discord.
	 * @param token Token of the account to log in with
	 * @returns Token of the account used
	 * @example
	 * bot.start('my token');
	 */
	async start(token: string) {
		this._rest = this._rest.setToken(token);
		return await this.client.login(token);
	}

	private async onReady(client: Client<true>) {
		const startMs = performance.now();

		await this.commands.register(client);
		await this.events.runReadyListeners(client);

		const endMs = performance.now();
		const elapsedMs = endMs - startMs;

		this.logger.info(
			`Ready! (${elapsedMs > 1000 ? `${(elapsedMs / 1000).toFixed(2)}s` : `${Math.round(elapsedMs)}ms`})`
		);
	}
}
