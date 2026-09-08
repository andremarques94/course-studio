import { createSmtpEmailSender, escapeHtml } from "#api/email";
import type { loadEnv } from "#api/env";

export function createVerificationMessage(url: string) {
	const safeUrl = escapeHtml(url);

	return {
		subject: "Verify your email | Course Studio",
		text: `You're one click away from your Course Studio workspace.\n\nVerify your email to start shaping lessons, slides, and course material:\n\n${url}\n\nIf you didn't create a Course Studio account, you can safely ignore this email.`,
		html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verify your Course Studio email</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-shell { padding: 0 20px !important; }
      .email-main { padding: 52px 0 44px !important; }
      .email-heading { font-size: 38px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#ffffff; color:#18181b; font-family:Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">Confirm your address and open your Course Studio workspace.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-shell" style="max-width:640px;">
          <tr>
            <td style="padding:22px 0; border-bottom:1px solid #e4e4e7;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-right:10px;">
                    <table role="presentation" width="24" height="24" cellspacing="0" cellpadding="0" border="0" style="width:24px; height:24px; border:1px solid #64a5ba; border-radius:5px; background:#eff8fa;">
                      <tr><td style="padding:4px;">
                        <table role="presentation" width="14" height="14" cellspacing="0" cellpadding="0" border="0">
                          <tr><td width="4" height="4" bgcolor="#287f9f" style="font-size:0; line-height:0; border-radius:1px;">&nbsp;</td><td width="5"></td><td width="4"></td></tr>
                          <tr><td height="5"></td><td width="4" height="4" bgcolor="#287f9f" style="font-size:0; line-height:0; border-radius:1px;">&nbsp;</td><td></td></tr>
                          <tr><td></td><td></td><td width="4" height="4" bgcolor="#287f9f" style="font-size:0; line-height:0; border-radius:1px;">&nbsp;</td></tr>
                        </table>
                      </td></tr>
                    </table>
                  </td>
                  <td style="color:#18181b; font-size:15px; font-weight:700; letter-spacing:-0.2px;">Course Studio</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-main" style="padding:72px 0 56px;">
              <p style="margin:0 0 24px; color:#287f9f; font-family:'SFMono-Regular', Consolas, 'Liberation Mono', monospace; font-size:10px; letter-spacing:1px; text-transform:uppercase;">01&nbsp;&nbsp;/&nbsp;&nbsp;Email verification</p>
              <h1 class="email-heading" style="margin:0; color:#09090b; font-size:48px; font-weight:700; letter-spacing:-2.4px; line-height:1.02;">Verify your email,<br><span style="color:#71717a; font-weight:500;">then open the studio.</span></h1>
              <p style="max-width:500px; margin:28px 0 30px; color:#71717a; font-size:17px; letter-spacing:-0.2px; line-height:1.6;">Confirm your address to start building structured lessons, previewing every slide, and presenting from the same source.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius:5px; background:#287f9f;">
                    <a href="${safeUrl}" style="display:inline-block; padding:12px 16px; color:#ffffff; font-size:14px; font-weight:700; line-height:1; text-decoration:none;">Verify email&nbsp;&nbsp;&rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 0; border-top:1px solid #e4e4e7; border-bottom:1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="36" valign="top" style="padding-top:2px; color:#287f9f; font-family:'SFMono-Regular', Consolas, 'Liberation Mono', monospace; font-size:9px; letter-spacing:0.8px;">LINK</td>
                  <td>
                    <p style="margin:0 0 5px; color:#18181b; font-size:13px; font-weight:700;">Button not working?</p>
                    <p style="margin:0; overflow-wrap:anywhere; word-break:break-word; color:#71717a; font-family:'SFMono-Regular', Consolas, 'Liberation Mono', monospace; font-size:10px; line-height:1.6;"><a href="${safeUrl}" style="color:#71717a; text-decoration:underline;">${safeUrl}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 0 36px; color:#71717a; font-size:11px; line-height:1.6;">If you didn't create a Course Studio account, you can safely ignore this email.</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
	};
}

export function createVerificationEmailSender(env: ReturnType<typeof loadEnv>) {
	const sendEmail = createSmtpEmailSender(env);
	if (!sendEmail) {
		if (env.nodeEnv === "production") {
			throw new Error("Email verification requires SMTP in production.");
		}
		// Local development only. Never log bearer verification links in production.
		return async ({ url }: { user: { email: string }; url: string }) => {
			console.info("Development email verification link:", url);
		};
	}
	return async ({ user, url }: { user: { email: string }; url: string }) => {
		const message = createVerificationMessage(url);
		await sendEmail({
			to: user.email,
			...message,
		});
	};
}
