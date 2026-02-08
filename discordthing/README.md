# discordthing

## Description

A lightweight framework and collection of plugins for building a discord bot with [`discord.js`](https://www.npmjs.com/package/discord.js)

## Installation

```bash
npm install discordthing
```

```bash
pnpm add discordthing
```

## Create a bot

```ts
import { Bot } from "discordthing";

import { myCommand } from "./say.command";
import { myListener } from "./welcome.event";

const bot = new Bot(
	{
		name: "My bot",
		commands: [myCommand],
		listeners: [myListener]
	},
	{
		intents: ["Guilds", "GuildMembers"]
	}
);

await bot.start(process.env.DISCORD_BOT_TOKEN);
```

### Define a command

```ts
// say.command.ts

import { command } from "discordthing/commands";
import { o } from "discordthing/options";
import { NONE } from "@l3dev/result";

export const myCommand = command({
	meta: {
		name: "say"
	},
	options: {
		message: o.string().describe("The message to say")
	},
	async handler(ctx, args) {
		await ctx.interaction.reply(args.message);

		return NONE;
	}
});
```

### Define an event listener

```ts
// welcome.event.ts

import { listen } from "discordthing/events";
import { Events } from "discord.js";

export const myListener = listen({
	event: Events.GuildMemberAdd,
	async handler(member) {
		const joinChannel = await getJoinChannel(member.guild);

		await joinChannel.send(`Welcome <@${member.user.id}>!`);
	}
});
```
