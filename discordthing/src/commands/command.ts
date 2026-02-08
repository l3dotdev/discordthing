import { err, NONE, ok, Result, type Err, type ReturnResult } from "@l3dev/result";
import {
	ApplicationCommandOptionType,
	DiscordjsErrorCodes,
	DiscordjsTypeError,
	InteractionContextType,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	type ChatInputCommandInteraction,
	type CommandInteractionOption,
	type CommandInteractionOptionResolver,
	type SharedNameAndDescription,
	type SharedSlashCommandOptions
} from "discord.js";
import type * as z from "zod";

import type { Args, OptionDefinitions } from "../options/index.js";
import {
	AttachmentOption,
	BooleanOption,
	ChannelOption,
	IntegerOption,
	MentionableOption,
	NumberOption,
	RoleOption,
	StringOption,
	UserOption,
	type BaseOption
} from "../options/options.js";
import type { MaybePromise } from "../utility-types.js";
import type { CommandCtx } from "./context.js";

export type ArgsArrayForOptions<Options extends OptionDefinitions> = [Options] extends [
	OptionDefinitions
]
	? [args: Args<Options>]
	: [];

export type CommandMeta<Name extends string> = {
	/**
	 * The name of the command.
	 */
	name: Name;
	/**
	 * The description of the command.
	 */
	description?: string;
	/**
	 * Whether the command is NSFW.
	 */
	nsfw?: boolean;
	/**
	 * The contexts in which the command can be used.
	 *
	 * @default [InteractionContextType.Guild]
	 */
	contexts?: InteractionContextType[];
};

export type SubcommandMeta<Name extends string> = {
	/**
	 * The name of the command.
	 */
	name: Name;
	/**
	 * The description of the command.
	 */
	description?: string;
};

type GenericCommandHandler = (
	ctx: CommandCtx,
	...args: any[]
) => MaybePromise<ReturnResult<any, any>>;

export class Command<
	Name extends string,
	Builder extends SharedNameAndDescription & SharedSlashCommandOptions<any>
> {
	readonly name: Name;

	private options: OptionDefinitions | null = null;
	private subcommands: Record<string, Command<string, SlashCommandSubcommandBuilder>> | null = null;
	private handler: GenericCommandHandler | null = null;

	constructor(
		protected builder: Builder,
		meta: CommandMeta<Name>
	) {
		this.name = meta.name;

		builder = builder.setName(meta.name);
		if (meta.description) {
			builder = builder.setDescription(meta.description);
		}
		if (builder instanceof SlashCommandBuilder) {
			let commandBuilder = builder as SlashCommandBuilder;
			if (meta.nsfw) {
				commandBuilder = commandBuilder.setNSFW(meta.nsfw);
			}
			commandBuilder = commandBuilder.setContexts(meta.contexts ?? [InteractionContextType.Guild]);
			builder = commandBuilder as Builder & SlashCommandBuilder;
		}
		this.builder = builder;
	}

	async execute(ctx: CommandCtx): Promise<ReturnResult<any, any>> {
		if (this.subcommands) {
			const continueResult = this.handler ? await this.handler(ctx) : NONE;
			if (!continueResult.ok || !continueResult.value) {
				return continueResult;
			}

			const subcommandName = ctx.interaction.options.getSubcommand(true);
			const subcommand = this.subcommands[subcommandName];
			if (!subcommand) {
				return err("UNKNOWN_SUBCOMMAND", {
					subcommand: subcommandName
				});
			}

			return await subcommand.execute(ctx);
		}

		const parseResult = this.parseOptions(ctx.interaction.options);
		if (!parseResult.ok) {
			return parseResult;
		}

		const args = parseResult.value;
		return await this.handler!(ctx, args);
	}

	/** @internal */
	private parseOptions(
		options: Omit<CommandInteractionOptionResolver, "getMessage" | "getFocused">
	) {
		const args: Record<string, any> = {};

		for (const [name, option] of Object.entries(this.options ?? {})) {
			const required = option.isOptional === "required";

			const result = Result.from(
				() => {
					if (option instanceof AttachmentOption) {
						return options.getAttachment(name, required);
					} else if (option instanceof BooleanOption) {
						return options.getBoolean(name, required);
					} else if (option instanceof ChannelOption) {
						return options.getChannel(name, required, option.getBuilder().channel_types);
					} else if (option instanceof IntegerOption) {
						return options.getInteger(name, required);
					} else if (option instanceof MentionableOption) {
						return options.getMentionable(name, required);
					} else if (option instanceof NumberOption) {
						return options.getNumber(name, required);
					} else if (option instanceof RoleOption) {
						return options.getRole(name, required);
					} else if (option instanceof StringOption) {
						return options.getString(name, required);
					} else if (option instanceof UserOption) {
						return options.getUser(name, required);
					}

					return null;
				},
				{
					onError: { type: "OPTION_ERROR" }
				}
			);

			if (!result.ok) {
				const error = result.context.error;
				if (error instanceof DiscordjsTypeError) {
					switch (error.code) {
						case DiscordjsErrorCodes.CommandInteractionOptionType:
							return err("INVALID_OPTION_TYPE", {
								name,
								option: options.get(name)!
							});
						case DiscordjsErrorCodes.CommandInteractionOptionEmpty:
							return err("MISSING_OPTION", {
								name
							});
					}
				}

				return result;
			}

			let value = result.value;
			if (value === null || value === undefined) {
				continue;
			}

			if (option.validator) {
				const validatorResult = option.validator.safeParse(value);
				if (!validatorResult.success) {
					return err("INVALID_OPTION_VALUE", {
						zodError: validatorResult.error,
						name,
						value
					});
				}

				value = validatorResult.data;
			}

			args[name] = value;
		}

		return ok(args);
	}

	/** @internal */
	getContexts() {
		if (!(this.builder instanceof SlashCommandBuilder)) {
			return [];
		}

		return this.builder.contexts ?? [InteractionContextType.Guild];
	}

	/** @internal */
	getBuilder() {
		return this.builder;
	}

	/** @internal */
	setOptions(options: OptionDefinitions) {
		this.options = options;

		for (const [name, option] of Object.entries(options)) {
			this.addOption(name, option);
		}
	}

	/** @internal */
	private addOption(name: string, option: BaseOption<any, any, any>) {
		let optionBuilder = option.getBuilder().setName(name);
		if (!optionBuilder.description) {
			optionBuilder = optionBuilder.setDescription(`${name} option.`);
		}

		if (optionBuilder.type === ApplicationCommandOptionType.Attachment) {
			this.builder = this.builder.addAttachmentOption(optionBuilder);
		} else if (optionBuilder.type === ApplicationCommandOptionType.Boolean) {
			this.builder = this.builder.addBooleanOption(optionBuilder);
		} else if (optionBuilder.type === ApplicationCommandOptionType.Channel) {
			this.builder = this.builder.addChannelOption(optionBuilder);
		} else if (optionBuilder.type === ApplicationCommandOptionType.Integer) {
			this.builder = this.builder.addIntegerOption(optionBuilder);
		} else if (optionBuilder.type === ApplicationCommandOptionType.Mentionable) {
			this.builder = this.builder.addMentionableOption(optionBuilder);
		} else if (optionBuilder.type === ApplicationCommandOptionType.Number) {
			this.builder = this.builder.addNumberOption(optionBuilder);
		} else if (optionBuilder.type === ApplicationCommandOptionType.Role) {
			this.builder = this.builder.addRoleOption(optionBuilder);
		} else if (optionBuilder.type === ApplicationCommandOptionType.String) {
			this.builder = this.builder.addStringOption(optionBuilder);
		} else if (optionBuilder.type === ApplicationCommandOptionType.User) {
			this.builder = this.builder.addUserOption(optionBuilder);
		}
	}

	/** @internal */
	setSubcommands(subcommands: Command<string, SlashCommandSubcommandBuilder>[]) {
		if (!(this.builder instanceof SlashCommandBuilder)) {
			throw new Error("Subcommands can only be set on a SlashCommandBuilder");
		}

		this.subcommands = subcommands.reduce(
			(acc, subcommand) => ({
				...acc,
				[subcommand.name]: subcommand
			}),
			{}
		);
	}

	/** @internal */
	setHandler(handler: GenericCommandHandler) {
		this.handler = handler;
	}
}

export function command<Name extends string, Options extends OptionDefinitions>(command: {
	/**
	 * Metadata for this command.
	 */
	meta: CommandMeta<Name>;
	/**
	 * Options for the command.
	 *
	 * Examples:
	 *
	 * ```
	 * options: {}
	 * options: { message: o.string() }
	 * options: { message: o.string().union(o.choice("hello"), o.choice("world")) }
	 * options: { message: o.string(), count: o.integer() }
	 * ```
	 */
	options?: Options;
	/**
	 * The implementation for this command.
	 */
	handler: (
		ctx: CommandCtx,
		...args: ArgsArrayForOptions<Options>
	) => MaybePromise<ReturnResult<any, any>>;
}): Command<Name, SlashCommandBuilder>;
export function command<Name extends string>(command: {
	/**
	 * Metadata for this command.
	 */
	meta: CommandMeta<Name>;
	/**
	 * Subcommands for the command.
	 */
	subcommands: Command<string, SlashCommandSubcommandBuilder>[];
	/**
	 * The middleware for this command with subcommands.
	 */
	middleware?: (ctx: CommandCtx) => MaybePromise<ReturnResult<boolean, any>>;
}): Command<Name, SlashCommandBuilder>;
export function command<Name extends string, Options extends OptionDefinitions>(
	data: {
		meta: CommandMeta<Name>;
	} & (
		| {
				options?: Options;
				handler: (
					ctx: CommandCtx,
					...args: ArgsArrayForOptions<Options>
				) => MaybePromise<ReturnResult<any, any>>;
		  }
		| {
				subcommands: Command<string, SlashCommandSubcommandBuilder>[];
				middleware?: (ctx: CommandCtx) => MaybePromise<ReturnResult<boolean, any>>;
		  }
	)
): Command<Name, SlashCommandBuilder> {
	const command = new Command(new SlashCommandBuilder(), data.meta);

	if ("options" in data && data.options) {
		command.setOptions(data.options);
		command.setHandler(data.handler);
	} else if ("subcommands" in data) {
		command.setSubcommands(data.subcommands);
		if (data.middleware) {
			command.setHandler(data.middleware);
		}
	}

	return command;
}

export function subcommand<Name extends string, Options extends OptionDefinitions>(command: {
	/**
	 * Metadata for this command.
	 */
	meta: SubcommandMeta<Name>;
	/**
	 * Options for the command.
	 *
	 * Examples:
	 *
	 * ```
	 * options: {}
	 * options: { message: o.string() }
	 * options: { message: o.string().union(o.choice("hello"), o.choice("world")) }
	 * options: { message: o.string(), count: o.integer() }
	 * ```
	 */
	options?: Options;
	/**
	 * The implementation for this command.
	 */
	handler: (
		ctx: CommandCtx,
		...args: ArgsArrayForOptions<Options>
	) => MaybePromise<ReturnResult<any, any>>;
}): Command<Name, SlashCommandSubcommandBuilder> {
	const subcommand = new Command(new SlashCommandSubcommandBuilder(), command.meta);
	if (command.options) {
		subcommand.setOptions(command.options);
	}
	subcommand.setHandler(command.handler);

	return subcommand;
}

export type CommandFilter = (
	interaction: ChatInputCommandInteraction,
	command: Command<string, SlashCommandBuilder>
) => boolean;

type KnownCommandError =
	| Err<
			"OPTION_ERROR",
			{
				error: Error;
			}
	  >
	| Err<
			"INVALID_OPTION_TYPE",
			{
				name: string;
				option: CommandInteractionOption;
			}
	  >
	| Err<
			"MISSING_OPTION",
			{
				name: string;
			}
	  >
	| Err<
			"INVALID_OPTION_VALUE",
			{
				zodError: z.ZodError;
				name: string;
				value: any;
			}
	  >
	| Err<
			"UNKNOWN_COMMAND",
			{
				command: string;
			}
	  >
	| Err<
			"UNKNOWN_SUBCOMMAND",
			{
				subcommand: string;
			}
	  >
	| Err<
			"COMMAND_FAILED",
			{
				command: string;
				error: Error;
			}
	  >;

export type ErrorHandler = (
	ctx: CommandCtx,
	error: KnownCommandError | Err<string & {}, any>
) => void | Promise<void>;
