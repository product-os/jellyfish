/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import _ from 'lodash';
import { Form } from 'rendition';

const schema: any = {
	type: 'object',
	properties: {
		score: {
			title: 'Score',
			type: 'number',
		},
		comment: {
			title: 'Comment',
			type: 'string',
		},
	},
};

const uiSchema = {
	score: {
		'ui:widget': 'Rating',
	},
	comment: {
		'ui:widget': 'textarea',
		'ui:options': {
			rows: 2,
		},
	},
};

export default function RateStep({ setFlow, flowState: { rating } }) {
	const handleFormChange = React.useCallback(
		({ formData }) => {
			setFlow({
				rating: _.merge(
					{
						score: null,
						comment: '',
					},
					formData,
				),
			});
		},
		[setFlow],
	);

	return (
		<Form
			onFormChange={handleFormChange}
			value={rating}
			hideSubmitButton
			schema={schema}
			uiSchema={uiSchema}
		/>
	);
}
