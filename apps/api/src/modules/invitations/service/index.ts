import type { Database } from "@course-studio/db";
import { createCourseAccess } from "#api/modules/courses/access";
import type { CourseInvitationDelivery } from "#api/modules/invitations/email";
import {
	createInvitationRateLimiter,
	type InvitationRateLimits,
} from "#api/modules/invitations/rate-limit";
import { createInvitationAcceptance } from "#api/modules/invitations/service/acceptance";
import { createInvitationMembers } from "#api/modules/invitations/service/members";
import { createPendingInvitations } from "#api/modules/invitations/service/pending";

export function createInvitationsService(
	db: Database,
	options: {
		webOrigin: string;
		sendInvitation: CourseInvitationDelivery;
		rateLimits?: InvitationRateLimits;
	},
) {
	const access = createCourseAccess(db);
	const rateLimiter = createInvitationRateLimiter(options.rateLimits);

	return {
		...createInvitationMembers(db, access),
		...createPendingInvitations(db, access, { ...options, rateLimiter }),
		...createInvitationAcceptance(db),
	};
}

export type InvitationsService = ReturnType<typeof createInvitationsService>;
