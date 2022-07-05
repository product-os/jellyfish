import React from 'react';
import _ from 'lodash';
import { withRouter } from 'react-router-dom';
import { Link as InnerLink } from './Link';
import {
	isRelativeUrl,
	isLocalUrl,
	toRelativeUrl,
} from '../../services/helpers';

export const Link = withRouter(InnerLink);

export const getLinkProps = (href: string) => {
	if (isRelativeUrl(href)) {
		return {
			append: href.replace(/^\//, ''),
		};
	}
	return isLocalUrl(href)
		? {
				append: toRelativeUrl(href).replace(/^\//, ''),
		  }
		: {
				to: href,
				blank: true,
		  };
};

interface JellyfishLinkProps {
	href: string;
}

export const JellyfishLink: React.FunctionComponent<JellyfishLinkProps> = ({
	href,
	...rest
}) => {
	return <Link {...rest} {...getLinkProps(href)} />;
};

export const linkComponentOverride = ({
	blacklist,
}: {
	blacklist?: Array<string | RegExp>;
}) => {
	return ({ href, ...rest }: React.PropsWithChildren<JellyfishLinkProps>) => {
		if (
			href &&
			_.some(blacklist, (url) => {
				return href.match(url);
			})
		) {
			return null;
		}
		return <JellyfishLink {...rest} href={href} />;
	};
};
