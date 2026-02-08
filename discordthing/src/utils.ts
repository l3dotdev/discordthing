import {
	BitField,
	type BitFieldResolvable,
	type MessageFlags,
	type MessageFlagsString
} from "discord.js";

export function mergeMessageFlags<TFlag extends MessageFlagsString, TType extends MessageFlags>(
	...flags: (BitFieldResolvable<TFlag, TType> | null | undefined)[]
) {
	const mergedFlags: (TFlag | TType | `${bigint}`)[] = [];

	for (const flag of flags) {
		if (!flag) continue;

		if (Array.isArray(flag)) {
			mergedFlags.push(...flag);
		} else if (flag instanceof BitField) {
			mergedFlags.push(flag.bitfield);
		} else {
			mergedFlags.push(flag as TFlag | TType | `${bigint}`);
		}
	}

	return mergedFlags;
}
