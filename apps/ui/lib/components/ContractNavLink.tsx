import * as React from 'react';
import { Txt } from 'rendition';
import * as helpers from '../services/helpers';
import { Link } from '.';
import type { Contract } from 'autumndb';
import type { ChannelContract } from '../types';

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
