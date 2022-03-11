import _ from 'lodash';
import path from 'path';
import React from 'react';
import {
	LinkProps as RenditionLinkProps,
	Link as RenditionLink,
} from 'rendition';
import { RouteComponentProps } from 'react-router-dom';

export interface LinkProps
	extends Omit<RenditionLinkProps, 'href' | 'onClick'>,
		RouteComponentProps {
	append?: string;
	to?: string;
}

export class Link extends React.Component<LinkProps> {
	constructor(props: LinkProps) {
		super(props);

		this.navigate = this.navigate.bind(this);
	}

	makeUrl() {
		const { append, location, to } = this.props;

		if (to) {
			return to;
		}

		if (append) {
			return path.join(location.pathname, append);
		}

		return '';
	}

	navigate(event: React.MouseEvent) {
		// If control or meta keys are pressed, then use default browser behaviour
		if (event.ctrlKey || event.metaKey) {
			return true;
		}

		const { blank, history } = this.props;

		event.stopPropagation();

		if (blank) {
			return true;
		}

		event.preventDefault();

		const url = this.makeUrl();

		history.push(url);
		return false;
	}

	render() {
		const props = _.omit(this.props, [
			'match',
			'location',
			'history',
			'to',
			'append',
		]);

		const url = this.makeUrl();

		return <RenditionLink {...props} href={url} onClick={this.navigate} />;
	}
}
