import nodemailer from "nodemailer";
import type { loadEnv } from "#api/env";

export type EmailMessage = {
	to: string;
	subject: string;
	text: string;
	html: string;
};

export type EmailSender = (message: EmailMessage) => Promise<void>;

export function escapeHtml(value: string) {
	return value.replace(
		/[&<>"']/g,
		(character) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#039;",
			})[character] ?? character,
	);
}

export function createSmtpEmailSender(
	env: ReturnType<typeof loadEnv>,
): EmailSender | undefined {
	const smtp = env.smtp;
	if (!smtp) {
		return undefined;
	}

	const transport = nodemailer.createTransport({
		host: smtp.host,
		port: smtp.port,
		secure: smtp.secure,
		requireTLS: env.nodeEnv === "production" && !smtp.secure,
		auth:
			smtp.user && smtp.password
				? { user: smtp.user, pass: smtp.password }
				: undefined,
		connectionTimeout: 10_000,
		greetingTimeout: 10_000,
		socketTimeout: 20_000,
	});

	return async (message) => {
		await transport.sendMail({
			from: { name: "Course Studio", address: smtp.from },
			...message,
		});
	};
}
