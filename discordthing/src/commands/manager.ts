import { err, NONE, Result } from "@l3dev/result";
import {
	Events,
	InteractionContextType,
	type Client,
	type Interaction,
	type RestOrArray,
	type SlashCommandBuilder
} from "discord.js";

import type { Command, CommandFilter, ErrorHandler } from "./command.js";
import type { Bot } from "../bot.js";
import { createCommandContext, type CommandCtx } from "./context.js";
import { CommandRegistration } from "./registration.js";

export type CommandManagerOptions = {
	commands?: Command<string, SlashCommandBuilder>[];
};

export class CommandManager {
	private readonly commands: Map<string, Command<string, SlashCommandBuilder>> = new Map();
	private readonly commandFilters: CommandFilter[] = [];
	private errorHandler: ErrorHandler | null = null;

	constructor(
		private readonly bot: Bot,
		options: CommandManagerOptions
	) {
		for (const command of options.commands ?? []) {
			this.commands.set(command.name, command);
		}

		bot.client.on(Events.InteractionCreate, this.onInteraction.bind(this));
	}

	/**
	 * Adds commands to the bot.
	 * @param commands The commands to add
	 * @returns A result indicating whether the commands were added successfully
	 * @example
	 * bot.commands.addMany(myCommand1, myCommand2);
	 * bot.commands.addMany([myCommand1, myCommand2]);
	 */
	addMany(...commands: RestOrArray<Command<string, SlashCommandBuilder>>) {
		return Result.all(...commands.flat().map((command) => this.add(command)));
	}

	/**
	 * Adds a command to the bot.
	 * @param command The command to add
	 * @returns A result indicating whether the command was added successfully
	 * @example
	 * const myCommand = command({
	 * 	meta: {
	 * 		name: 'my-command',
	 * 	},
	 * 	handler: async (ctx) => {
	 * 		// your code here
	 * 	}
	 * });
	 *
	 * bot.commands.add(myCommand);
	 */
	add(command: Command<string, SlashCommandBuilder>) {
		if (this.bot.client.isReady()) {
			return err("BOT_ALREADY_STARTED", {
				message: "Cannot add command after bot has started"
			});
		}

		this.commands.set(command.name, command);

		return NONE;
	}

	/**
	 * Adds a command filter that determines whether a command should be executed.
	 * @param filter The filter to add to the bot
	 * @example
	 * bot.commands.addFilter(async (interaction, command) => {
	 * 	if (interaction.guild.id !== process.env.GUILD_ID) return false;
	 * 	return true;
	 * });
	 */
	addFilter(filter: CommandFilter) {
		this.commandFilters.push(filter);
	}

	/**
	 * Sets the command error handler for the bot.
	 * @param handler The error handler to use
	 * @example
	 * bot.commands.setErrorHandler(async (ctx, err) => {
	 * 	await ctx.interaction.reply("An error occurred!");
	 * });
	 */
	setErrorHandler(handler: ErrorHandler) {
		this.errorHandler = handler;
	}

	/** @internal */
	async register(client: Client<true>) {
		const commandRegistration = new CommandRegistration(this.bot.rest, client);

		const globalCommands = Object.values(this.commands).filter((command) => {
			const contexts = command.getContexts();
			return (
				contexts.includes(InteractionContextType.BotDM) ||
				contexts.includes(InteractionContextType.PrivateChannel)
			);
		});

		const guildCommands = Object.values(this.commands).filter((command) => {
			const contexts = command.getContexts();
			return contexts.includes(InteractionContextType.Guild);
		});

		this.bot.logger.debug(`Registering global commands...`);
		await commandRegistration.registerGlobalCommands(globalCommands);

		const guilds = await client.guilds.fetch();
		for (const guild of guilds.values()) {
			this.bot.logger.debug(`Registering guild commands for guild ${guild.id}...`);
			await commandRegistration.registerGuildCommands(guild.id, guildCommands);
		}
	}

	private async onInteraction(interaction: Interaction) {
		if (interaction.user.bot || !interaction.isChatInputCommand()) return;

		const ctx = createCommandContext(this.bot, interaction);

		const result = await this.executeCommand(ctx);
		if (!result.ok && this.errorHandler) {
			try {
				await this.errorHandler(ctx, result);
			} catch (error) {
				this.bot.logger.error(`Error while executing error handler:`, error);
			}
		}
	}

	private async executeCommand(ctx: CommandCtx) {
		const commandName = ctx.interaction.commandName;
		const command = this.commands.get(commandName);
		if (!command) {
			this.bot.logger.error(`Unknown command '${commandName}'`);
			return err("UNKNOWN_COMMAND", {
				command: commandName
			});
		}

		if (!this.commandFilters.some((filter) => filter(ctx.interaction, command))) {
			return NONE;
		}

		let result;
		try {
			result = await command.execute(ctx);
		} catch (error) {
			result = err("COMMAND_FAILED", {
				command: commandName,
				error
			});
		}

		const unwrapped = Result.unwrap(result);
		if (!unwrapped.ok) {
			this.bot.logger.error(`Error while executing command '${commandName}':`, result);
		}

		return unwrapped;
	}
}
