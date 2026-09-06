import { type EmailSender, escapeHtml } from "#api/email";

export type CourseInvitationDelivery = (input: {
	to: string;
	url: string;
	courseTitle: string;
	role: "editor" | "viewer";
}) => Promise<void>;

export function createCourseInvitationMessage(input: {
	url: string;
	courseTitle: string;
	role: "editor" | "viewer";
}) {
	const safeUrl = escapeHtml(input.url);
	const safeTitle = escapeHtml(input.courseTitle);
	const safeRole = escapeHtml(input.role);

	return {
		subject: `Invitation to ${input.courseTitle} | Course Studio`,
		text: `You've been invited to join "${input.courseTitle}" as a ${input.role}.\n\nAccept the invitation:\n\n${input.url}\n\nIf you weren't expecting this invitation, you can safely ignore this email.`,
		html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Course invitation</title></head>
<body style="margin:0;padding:32px;background:#ffffff;color:#18181b;font-family:Arial,Helvetica,sans-serif;">
  <main style="max-width:600px;margin:0 auto;">
    <p style="color:#287f9f;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Course Studio invitation</p>
    <h1 style="font-size:32px;line-height:1.15;">Join ${safeTitle}</h1>
    <p style="color:#52525b;line-height:1.6;">You've been invited as a <strong>${safeRole}</strong>.</p>
    <p><a href="${safeUrl}" style="display:inline-block;padding:12px 16px;border-radius:5px;background:#287f9f;color:#ffffff;text-decoration:none;font-weight:700;">Accept invitation</a></p>
    <p style="overflow-wrap:anywhere;color:#71717a;font-size:12px;"><a href="${safeUrl}">${safeUrl}</a></p>
  </main>
</body>
</html>`,
	};
}

export function createCourseInvitationDelivery(
	sendEmail: EmailSender,
): CourseInvitationDelivery {
	return async (input) => {
		await sendEmail({
			to: input.to,
			...createCourseInvitationMessage(input),
		});
	};
}
