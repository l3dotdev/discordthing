import { err, NONE, Result } from "@l3dev/result";
import { Events, type Client, type RestOrArray } from "discord.js";

import type { Bot } from "../bot.js";
import type { Listener } from "./listener.js";
import { createGenericContext } from "../context.js";

export type EventsManagerOptions = {
	listeners?: Listener<any>[];
};

export class EventsManager {
	private readonly readyListeners: Listener<"clientReady">[] = [];

	constructor(
		private readonly bot: Bot,
		options: EventsManagerOptions
	) {
		for (const listener of options.listeners ?? []) {
			const result = this.add(listener);
			if (!result.ok) {
				throw new (class extends Error {
					result = result;

					constructor(message: string) {
						super(message);
					}
				})("Error adding listener while initializing events manager");
			}
		}
	}

	/**
	 * Adds event listeners to the bot.
	 * @param listeners The listeners to add
	 * @returns A result indicating whether the listeners were added successfully
	 * @example
	 * bot.events.addMany(myListener1, myListener2);
	 * bot.events.addMany([myListener1, myListener2]);
	 */
	addMany(...listeners: RestOrArray<Listener<any>>) {
		return Result.all(...listeners.flat().map((listener) => this.add(listener)));
	}

	/**
	 * Adds an event listener to the bot.
	 * @param listener The listener to add
	 * @returns A result indicating whether the listener was added successfully
	 * @example
	 * const myListener = listen({
	 * 	event: Events.InteractionCreate,
	 * 	handler: async (ctx, interaction) => {
	 * 		// your code here
	 * 	}
	 * });
	 *
	 * bot.events.add(myListener);
	 */
	add(listener: Listener<any>) {
		if (this.bot.client.isReady()) {
			return err("BOT_ALREADY_STARTED", {
				message: "Cannot add listener after bot has started"
			});
		}

		if (listener.event === Events.ClientReady) {
			this.readyListeners.push(listener);
			return NONE;
		}

		const fn = this.createListenerFn(listener);
		if (listener.once) {
			this.bot.client.once(listener.event, fn);
		} else {
			this.bot.client.on(listener.event, fn);
		}

		return NONE;
	}

	private createListenerFn(listener: Listener<any>) {
		return async (...args: any[]) => {
			const ctx = createGenericContext(this.bot);

			try {
				await listener.handler(ctx, ...args);
			} catch (error) {
				this.bot.logger.error(`Error in listener ${listener.event}:`, error);
			}
		};
	}

	/** @internal */
	async runReadyListeners(client: Client<true>) {
		// Make a copy so we can remove _once_ listeners
		const listeners = [...this.readyListeners];

		await Promise.all(
			listeners.map(async (listener) => {
				const handler = this.createListenerFn(listener);
				await handler(client);

				if (listener.once) {
					const index = this.readyListeners.indexOf(listener);
					if (index === -1) {
						return;
					}

					this.readyListeners.splice(index, 1);
				}
			})
		);
	}
}
