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
	type APIApplicationCommandOptionChoice,
	type ApplicationCommandNumericOptionMinMaxValueMixin,
	type ApplicationCommandOptionAllowedChannelTypes,
	type ApplicationCommandOptionBase,
	type ApplicationCommandOptionWithAutocompleteMixin,
	type ApplicationCommandOptionWithChoicesMixin,
	type Attachment,
	type GuildBasedChannel,
	type GuildMember,
	type LocalizationMap,
	type RestOrArray,
	type Role,
	type User
} from "discord.js";
import type * as z from "zod";

export abstract class BaseOption<
	Builder extends ApplicationCommandOptionBase,
	Type,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> {
	/**
	 * Only for Typescript.
	 */
	readonly type!: Type;

	protected builder: Builder;

	constructor(
		builder: Builder,
		readonly isOptional: IsOptional,
		readonly validator: Validator | undefined
	) {
		this.builder = builder.setRequired(isOptional === "optional" ? false : true);
	}

	describe(description: string) {
		this.builder = this.builder.setDescription(description);
		return this;
	}

	localize({ name, description }: { name?: LocalizationMap; description?: LocalizationMap }) {
		this.builder = this.builder
			.setNameLocalizations(name ?? null)
			.setDescriptionLocalizations(description ?? null);
		return this;
	}

	abstract validate<T extends z.ZodType<any, Type>>(validator: T): Option<Type, IsOptional, T>;

	/** @internal */
	getBuilder() {
		return this.builder;
	}

	/** @internal */
	abstract asOptional(): Option<Type, "optional">;
}

export class AttachmentOption<
	Type = Attachment,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> extends BaseOption<SlashCommandAttachmentOption, Type, IsOptional, Validator> {
	constructor(
		builder: SlashCommandAttachmentOption,
		isOptional: IsOptional,
		validator?: Validator
	) {
		super(builder, isOptional, validator);
	}

	validate<T extends z.ZodType<any, Type>>(validator: T) {
		return new AttachmentOption<Type, IsOptional, T>(this.builder, this.isOptional, validator);
	}

	/** @internal */
	asOptional() {
		return new AttachmentOption<Type, "optional">(this.builder, "optional");
	}
}

export class BooleanOption<
	Type = boolean,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> extends BaseOption<SlashCommandBooleanOption, Type, IsOptional, Validator> {
	constructor(builder: SlashCommandBooleanOption, isOptional: IsOptional, validator?: Validator) {
		super(builder, isOptional, validator);
	}

	validate<T extends z.ZodType<any, Type>>(validator: T) {
		return new BooleanOption<Type, IsOptional, T>(this.builder, this.isOptional, validator);
	}

	/** @internal */
	asOptional() {
		return new BooleanOption<Type, "optional">(this.builder, "optional");
	}
}

export class ChannelOption<
	Type = GuildBasedChannel,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> extends BaseOption<SlashCommandChannelOption, Type, IsOptional, Validator> {
	constructor(builder: SlashCommandChannelOption, isOptional: IsOptional, validator?: Validator) {
		super(builder, isOptional, validator);
	}

	narrow<T extends ApplicationCommandOptionAllowedChannelTypes>(channelTypes: T[]) {
		this.builder = this.builder.addChannelTypes(channelTypes);
		return this as ChannelOption<
			Extract<
				GuildBasedChannel,
				{
					type: T;
				}
			>,
			IsOptional
		>;
	}

	validate<T extends z.ZodType<any, Type>>(validator: T) {
		return new ChannelOption<Type, IsOptional, T>(this.builder, this.isOptional, validator);
	}

	/** @internal */
	asOptional() {
		return new ChannelOption<Type, "optional">(this.builder, "optional");
	}
}

abstract class AutocompleteOption<
	Builder extends ApplicationCommandOptionBase & ApplicationCommandOptionWithAutocompleteMixin,
	Type,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> extends BaseOption<Builder, Type, IsOptional, Validator> {
	autocomplete(autocomplete = true) {
		this.builder = this.builder.setAutocomplete(autocomplete);
		return this;
	}
}

export class Choice<Type extends number | string> {
	readonly choice: APIApplicationCommandOptionChoice<Type>;

	constructor(value: Type, name?: string) {
		this.choice = {
			name: name ?? value.toString(),
			value
		};
	}

	localize({ name }: { name?: LocalizationMap }) {
		this.choice.name_localizations = name ?? null;
		return this;
	}
}

type InferChoiceType<T extends ApplicationCommandOptionWithChoicesMixin<any>> =
	T extends ApplicationCommandOptionWithChoicesMixin<infer Type> ? Type : never;

abstract class ChoicesOption<
	Builder extends ApplicationCommandOptionBase &
		ApplicationCommandOptionWithAutocompleteMixin &
		ApplicationCommandOptionWithChoicesMixin<any>,
	Type,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> extends AutocompleteOption<Builder, Type, IsOptional, Validator> {
	abstract union<UnionType extends InferChoiceType<Builder>>(
		...choices: RestOrArray<Choice<UnionType>>
	): Option<UnionType, IsOptional>;
}

abstract class NumbericOption<
	Builder extends ApplicationCommandOptionBase &
		ApplicationCommandNumericOptionMinMaxValueMixin &
		ApplicationCommandOptionWithAutocompleteMixin &
		ApplicationCommandOptionWithChoicesMixin<number>,
	Type = number,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> extends ChoicesOption<Builder, Type, IsOptional, Validator> {
	min(min: number) {
		this.builder = this.builder.setMinValue(min);
		return this;
	}

	max(max: number) {
		this.builder = this.builder.setMaxValue(max);
		return this;
	}
}

export class IntegerOption<
	Type = number,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> extends NumbericOption<SlashCommandIntegerOption, Type, IsOptional, Validator> {
	constructor(builder: SlashCommandIntegerOption, isOptional: IsOptional, validator?: Validator) {
		super(builder, isOptional, validator);
	}

	union<UnionType extends number>(...choices: RestOrArray<Choice<UnionType>>) {
		this.builder = this.builder.addChoices(choices.flat().map((choice) => choice.choice));
		return this as unknown as IntegerOption<UnionType, IsOptional>;
	}

	validate<T extends z.ZodType<any, Type>>(validator: T) {
		return new IntegerOption<Type, IsOptional, T>(this.builder, this.isOptional, validator);
	}

	/** @internal */
	asOptional() {
		return new IntegerOption<Type, "optional">(this.builder, "optional");
	}
}

export class NumberOption<
	Type = number,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> extends NumbericOption<SlashCommandNumberOption, Type, IsOptional, Validator> {
	constructor(builder: SlashCommandNumberOption, isOptional: IsOptional, validator?: Validator) {
		super(builder, isOptional, validator);
	}

	union<UnionType extends number>(...choices: RestOrArray<Choice<UnionType>>) {
		this.builder = this.builder.addChoices(choices.flat().map((choice) => choice.choice));
		return this as unknown as NumberOption<UnionType, IsOptional>;
	}

	validate<T extends z.ZodType<any, Type>>(validator: T) {
		return new NumberOption<Type, IsOptional, T>(this.builder, this.isOptional, validator);
	}

	/** @internal */
	asOptional() {
		return new NumberOption<Type, "optional">(this.builder, "optional");
	}
}

export class MentionableOption<
	Type = User | GuildMember | Role,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> extends BaseOption<SlashCommandMentionableOption, Type, IsOptional, Validator> {
	constructor(
		builder: SlashCommandMentionableOption,
		isOptional: IsOptional,
		validator?: Validator
	) {
		super(builder, isOptional, validator);
	}

	validate<T extends z.ZodType<any, Type>>(validator: T) {
		return new MentionableOption<Type, IsOptional, T>(this.builder, this.isOptional, validator);
	}

	/** @internal */
	asOptional() {
		return new MentionableOption<Type, "optional">(this.builder, "optional");
	}
}

export class RoleOption<
	Type = Role,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> extends BaseOption<SlashCommandRoleOption, Type, IsOptional, Validator> {
	constructor(builder: SlashCommandRoleOption, isOptional: IsOptional, validator?: Validator) {
		super(builder, isOptional, validator);
	}

	validate<T extends z.ZodType<any, Type>>(validator: T) {
		return new RoleOption<Type, IsOptional, T>(this.builder, this.isOptional, validator);
	}

	/** @internal */
	asOptional() {
		return new RoleOption<Type, "optional">(this.builder, "optional");
	}
}

export class StringOption<
	Type = string,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> extends ChoicesOption<SlashCommandStringOption, Type, IsOptional, Validator> {
	constructor(builder: SlashCommandStringOption, isOptional: IsOptional, validator?: Validator) {
		super(builder, isOptional, validator);
	}

	min(min: number) {
		this.builder = this.builder.setMinLength(min);
		return this;
	}

	max(max: number) {
		this.builder = this.builder.setMaxLength(max);
		return this;
	}

	union<UnionType extends string>(...choices: RestOrArray<Choice<UnionType>>) {
		this.builder = this.builder.addChoices(choices.flat().map((choice) => choice.choice));
		return this as unknown as StringOption<UnionType, IsOptional>;
	}

	validate<T extends z.ZodType<any, Type>>(validator: T) {
		return new StringOption<Type, IsOptional, T>(this.builder, this.isOptional, validator);
	}

	/** @internal */
	asOptional() {
		return new StringOption<Type, "optional">(this.builder, "optional");
	}
}

export class UserOption<
	Type = User,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> extends BaseOption<SlashCommandUserOption, Type, IsOptional, Validator> {
	constructor(builder: SlashCommandUserOption, isOptional: IsOptional, validator?: Validator) {
		super(builder, isOptional, validator);
	}

	validate<T extends z.ZodType<any, Type>>(validator: T) {
		return new UserOption<Type, IsOptional, T>(this.builder, this.isOptional, validator);
	}

	/** @internal */
	asOptional() {
		return new UserOption<Type, "optional">(this.builder, "optional");
	}
}

/**
 * A type representing whether an option is optional or not.
 */
export type OptionalType = "required" | "optional";

// prettier-ignore
export type AsOptional<T extends Option<any, OptionalType>> =
	T extends AttachmentOption<infer Type, OptionalType, infer Validator>
		? AttachmentOption<Type, "optional", Validator>
	: T extends BooleanOption<infer Type, OptionalType, infer Validator>
		? BooleanOption<Type, "optional", Validator>
	: T extends ChannelOption<infer Type, OptionalType, infer Validator>
		? ChannelOption<Type, "optional", Validator>
	: T extends IntegerOption<infer Type, OptionalType, infer Validator>
		? IntegerOption<Type, "optional", Validator>
	: T extends NumberOption<infer Type, OptionalType, infer Validator>
		? NumberOption<Type, "optional", Validator>
	: T extends MentionableOption<infer Type, OptionalType, infer Validator>
		? MentionableOption<Type, "optional", Validator>
	: T extends RoleOption<infer Type, OptionalType, infer Validator>
		? RoleOption<Type, "optional", Validator>
	: T extends StringOption<infer Type, OptionalType, infer Validator>
		? StringOption<Type, "optional", Validator>
	: T extends UserOption<infer Type, OptionalType, infer Validator>
		? UserOption<Type, "optional", Validator>
	: never;

export type Option<
	Type,
	IsOptional extends OptionalType = "required",
	Validator extends z.ZodType<any, Type> = z.ZodType<Type, Type>
> =
	| AttachmentOption<Type, IsOptional, Validator>
	| BooleanOption<Type, IsOptional, Validator>
	| ChannelOption<Type, IsOptional, Validator>
	| IntegerOption<Type, IsOptional, Validator>
	| NumberOption<Type, IsOptional, Validator>
	| MentionableOption<Type, IsOptional, Validator>
	| RoleOption<Type, IsOptional, Validator>
	| StringOption<Type, IsOptional, Validator>
	| UserOption<Type, IsOptional, Validator>;
