declare module "reveal.js/reveal.css";
declare module "reveal.js/theme/black.css";

declare module "*.module.css" {
	const content: Record<string, string>;
	export default content;
}
