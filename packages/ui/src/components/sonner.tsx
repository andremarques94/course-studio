import {
	CheckCircle2,
	CircleAlert,
	Info,
	Loader2,
	XCircle,
} from "lucide-react";
import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps, toast } from "sonner";

function Toaster({ style, toastOptions, ...props }: ToasterProps) {
	return (
		<Sonner
			position="bottom-right"
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
					...style,
				} as CSSProperties
			}
			icons={{
				success: <CheckCircle2 />,
				info: <Info />,
				warning: <CircleAlert />,
				error: <XCircle />,
				loading: <Loader2 className="animate-spin" />,
			}}
			toastOptions={{
				...toastOptions,
				classNames: {
					toast:
						"group rounded-xl border border-border bg-popover text-popover-foreground shadow-lg",
					description: "text-muted-foreground",
					actionButton: "bg-primary text-primary-foreground",
					cancelButton: "bg-muted text-muted-foreground",
					...toastOptions?.classNames,
				},
			}}
			{...props}
		/>
	);
}

export { Toaster, toast };
