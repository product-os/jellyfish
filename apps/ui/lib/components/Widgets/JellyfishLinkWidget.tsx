import React from 'react';
import _ from 'lodash';
import { UiOption } from 'rendition/dist/components/Renderer/widgets/ui-options';
import { JsonTypes } from 'rendition/dist/components/Renderer/types';
import { JellyfishLink as Link } from '../';

// This widget wraps the JellyfishLink component.
//
// The JellyfishLink component ensures that relative URLs and URLs on the Jellyfish domain
// are appended to the current URL rather than opening in a new tab.
export const JellyfishLinkWidget = ({
	value,
	schema,
	uiSchema,
	extraContext,
	extraFormats,
	...props
}) => {
	let href = _.get(props, ['href'], value.toString());
	if (_.get(schema, ['format']) === 'email') {
		href = `mailto:${href.replace(/^mailto:/, '')}`;
	}
	return (
		<Link {...props} href={href}>
			{value.toString()}
		</Link>
	);
};

JellyfishLinkWidget.displayName = 'JellyfishLink';

JellyfishLinkWidget.uiOptions = {
	blank: UiOption.boolean,
	download: UiOption.string,
	href: UiOption.string,
	rel: UiOption.string,
	type: UiOption.string,
};

JellyfishLinkWidget.supportedTypes = [JsonTypes.string];
