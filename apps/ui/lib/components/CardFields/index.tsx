import _ from 'lodash';
import React from 'react';
import { Box, Renderer, Txt } from 'rendition';
import { helpers } from '@balena/jellyfish-ui-components';
import {
	getUiSchema,
	jsonSchemaFns,
	UI_SCHEMA_MODE,
} from '../../lens/schema-util';

export default function CardFields({
	card,
	type,
	viewMode = UI_SCHEMA_MODE.fields,
}) {
	if (!card || !type) {
		return null;
	}
	const typeSchema = _.get(type, ['data', 'schema']);
	const localSchema = helpers.getLocalSchema(card);

	// Local schemas are considered weak and are overridden by a type schema
	const schema = _.merge(
		{},
		{
			type: 'object',
			properties: {
				data: localSchema,
			},
		},
		typeSchema,
	);

	return (
		<>
			<Box py={2}>
				{!!card.created_at && (
					<Txt>
						<em>Created {helpers.formatTimestamp(card.created_at)}</em>
					</Txt>
				)}

				{!!card.updated_at && (
					<Txt>
						<em>
							Updated{' '}
							{helpers.timeAgo(
								_.get(
									helpers.getLastUpdate(card),
									['data', 'timestamp'],
									card.updated_at,
								) as any,
							)}
						</em>
					</Txt>
				)}
			</Box>

			<Renderer
				value={card}
				schema={schema}
				uiSchema={getUiSchema(type, viewMode)}
				extraContext={{
					root: card,
					fns: jsonSchemaFns,
				}}
				validate={false}
			/>
		</>
	);
}
