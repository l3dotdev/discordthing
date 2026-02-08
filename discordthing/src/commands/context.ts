import { err, Result, type Err, type Ok } from "@l3dev/result";
import type {
	ChatInputCommandInteraction,
	InteractionEditReplyOptions,
	InteractionReplyOptions,
	Message,
	MessagePayload,
	MessageResolvable
} from "discord.js";

import type { Bot } from "../bot.js";
import { createGenericContext, type GenericCtx } from "../context.js";
import type { Expand } from "../utility-types.js";

type ReplyPosition = number | "@original" | "@last";

export type CommandCtx = Expand<
	GenericCtx & {
		interaction: ChatInputCommandInteraction;
		replies: readonly Message[];
		reply(
			options: string | MessagePayload | InteractionReplyOptions
		): Promise<Ok<Message> | Err<"COMMAND_REPLY", { error: Error }>>;
		editReply(
			options: string | MessagePayload | InteractionEditReplyOptions
		): Promise<
			Ok<Message> | Err<"COMMAND_NOT_REPLIED", null> | Err<"COMMAND_EDIT_REPLY", { error: Error }>
		>;
		deleteReply(
			message: MessageResolvable | ReplyPosition
		): Promise<
			| Ok<void>
			| Err<"COMMAND_NOT_REPLIED", null>
			| Err<"COMMAND_REPLY_NOT_FOUND", { message: MessageResolvable | ReplyPosition }>
			| Err<"COMMAND_DELETE_REPLY", { error: Error }>
		>;
	}
>;

export function createCommandContext(
	bot: Bot,
	interaction: ChatInputCommandInteraction
): CommandCtx {
	const replies: Message[] = [];

	return {
		...createGenericContext(bot),
		interaction,
		replies: replies as readonly Message[],
		async reply(options: string | MessagePayload | InteractionReplyOptions) {
			let promise;
			if (interaction.replied || interaction.deferred) {
				promise = interaction.followUp(options);
			} else {
				promise = interaction.reply(options).then((response) => response.fetch());
			}

			const result = await Result.fromPromise(promise, {
				onError: { type: "COMMAND_REPLY" }
			});

			if (!result.ok) {
				return result;
			}

			replies.push(result.value);
			return result;
		},
		async editReply(options: string | MessagePayload | InteractionEditReplyOptions) {
			if (!interaction.deferred && !interaction.replied) {
				return err("COMMAND_NOT_REPLIED");
			}

			return await Result.fromPromise(interaction.editReply(options), {
				onError: { type: "COMMAND_EDIT_REPLY" }
			});
		},
		async deleteReply(message: MessageResolvable | ReplyPosition = "@original") {
			if (!interaction.deferred && !interaction.replied) {
				return err("COMMAND_NOT_REPLIED");
			}

			let position: number = -1;
			if (typeof message === "number") {
				const reply = replies[message];
				if (reply) {
					position = message;
					message = reply;
				}
			} else if (message === "@last") {
				const lastPosition = replies.length - 1;
				const reply = replies[lastPosition];
				if (reply) {
					position = lastPosition;
					message = reply;
				}
			} else if (message === "@original") {
				position = 0;
			} else {
				const resolvable = message;
				position = replies.findIndex(
					(reply) => reply.id === (typeof resolvable === "string" ? resolvable : resolvable.id)
				);
			}

			if (position === -1) {
				return err("COMMAND_REPLY_NOT_FOUND", {
					message
				});
			}

			const result = await Result.fromPromise(
				interaction.deleteReply(message as MessageResolvable),
				{
					onError: { type: "COMMAND_DELETE_REPLY" }
				}
			);

			if (result.ok) {
				replies.splice(position, 1);
			}

			return result;
		}
	};
}
