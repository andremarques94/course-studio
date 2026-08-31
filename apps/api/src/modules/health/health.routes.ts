import { Hono } from "hono";
import type { HealthService } from "./health.service.js";

export function createHealthRoutes(healthService: HealthService) {
	return new Hono()
		.get("/health", (c) => c.json({ status: "ok" as const }))
		.get("/health/db", async (c) =>
			c.json(await healthService.checkDatabase()),
		);
}
