import nodemailer from "nodemailer";
import type { loadEnv } from "#api/env";

export function createVerificationEmailSender(env: ReturnType<typeof loadEnv>) {
	const smtp = env.smtp;
	if (!smtp) {
		if (env.nodeEnv === "production") {
			throw new Error("Email verification requires SMTP in production.");
		}
		// Local development only. Never log bearer verification links in production.
		return async ({ url }: { user: { email: string }; url: string }) => {
			console.info("Development email verification link:", url);
		};
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
	return async ({ user, url }: { user: { email: string }; url: string }) => {
		await transport.sendMail({
			from: smtp.from,
			to: user.email,
			subject: "Verify your Course Studio email",
			text: `Verify your email to finish creating your Course Studio account:\n\n${url}\n\nIf you did not request this, ignore this email.`,
		});
	};
}
