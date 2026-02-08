import {
	Routes,
	type APIApplicationCommand,
	type Client,
	type REST,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	type SlashCommandBuilder,
	type Snowflake
} from "discord.js";

import type { Command } from "./command.js";
import { diffCheck } from "./diff.js";

export class CommandRegistration {
	constructor(
		private rest: REST,
		private client: Client<true>
	) {}

	async registerGlobalCommands(commands: Command<string, SlashCommandBuilder>[]) {
		await this.registerCommands(commands, Routes.applicationCommands(this.client.user.id), (id) =>
			Routes.applicationCommand(this.client.user.id, id)
		);
	}

	async registerGuildCommands(
		guildId: Snowflake,
		commands: Command<string, SlashCommandBuilder>[]
	) {
		await this.registerCommands(
			commands,
			Routes.applicationGuildCommands(this.client.user.id, guildId),
			(id) => Routes.applicationGuildCommand(this.client.user.id, guildId, id)
		);
	}

	private async registerCommands(
		commands: Command<string, SlashCommandBuilder>[],
		route: `/${string}`,
		deleteRoute: (id: string) => `/${string}`
	) {
		const registeredCommands = (await this.rest.get(route)) as Omit<
			APIApplicationCommand,
			"dm_permission"
		>[];

		const commandsToAdd: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
		for (const command of commands) {
			const body = command.getBuilder().toJSON();

			const registeredCommand = registeredCommands.find(
				(registeredCommand) => registeredCommand.name === command.name
			);
			if (registeredCommand && !diffCheck({ prev: registeredCommand, next: body })) {
				continue;
			}

			commandsToAdd.push(body);
		}

		const commandsToRemove: string[] = [];
		for (const registeredCommand of registeredCommands) {
			const command = commands.find((command) => command.name === registeredCommand.name);
			if (command) {
				return;
			}

			commandsToRemove.push(registeredCommand.id);
		}

		const addPromises = commandsToAdd.map((body) => this.rest.post(route, { body }));
		const removePromises = commandsToRemove.map((id) => this.rest.delete(deleteRoute(id)));

		await Promise.all([...addPromises, ...removePromises]);
	}
}
