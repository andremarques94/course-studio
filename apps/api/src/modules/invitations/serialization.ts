const defaultMaxKeys = 10_000;

export function createInvitationSerializer(maxKeys = defaultMaxKeys) {
	const tails = new Map<string, Promise<void>>();

	return {
		async run<T>(key: string, operation: () => Promise<T>): Promise<T> {
			while (!tails.has(key) && tails.size >= maxKeys) {
				await Promise.race(tails.values());
			}

			const previous = tails.get(key);
			let release: () => void = () => undefined;
			const tail = new Promise<void>((resolve) => {
				release = resolve;
			});
			tails.set(key, tail);

			await previous;
			try {
				return await operation();
			} finally {
				release();
				if (tails.get(key) === tail) {
					tails.delete(key);
				}
			}
		},
	};
}

export const invitationSerializer = createInvitationSerializer();
