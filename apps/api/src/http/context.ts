import type { Session } from "@course-studio/auth";

export type AppEnv = {
	Variables: {
		requestId: string;
		session: Session;
	};
};
