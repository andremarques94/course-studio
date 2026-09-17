import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
	courseInvitations,
	courseMembers,
	courses,
	createDatabase,
	user,
} from "@course-studio/db";
import { and, eq, inArray } from "drizzle-orm";
import type { CourseInvitationDelivery } from "#api/modules/invitations/email";
import { InvitationDeliveryError } from "#api/modules/invitations/errors";
import { createInvitationsService } from "#api/modules/invitations/service/index";
import { hashInvitationToken } from "#api/modules/invitations/token";

const databaseUrl = process.env.DATABASE_URL;
type Delivery = Parameters<CourseInvitationDelivery>[0];

for (const operation of ["create", "resend"] as const) {
	for (const outcome of ["restore", "accept", "revoke", "replace"] as const) {
		test(`${operation} delivery failure respects concurrent ${outcome}`, {
			skip: databaseUrl ? false : "DATABASE_URL is not set",
			timeout: 20_000,
		}, async () => {
			if (!databaseUrl) {
				return;
			}
			const db = createDatabase(databaseUrl);
			const ownerId = randomUUID();
			const recipientId = randomUUID();
			const email = `${recipientId}@example.com`;
			const courseId = randomUUID();
			let duringDelivery: ((delivery: Delivery) => Promise<void>) | undefined;
			const service = createInvitationsService(db, {
				webOrigin: "http://localhost:3000",
				sendInvitation: async (delivery) => {
					if (duringDelivery) {
						await duringDelivery(delivery);
						throw new Error("Simulated delivery failure");
					}
				},
			});
			try {
				await db.insert(user).values([
					{
						id: ownerId,
						name: "Owner",
						email: `${ownerId}@example.com`,
						emailVerified: true,
					},
					{ id: recipientId, name: "Recipient", email, emailVerified: true },
				]);
				await db
					.insert(courses)
					.values({ id: courseId, ownerId, title: "Rollback", slug: courseId });
				const invitation = await service.create(ownerId, courseId, {
					email,
					role: "viewer",
				});
				const [before] = await db
					.select()
					.from(courseInvitations)
					.where(eq(courseInvitations.id, invitation.id));
				assert.ok(before);
				let attemptedHash: string | undefined;
				const replacementHash = hashInvitationToken(randomUUID());
				duringDelivery = async (delivery) => {
					const token = new URL(delivery.url).searchParams.get("token");
					assert.ok(token);
					attemptedHash = hashInvitationToken(token);
					if (outcome === "accept") {
						await service.accept(recipientId, email, true, token);
					} else if (outcome === "revoke") {
						await service.revoke(ownerId, courseId, invitation.id);
					} else if (outcome === "replace") {
						// Model a replacement committed by another process during delivery.
						await db
							.update(courseInvitations)
							.set({ tokenHash: replacementHash, role: "viewer" })
							.where(eq(courseInvitations.id, invitation.id));
					}
				};
				await assert.rejects(
					operation === "create"
						? service.create(ownerId, courseId, { email, role: "editor" })
						: service.resend(ownerId, courseId, invitation.id),
					InvitationDeliveryError,
				);
				const [after] = await db
					.select()
					.from(courseInvitations)
					.where(eq(courseInvitations.id, invitation.id));
				assert.ok(after);
				assert.ok(attemptedHash);
				assert.notEqual(attemptedHash, before.tokenHash);
				if (outcome === "restore") {
					assert.deepEqual(after, before);
				} else if (outcome === "replace") {
					assert.equal(after.tokenHash, replacementHash);
					assert.equal(after.role, "viewer");
				} else {
					assert.equal(after.tokenHash, attemptedHash);
					assert.ok(outcome === "accept" ? after.acceptedAt : after.revokedAt);
					if (outcome === "accept") {
						const [member] = await db
							.select()
							.from(courseMembers)
							.where(
								and(
									eq(courseMembers.courseId, courseId),
									eq(courseMembers.userId, recipientId),
								),
							);
						assert.equal(
							member?.role,
							operation === "create" ? "editor" : "viewer",
						);
					}
				}
			} finally {
				await db.delete(courses).where(eq(courses.id, courseId));
				await db.delete(user).where(inArray(user.id, [ownerId, recipientId]));
				await db.$client.end();
			}
		});
	}
}
