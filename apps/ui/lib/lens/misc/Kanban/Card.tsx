import * as React from 'react';
import { Card as RenditionCard } from 'rendition';

export const Card = (props) => {
	const contract = props.card;
	const { getLenses } = require('../../');
	const lenses = getLenses('snippet', contract);
	const snippetLens = lenses[0];
	return (
		<RenditionCard p={0} style={{ maxWidth: 256 }}>
			<snippetLens.data.renderer card={contract} />
		</RenditionCard>
	);
};
