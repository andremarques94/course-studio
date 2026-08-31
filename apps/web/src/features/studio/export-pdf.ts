import { type BuiltinThemeId, isBuiltinThemeId } from "@course-studio/themes";
import { isPlainObject } from "remeda";

const PDF_EXPORT_STORAGE_KEY = "course-studio:pdf-export";

export type PdfExportPayload = {
	markdown: string;
	themeId: BuiltinThemeId;
};

export function openPdfExport(payload: PdfExportPayload) {
	try {
		sessionStorage.setItem(PDF_EXPORT_STORAGE_KEY, JSON.stringify(payload));
	} catch {
		window.alert(
			"Course Studio could not prepare this presentation for export.",
		);
		return;
	}

	const exportUrl = new URL("/studio/print?print-pdf", window.location.origin);
	const exportWindow = window.open(exportUrl, "_blank");

	if (!exportWindow) {
		window.location.assign(exportUrl);
		return;
	}

	exportWindow.opener = null;
}

export function readPdfExport(): PdfExportPayload | null {
	let stored: string | null;
	try {
		stored = sessionStorage.getItem(PDF_EXPORT_STORAGE_KEY);
	} catch {
		return null;
	}

	if (!stored) {
		return null;
	}

	try {
		const payload: unknown = JSON.parse(stored);
		if (
			isPlainObject(payload) &&
			typeof payload.markdown === "string" &&
			isBuiltinThemeId(payload.themeId)
		) {
			return {
				markdown: payload.markdown,
				themeId: payload.themeId,
			};
		}
	} catch {
		return null;
	}

	return null;
}
