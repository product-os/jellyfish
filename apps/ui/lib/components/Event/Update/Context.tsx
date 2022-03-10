import React from 'react';
import _ from 'lodash';
import { circularDeepEqual } from 'fast-equals';
import { Flex, Txt } from 'rendition';
import { Markdown } from 'rendition/dist/extra/Markdown';
import { linkComponentOverride } from '../../Link';
import Icon from '../../Icon';
import Space from '../../Space';
import * as helpers from '../../../services/helpers';
import ActorMessage from '../ActorMessage';

const componentOverrides = {
	// eslint-disable-next-line id-length
	a: linkComponentOverride({}),
};

const UpdateMessage = ({ actor, updateReason, formattedCreatedAt }: any) => {
	if (updateReason) {
		const updateMessage = `${updateReason} ${formattedCreatedAt}`;
		return (
			<Markdown
				/*@ts-ignore*/
				componentOverrides={componentOverrides}
				ml={2}
			>
				{updateMessage}
			</Markdown>
		);
	}
	return (
		<Txt ml={2}>
			<ActorMessage actor={actor} suffix="updated this" />
			<Space />
			{formattedCreatedAt}
		</Txt>
	);
};

const Context = ({ card, actor }: any) => {
	const updateReason = _.get(card, ['name']);
	const formattedCreatedAt = helpers.formatCreatedAt(card);
	const iconName = updateReason ? 'lightbulb' : 'pencil-alt';
	return (
		<Flex alignItems="center">
			<Icon name={iconName} />
			<UpdateMessage
				actor={actor}
				updateReason={updateReason}
				formattedCreatedAt={formattedCreatedAt}
			/>
		</Flex>
	);
};

export default React.memo(Context, circularDeepEqual);
