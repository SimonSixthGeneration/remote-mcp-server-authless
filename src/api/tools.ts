import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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

	server.registerTool(
		"fetch_company_products",
		{
			description:
				"Fetches the existing product assortment for the fixed Efficy company K_COMPANY 32920. Returns the current company-product relations so you can determine whether a requested product should be added or updated, and inspect the current introduction status before preparing a proposal.",
			inputSchema: {
				K_COMPANY: z
					.string()
					.describe("The company identifier (e.g. 32920)"),
			},
		},
		async ({ K_COMPANY }) => {
			const client = createApiClient(env);
			try {
				const result = (await client.query([
					{
						"@name": "api",
						"@func": [
							{
								"@name": "query",
								"key": "8888001",
								"param1": Number(K_COMPANY),
							},
						],
					},
				])) as any;

				const rows =
					result[0]["@func"][0]["#result"]["#data"] as any[];

				const products = rows.map((row: any) => ({
					k_product: row.K_PRODUCT,
					k_company: row.K_COMPANY,
					k_relation: row.K_RELATION,
					from_date: row.F_FROM_DATE || null,
					selling_price: row.F_SELLING_PRICE ?? null,
					selling_unity: row.R_F_SELLING_UNITY || null,
					introduction_stage_id: row.F_INTRODUCTION_STAGE ?? null,
					scanned: row.F_SCANNED === "1" || row.F_SCANNED === 1,
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

	server.registerTool(
		"fetch_company_products_with_details",
		{
			description:
				"Fetches the company product assortment for the given K_COMPANY and enriches each row with product details (name, family, packaging) by joining against the full Efficy product catalog. Use this instead of fetch_company_products when you need product names alongside the company-product relation data in a single call.",
			inputSchema: {
				K_COMPANY: z
					.string()
					.describe("The company identifier (e.g. 32920)"),
			},
		},
		async ({ K_COMPANY }) => {
			const client = createApiClient(env);
			try {
				const result = (await client.query([
					{
						"@name": "api",
						"@func": [
							{
								"@name": "query",
								"key": "8888001",
								"param1": Number(K_COMPANY),
							},
						],
					},
					{
						"@name": "api",
						"@func": [{ "@name": "query", "key": "8888007" }],
					},
				])) as any;

				const companyRows =
					result[0]["@func"][0]["#result"]["#data"] as any[];
				const productRows =
					result[1]["@func"][0]["#result"]["#data"] as any[];

				const productMap = new Map<number, any>(
					productRows.map((p: any) => [Number(p.K_PRODUCT), p]),
				);

				const enriched = companyRows.map((row: any) => {
					const product = productMap.get(Number(row.K_PRODUCT));
					return {
						k_product: row.K_PRODUCT,
						k_company: row.K_COMPANY,
						k_relation: row.K_RELATION,
						name: product?.NAME ?? null,
						family: product?.R_FAMILY ?? null,
						packaging: product?.R_F_PACKAGING || null,
						from_date: row.F_FROM_DATE || null,
						selling_price: row.F_SELLING_PRICE ?? null,
						selling_unity: row.R_F_SELLING_UNITY || null,
						introduction_stage_id: row.F_INTRODUCTION_STAGE ?? null,
						scanned: row.F_SCANNED === "1" || row.F_SCANNED === 1,
					};
				});

				return {
					content: [
						{ type: "text", text: JSON.stringify(enriched, null, 2) },
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

	server.registerTool(
		"fetch_introduction_statuses",
		{
			description:
				"Fetches the valid Efficy introduction statuses for PROD_COMP.F_INTRODUCTION_STAGE. Returns the allowed status labels and ids so the agent can map natural-language status wording to a valid Efficy status before preparing a proposal.",
			inputSchema: {},
		},
		async () => {
			const client = createApiClient(env);
			try {
				const result = (await client.query([
					{
						"@name": "api",
						"@func": [
							{
								"@name": "getlookupdata",
								"tableid": "30010",
								"fieldname": "F_INTRODUCTION_STAGE",
							},
						],
					},
				])) as any;

				const statuses = result[0]["@func"][0]["#result"]["#data"];

				return {
					content: [
						{ type: "text", text: JSON.stringify(statuses, null, 2) },
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

	const K_COMPANY = 32920;

	server.registerTool(
		"update_company_products",
		{
			description: [
				"Writes confirmed assortment updates to Efficy for fixed company K_COMPANY 32920.",
				"",
				"Input requirements:",
				"- The parameter `updates` must be an array of objects.",
				"- Each object must use exactly these keys:",
				"  - `k_product` (number, required)",
				"  - `introduction_stage_id` (number, optional, required for internal beers)",
				"  - `k_relation` (number, optional, required when updating an existing relation)",
				"",
				"Do not pass strings.",
				"Do not stringify the array.",
				"Do not rename keys.",
				"Do not send natural language.",
				"",
				"Example valid input:",
				'{ "updates": [{ "k_product": 69, "k_relation": 1863913155, "introduction_stage_id": 5 }] }',
			].join("\n"),
			inputSchema: {
				updates: z
					.array(
						z.object({
							k_product: z.number(),
							k_relation: z.number().optional(),
							introduction_stage_id: z.number().optional(),
						}),
					)
					.describe(
						"Array of confirmed product updates. Each item must contain k_product. Include k_relation when the product already exists for the company. Include introduction_stage_id when a status applies. Omit introduction_stage_id for competition beers when no status applies.",
					),
			},
		},
		async ({ updates }) => {
			const client = createApiClient(env);
			try {
				const operations = updates.map((item, index) => {
					if (
						typeof item !== "object" ||
						item === null ||
						item.k_product == null
					) {
						throw new Error(
							`updates[${index}] must contain k_product`,
						);
					}

					const k_product = Number(item.k_product);
					const hasRelation = item.k_relation != null;
					const hasIntroductionStage =
						item.introduction_stage_id != null;

					if (!k_product) {
						throw new Error(
							`updates[${index}] has invalid k_product`,
						);
					}

					const data: Record<string, unknown> = {
						...(hasIntroductionStage && {
							F_INTRODUCTION_STAGE: Number(
								item.introduction_stage_id,
							),
						}),
					};

					return {
						"@name": "edit",
						"entity": "Comp",
						"key": K_COMPANY,
						"detail": "Prod",
						"detailkey": hasRelation
							? `${k_product}_${Number(item.k_relation)}`
							: `${k_product}_0`,
						"commit": true,
						"closecontext": true,
						"@func": [
							{
								"@name": "update",
								"tableview": 0,
								"@data": data,
							},
						],
					};
				});

				const result = await client.query(operations);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									input: updates,
									operations,
									efficy_response: result,
								},
								null,
								2,
							),
						},
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