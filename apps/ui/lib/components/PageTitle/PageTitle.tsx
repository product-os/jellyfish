import React from 'react';
import _ from 'lodash';
import { Helmet } from 'react-helmet';
import { ChannelContract } from '../../types';

export interface StateProps {
	activeChannel: ChannelContract | null;
	unreadCount: number;
}

export interface OwnProps {
	siteName: string;
}

type Props = StateProps & OwnProps;

const PageTitle = ({ siteName, activeChannel, unreadCount }: Props) => {
	const countPrefix = unreadCount ? `(${unreadCount}) ` : '';
	const channelPrefix = React.useMemo(() => {
		// 		const prefix = activeChannel.data?.head?.contract?.name ||
		console.log(activeChannel);
		const prefix =
			_.get(activeChannel, ['data', 'head', 'contract', 'name']) ||
			_.get(activeChannel, ['data', 'head', 'contract', 'slug']) ||
			_.get(activeChannel, ['data', 'target'], '');
		return _.truncate(prefix, {
			length: 30,
		});
	}, [activeChannel]);
	const combinedPrefix = `${countPrefix}${channelPrefix}`.trim();
	const title = combinedPrefix ? `${combinedPrefix} | ${siteName}` : siteName;
	return (
		<Helmet>
			<title>{title}</title>
		</Helmet>
	);
};

export default React.memo(PageTitle);
