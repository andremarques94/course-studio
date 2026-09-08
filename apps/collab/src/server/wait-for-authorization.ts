import { addAbortListener } from "node:events";

/** Closing a connection rejects its waiting messages, without retaining completed ones. */
export async function waitForAuthorization(
	check: Promise<boolean>,
	signal: AbortSignal,
): Promise<boolean> {
	let subscription: ReturnType<typeof addAbortListener> | undefined;
	const closed = new Promise<never>((_, reject) => {
		subscription = addAbortListener(signal, () => reject(signal.reason));
	});
	try {
		const authorized = await Promise.race([check, closed]);
		signal.throwIfAborted();
		return authorized;
	} finally {
		subscription?.[Symbol.dispose]();
	}
}
