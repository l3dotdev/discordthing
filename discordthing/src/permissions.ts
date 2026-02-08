import { err, NONE, Result } from "@l3dev/result";
import {
	BitField,
	PermissionFlagsBits,
	type Guild,
	type GuildChannelResolvable,
	type GuildMember,
	type PermissionResolvable
} from "discord.js";

import type { Bot } from "./bot.js";

export type PermissionName = keyof typeof PermissionFlagsBits;

export type SinglePermissionResolvable = Exclude<PermissionResolvable, any[]>;

export class PermissionsResolver {
	constructor(private readonly bot: Bot) {}

	async checkSelf(
		permissions: SinglePermissionResolvable[],
		guild: Guild,
		channel?: GuildChannelResolvable
	) {
		const member = await Result.fromPromise(guild.members.fetchMe());
		if (!member.ok) return member;

		return this.check(member.value, permissions, channel);
	}

	check(
		member: GuildMember,
		permissions: SinglePermissionResolvable[],
		channel?: GuildChannelResolvable
	) {
		const memberPermissions = channel ? member.permissionsIn(channel) : member.permissions;

		const missingPermissions: PermissionName[] = [];
		for (const permission of permissions) {
			if (!memberPermissions.has(permission, true)) {
				missingPermissions.push(this.resolveName(permission));
			}
		}

		if (missingPermissions.length) {
			return err("MISSING_PERMISSIONS", {
				missingPermissions
			});
		}

		return NONE;
	}

	resolveName(permission: SinglePermissionResolvable): PermissionName {
		const bit = BitField.resolve(permission);

		const entry = Object.entries(PermissionFlagsBits).find(([_, value]) => value === bit);
		if (!entry) {
			throw new Error(`Unknown permission: ${bit}`);
		}

		return entry[0] as PermissionName;
	}
}
