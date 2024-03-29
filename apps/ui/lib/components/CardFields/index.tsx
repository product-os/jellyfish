import _ from 'lodash';
import React from 'react';
import { Box, Renderer, Txt } from 'rendition';
import * as helpers from '../../services/helpers';
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

	const uiSchema = getUiSchema(type, viewMode);
	const showDates =
		_.isNull(_.get(uiSchema, 'created_at')) &&
		_.isNull(_.get(uiSchema, 'updated_at'))
			? false
			: true;

	return (
		<>
			{showDates && (
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
			)}

			<Renderer
				value={card}
				schema={schema}
				uiSchema={uiSchema}
				extraContext={{
					root: card,
					fns: jsonSchemaFns,
				}}
				validate={false}
			/>
		</>
	);
}
