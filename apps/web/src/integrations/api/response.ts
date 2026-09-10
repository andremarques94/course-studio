import { z } from "zod";

const errorResponseSchema = z.object({
	error: z.object({ code: z.string(), message: z.string() }),
});

export async function ensureSuccess(response: Response): Promise<void> {
	if (response.ok) {
		return;
	}
	const body = await response.json().catch(() => undefined);
	const parsed = errorResponseSchema.safeParse(body);
	throw new Error(
		parsed.success ? parsed.data.error.message : "The API request failed.",
	);
}

export async function readResponse<T>(
	response: Response,
	schema: z.ZodType<T>,
) {
	await ensureSuccess(response);
	return schema.parse(await response.json());
}
