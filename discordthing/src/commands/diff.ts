import type {
	APIApplicationCommand,
	RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

export function diffCheck({
	prev,
	next
}: {
	prev: Omit<APIApplicationCommand, "dm_permission">;
	next: RESTPostAPIChatInputApplicationCommandsJSONBody;
}) {
	if (next.name !== prev.name) return true;
	if (next.description !== prev.description) return true;
	if ((next.nsfw ?? false) !== (prev.nsfw ?? false)) return true;

	for (const nextOption of next.options ?? []) {
		const prevOption = prev.options?.find((opt) => opt.name === nextOption.name);
		if (!prevOption) return true;

		if (nextOption.type !== prevOption.type) return true;
		if (nextOption.description !== prevOption.description) return true;
		if ((nextOption.required ?? false) !== (prevOption.required ?? false)) return true;

		if (
			((nextOption as { autocomplete?: boolean }).autocomplete ?? false) !==
			((prevOption as { autocomplete?: boolean }).autocomplete ?? false)
		) {
			return true;
		}

		if (!!(nextOption as { choices?: [] }).choices !== !!(prevOption as { choices?: [] }).choices) {
			return true;
		}

		if (
			"choices" in nextOption &&
			"choices" in prevOption &&
			nextOption.choices &&
			prevOption.choices
		) {
			for (const nextChoice of nextOption.choices) {
				const prevChoice = prevOption.choices.find((choice) => choice.name === nextChoice.name);
				if (!prevChoice) return true;

				if (nextChoice.name !== prevChoice.name) return true;
				if (nextChoice.value !== prevChoice.value) return true;
			}
		}
	}

	return false;
}
