import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createApiClient } from "./client.js";

const EXCLUDED_PACKAGINGS = ["", "GESCHENKVERPAKKING", "DISPLAY"];

export function registerTools(server: McpServer, env: Env) {
	server.registerTool(
		"fetch_products",
		{
			description:
				"Fetches the approved Efficy product set used for product matching in this prototype. Returns relevant beer products with valid packaging and competition beers, and excludes unrelated products such as merchandise or POS items. Use this tool when you need to identify the correct Efficy product for a sales rep instruction.",
			inputSchema: {},
		},
		async () => {
			const client = createApiClient(env);
			try {
				const result = (await client.query([
					{
						"@name": "api",
						"@func": [{ "@name": "query", "key": "8888007" }],
					},
				])) as any;

				const rows =
					result[0]["@func"][0]["#result"]["#data"] as any[];

				const products = rows
					.filter(
						(p: any) =>
							p.R_FAMILY === "Bier concurrentie" ||
							(p.R_FAMILY === "Bier" &&
								!EXCLUDED_PACKAGINGS.includes(p.R_F_PACKAGING)),
					)
					.map((p: any) => ({
						k_product: p.K_PRODUCT,
						name: p.NAME,
						packaging: p.R_F_PACKAGING || null,
						family: p.R_FAMILY,
					}));

				return {
					content: [
						{ type: "text", text: JSON.stringify(products, null, 2) },
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
				};
			}
		},
	);
}