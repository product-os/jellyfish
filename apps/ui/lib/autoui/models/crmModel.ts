import { AutoUIRawModel } from "rendition";
import _ from "lodash";
import { formatCurrency } from "@balena/jellyfish-ui-components";

export const model = (resource) =>
	({
		resource: resource,
		schema: {
			type: "object",
			required: [],
			properties: {
				Opportunity: { title: "Opportunity", type: "string" },
				Account: {
					title: "Account",
					type: "object",
					properties: {
						name: { title: "name", type: "string" },
						slug: { title: "slug", type: "string" },
						version: { title: "version", type: "string" },
					},
					format: "account",
				},
				"Due Date": { title: "Due Date", type: "string", format: "due-date" },
				Value: { title: "Value", type: "number" },
				"Estimated ARR": { title: "Estimated ARR", type: "number" },
				Stage: {
					title: "Stage",
					type: "object",
					properties: {
						data: {
							title: "data",
							type: "object",
							properties: { status: { title: "status", type: "string" } },
						},
					},
					format: "badge",
				},
				"Account Status": { title: "Account Status", type: "string" },
				Usecase: { title: "Usecase", type: "string" },
				"Account Industry": { title: "Account Industry", type: "string" },
				"Account Location": { title: "Account Location", type: "string" },
				Tags: { title: "Tags", type: "array", format: "tags" },
			},
		},
		permissions: {
			default: {
				read: [
					"Opportunity",
					"Account",
					"Due Date",
					"Value",
					"Estimated ARR",
					"Stage",
					"Account Status",
					"Usecase",
					"Account Industry",
					"Account Location",
					"Tags",
				],
				create: [],
				update: [
					"Opportunity",
					"Account",
					"Due Date",
					"Value",
					"Estimated ARR",
					"Stage",
					"Account Status",
					"Usecase",
					"Account Industry",
					"Account Location",
					"Tags",
				],
				delete: false,
			},
		},
		priorities: {
			primary: ["Opportunity"],
			secondary: [
				"Account",
				"Due Date",
				"Value",
				"Estimated ARR",
				"Stage",
				"Account Status",
				"Usecase",
				"Account Industry",
				"Account Location",
				"Tags",
			],
			tertiary: [],
		},
	} as AutoUIRawModel<any>);

export const transformers = {
	__permissions: (_entity, context) => context.model.permissions["default"],
	Value: (entity) => entity.Value && formatCurrency(entity.Value),
	"Estimated ARR": (entity) =>
		entity["Estimated ARR"] && formatCurrency(entity["Estimated ARR"]),
	Stage: (entity) => entity.Stage.data.status,
};
