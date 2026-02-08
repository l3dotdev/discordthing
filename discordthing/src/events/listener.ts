import { type ClientEvents } from "discord.js";

import type { GenericCtx } from "../context.js";

type ListenerHandler<Event extends keyof ClientEvents> = (
	ctx: GenericCtx,
	...args: ClientEvents[Event]
) => void | Promise<void>;

export class Listener<Event extends keyof ClientEvents> {
	constructor(
		readonly event: Event,
		readonly handler: ListenerHandler<Event>,
		readonly once: boolean = false
	) {}
}

export function listen<const Event extends keyof ClientEvents>(listener: {
	/**
	 * The type of discord event to listen to.
	 */
	event: Event;
	/**
	 * Whether the event should only be handled once.
	 */
	once?: boolean;
	/**
	 * The handler for the event.
	 */
	handler: (ctx: GenericCtx, ...args: ClientEvents[NoInfer<Event>]) => void | Promise<void>;
}) {
	return new Listener(listener.event, listener.handler, listener.once);
}
