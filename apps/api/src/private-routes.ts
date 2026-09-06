import type { Auth } from "@course-studio/auth";
import type { Database } from "@course-studio/db";
import { Hono } from "hono";
import type { AppEnv } from "#api/http/context";
import { createRequireAuth } from "#api/http/middleware/require-auth";
import { createRequireTrustedOrigin } from "#api/http/middleware/require-trusted-origin";
import { createCoursesRoutes } from "#api/modules/courses/routes";
import { createCoursesService } from "#api/modules/courses/service";
import type { CourseInvitationDelivery } from "#api/modules/invitations/email";
import {
	createCourseInvitationRoutes,
	createInvitationAcceptanceRoutes,
} from "#api/modules/invitations/routes";
import { createInvitationsService } from "#api/modules/invitations/service";
import { createLessonsRoutes } from "#api/modules/lessons/routes";
import { createLessonsService } from "#api/modules/lessons/service";

export function createPrivateRoutes(
	db: Database,
	options: {
		auth: Auth;
		trustedOrigins: string[];
		webOrigin: string;
		sendCourseInvitation: CourseInvitationDelivery;
	},
) {
	const lessonsService = createLessonsService(db);
	const invitationsService = createInvitationsService(db, {
		webOrigin: options.webOrigin,
		sendInvitation: options.sendCourseInvitation,
	});
	const requireTrustedOrigin = createRequireTrustedOrigin(
		options.trustedOrigins,
	);
	const requireAuth = createRequireAuth(options.auth);
	const coursesRoutes = new Hono<AppEnv>()
		.use("*", requireTrustedOrigin)
		.use("*", requireAuth)
		.route("/", createCoursesRoutes(createCoursesService(db), lessonsService))
		.route("/", createCourseInvitationRoutes(invitationsService));
	const lessonsRoutes = new Hono<AppEnv>()
		.use("*", requireTrustedOrigin)
		.use("*", requireAuth)
		.route("/", createLessonsRoutes(lessonsService));
	const invitationRoutes = new Hono<AppEnv>()
		.use("*", requireTrustedOrigin)
		.use("*", requireAuth)
		.route("/", createInvitationAcceptanceRoutes(invitationsService));

	return new Hono<AppEnv>()
		.route("/courses", coursesRoutes)
		.route("/lessons", lessonsRoutes)
		.route("/invitations", invitationRoutes);
}
