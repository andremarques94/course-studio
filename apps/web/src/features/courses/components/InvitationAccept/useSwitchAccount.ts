import { useState } from "react";
import { authClient } from "@/features/auth/auth-client";

export function useSwitchAccount() {
	const [signingOut, setSigningOut] = useState(false);

	async function switchAccount() {
		setSigningOut(true);
		try {
			await authClient.signOut();
		} finally {
			window.location.reload();
		}
	}

	return { signingOut, switchAccount };
}
