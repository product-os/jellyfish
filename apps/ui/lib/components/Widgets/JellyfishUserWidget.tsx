import React from 'react';
import _ from 'lodash';
import { UiOption } from 'rendition/dist/components/Renderer/widgets/ui-options';
import { JsonTypes } from 'rendition/dist/components/Renderer/types';
import * as helpers from '../../services/helpers';
import { CardLoader, Link } from '../';

// This widget fetches the user corresponding to the id or slug specified in the value
// and renders a link to the user, displaying the username.
export const JellyfishUserWidget = ({
	value,
	schema,
	uiSchema,
	extraContext,
	extraFormats,
	suffix,
	...props
}) => {
	return (
		<CardLoader id={value} type="user" withLinks={[]}>
			{(user: any): JSX.Element => {
				const tooltipOptions = _.defaults(
					_.pick(props, 'hideUsername', 'hideName', 'hideEmail'),
					{
						hideUsername: true,
					},
				);
				return (
					<Link
						{...props}
						append={_.get(user, ['slug'], value)}
						tooltip={user && helpers.getUserTooltipText(user, tooltipOptions)}
					>
						{user ? helpers.username(user.slug) : value}
						{suffix}
					</Link>
				);
			}}
		</CardLoader>
	);
};

JellyfishUserWidget.displayName = 'JellyfishUser';

JellyfishUserWidget.uiOptions = {
	hideUsername: UiOption.string,
	hideName: UiOption.string,
	hideEmail: UiOption.string,
	suffix: UiOption.string,
};

JellyfishUserWidget.supportedTypes = [JsonTypes.string];
