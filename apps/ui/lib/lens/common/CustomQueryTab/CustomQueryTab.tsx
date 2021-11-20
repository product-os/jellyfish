import React from 'react';
import { Tab } from 'rendition';
import { helpers } from '@balena/jellyfish-ui-components';
import Segment from '../Segment';

export const CustomQueryTab: React.FunctionComponent<any> = ({
	segment,
	card,
	types,
	actions,
}) => (
	<Tab
		title={segment.title}
		key={segment.title}
		data-test={`card-relationship-tab-${helpers.slugify(segment.title)}`}
	>
		<Segment card={card} segment={segment} types={types} actions={actions} />
	</Tab>
);
