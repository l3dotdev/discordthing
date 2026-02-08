import {
	SlashCommandAttachmentOption,
	SlashCommandBooleanOption,
	SlashCommandChannelOption,
	SlashCommandIntegerOption,
	SlashCommandMentionableOption,
	SlashCommandNumberOption,
	SlashCommandRoleOption,
	SlashCommandStringOption,
	SlashCommandUserOption,
	type APIApplicationCommandOption
} from "discord.js";
import type * as z from "zod";

import {
	AttachmentOption,
	BooleanOption,
	ChannelOption,
	Choice,
	IntegerOption,
	MentionableOption,
	NumberOption,
	RoleOption,
	StringOption,
	UserOption,
	type AsOptional,
	type Option,
	type OptionalType
} from "./options.js";
import type { Expand } from "../utility-types.js";

export type GenericOption = Option<any, any>;

export function optionsToJson(options: OptionDefinitions): APIApplicationCommandOption[] {
	return Object.entries(options).map(([name, option]) => {
		const builder = option.getBuilder();
		return builder.setName(name).toJSON();
	});
}

/**
 * The option builder.
 *
 * This builder allows you to build options for Discord commands.
 *
 * @public
 */
export const o = {
	/**
	 * A command attachment option.
	 */
	attachment: () => {
		return new AttachmentOption(new SlashCommandAttachmentOption(), "required");
	},

	/**
	 * A command boolean option.
	 */
	boolean: () => {
		return new BooleanOption(new SlashCommandBooleanOption(), "required");
	},

	/**
	 * A command channel option.
	 */
	channel: () => {
		return new ChannelOption(new SlashCommandChannelOption(), "required");
	},

	/**
	 * A choice for a command option.
	 * @param name The name of the choice.
	 * @param value The value of the choice.
	 */
	choice: <T extends number | string>(value: T, name?: string) => {
		return new Choice(value, name);
	},

	/**
	 * A command integer option.
	 */
	integer: () => {
		return new IntegerOption(new SlashCommandIntegerOption(), "required");
	},

	/**
	 * A command number option.
	 */
	number: () => {
		return new NumberOption(new SlashCommandNumberOption(), "required");
	},

	/**
	 * A command mentionable option.
	 */
	mentionable: () => {
		return new MentionableOption(new SlashCommandMentionableOption(), "required");
	},

	/**
	 * A command role option.
	 */
	role: () => {
		return new RoleOption(new SlashCommandRoleOption(), "required");
	},

	/**
	 * A command string option.
	 */
	string: () => {
		return new StringOption(new SlashCommandStringOption(), "required");
	},

	/**
	 * A command user option.
	 */
	user: () => {
		return new UserOption(new SlashCommandUserOption(), "required");
	},

	/**
	 * Allows not specifying an option for a command.
	 * @param option The option to make optional.
	 *
	 * ```ts
	 * {
	 *   requiredOption: o.string(),
	 *   optionalOption: o.optional(o.string())
	 * }
	 * ```
	 */
	optional: <T extends GenericOption>(option: T) => {
		return option.asOptional() as AsOptional<T>;
	}
};

export type OptionDefinitions = Record<string, Option<any, OptionalType>>;

/**
 * Compute the args object type from {@link OptionDefinitions}.
 *
 * @public
 */
export type Args<Options extends OptionDefinitions> = Expand<
	{
		// This `Exclude<..., undefined>` does nothing unless
		// the tsconfig.json option `"exactOptionalPropertyTypes": true,`
		// is used. When it is set it results in a more accurate type.
		// When it is not the `Exclude` removes `undefined` but it is
		// added again by the optional property.
		[Name in OptionalKeys<Options>]?: Exclude<Infer<Options[Name]>, undefined>;
	} & {
		[Name in RequiredKeys<Options>]: Infer<Options[Name]>;
	}
>;

type OptionalKeys<Options extends Record<string, GenericOption>> = {
	[Name in keyof Options]: Options[Name]["isOptional"] extends "optional" ? Name : never;
}[keyof Options];

type RequiredKeys<Options extends Record<string, GenericOption>> = Exclude<
	keyof Options,
	OptionalKeys<Options>
>;

/**
 * Extract the TypeScript type from an option.
 *
 * Example usage:
 * ```ts
 * const option = o.string().union(o.choice("hello"), o.choice("world"));
 * type MyOption = Infer<typeof option>; // "hello" | "world"
 * ```
 * @typeParam T - The type of a {@link Option} constructed with {@link o}.
 *
 * @public
 */
export type Infer<T extends Option<any, OptionalType>> =
	T["validator"] extends z.ZodType<infer Type> ? Type : T["type"];
