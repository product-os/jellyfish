import { JSONSchema7 } from "json-schema";
import { AutoUIRawModel } from "rendition";
import _ from "lodash";

export const model = (contract, defaultSchema) => {
	const properties = Object.entries({
		uuid: defaultSchema.properties.id,
		..._.omit(defaultSchema.properties, "id"),
		...contract.data.schema.properties.data.properties,
		tags: contract.data.schema.properties.tags,
	}).reduce((accumulatorSchema, [key, value]) => {
		const schema = value as JSONSchema7;
		if (
			!schema ||
			schema.format === "mermaid" ||
			schema.format === "markdown"
		) {
			return accumulatorSchema;
		}
		accumulatorSchema[key] = {
			...schema,
			title: schema.title || key,
			format: (key !== "created_at" && schema.format) || schema.title || key,
		};
		return accumulatorSchema;
	}, {});
	const [firstProperty, ...otherProperties] = Object.keys(properties);

	console.log("*** properties", properties);

	return {
		resource: contract.slug,
		schema: {
			type: "object",
			required: [],
			properties: properties,
		},
		permissions: {
			default: {
				read: [firstProperty, ...otherProperties],
				create: [],
				update: [firstProperty, ...otherProperties],
				delete: false,
			},
		},
		priorities: {
			primary: [firstProperty],
			secondary: otherProperties,
			tertiary: [],
		},
	} as AutoUIRawModel<any>;
};

export const transformers = {
	__permissions: (_entity, context) => context.model.permissions["default"],
	uuid: (entity) => entity.id,
	category: (entity) => entity["data.category"],
	reporter: (entity) => entity["data.reporter"],
	flowdockThreadUrl: (entity) => entity["data.flowdockThreadUrl"],
	tags: (entity) =>
		Object.entries(entity)
			.filter((property) => property[0].includes("tags."))
			.map((property) => property[1]),
};
