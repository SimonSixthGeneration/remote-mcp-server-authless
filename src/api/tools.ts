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
}