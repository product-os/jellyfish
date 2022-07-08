import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { Tab } from 'rendition';
import type { LensRendererProps } from '../../../types';
import type { TypeContract } from 'autumndb';
import TabbedContractLayout from '../../../layouts/TabbedContractLayout';
import { ChildRepos } from './ChildRepos';

export type OwnProps = LensRendererProps;

export interface StateProps {
	types: TypeContract[];
}

type Props = StateProps & OwnProps;

export default class GitHubOrgLens extends React.Component<Props> {
	shouldComponentUpdate(nextProps, nextState) {
		return (
			!circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props)
		);
	}

	render() {
		const { card, channel } = this.props;

		return (
			<TabbedContractLayout
				card={card}
				channel={channel}
				tabs={[
					<Tab title="Repositories">
						<ChildRepos channel={channel} contract={card} />
					</Tab>,
				]}
			/>
		);
	}
}
