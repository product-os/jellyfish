import * as _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { Box, Divider } from 'rendition';
import { getLens } from '../..';
import type { LensRendererProps } from '../../../types';
import { RouteComponentProps } from 'react-router-dom';
import { core } from '@balena/jellyfish-types';
import { GroupedVirtuoso } from 'react-virtuoso';

interface State {
	isLoadingPage: boolean;
}

export interface StateProps {
	user: core.Contract;
}

export type OwnProps = LensRendererProps;

type Props = RouteComponentProps &
	OwnProps &
	StateProps & {
		getActorHref: (actor: any) => string;
	};

export default function SimpleList(props: Props) {
	const [state, setState] = useState<State>({
		isLoadingPage: false,
	});

	const [tail, setTail] = useState<any>([]);

	useEffect(() => {
		const newItemsCount = props.tail!.length - tail.length;
		if (newItemsCount > 0) {
			setTail(props.tail || []);
		}
	}, [props.tail]);

	const loadMoreContracts = async () => {
		setState({ ...state, isLoadingPage: true });
		await props.nextPage();
		setState({ ...state, isLoadingPage: false });
	};

	const itemContent = (_index, contract) => {
		const { user, channel } = props;

		if (!contract) {
			return <Box p={3}>Loading...</Box>;
		}

		const lens = getLens('snippet', contract, user);

		// Don't show the card if its the head, this can happen on view types
		if (contract.id === _.get(channel, ['data', 'head', 'id'])) {
			return null;
		}

		return (
			<Box>
				<lens.data.renderer card={contract} />
				<Divider
					color="#eee"
					m={0}
					style={{
						height: 1,
					}}
				/>
			</Box>
		);
	};

	return (
		<GroupedVirtuoso
			data={tail}
			endReached={loadMoreContracts}
			itemContent={itemContent}
			overscan={5}
		/>
	);
}
