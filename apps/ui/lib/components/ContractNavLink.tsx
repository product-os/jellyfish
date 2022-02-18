import * as React from 'react';
import { Txt } from 'rendition';
import { helpers, Link } from '@balena/jellyfish-ui-components';
import { Contract } from '@balena/jellyfish-types/build/core';
import { ChannelContract } from '../types';

interface Props {
	channel: ChannelContract;
	contract: Contract;
}

export default function ContractNavLink(props: Props) {
	const { contract, channel } = props;
	const versionSuffix =
		contract.version && contract.version !== '1.0.0'
			? ` v${contract.version}`
			: '';
	// TS-TODO: Fix incorrect typing for channel in helper function
	return (
		<Txt>
			<Link to={helpers.appendToChannelPath(channel as any, contract)}>
				<strong>{contract.name || contract.slug}</strong> {versionSuffix}
			</Link>
		</Txt>
	);
}
