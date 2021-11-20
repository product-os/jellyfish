import React from 'react';
import _ from 'lodash';
import { Helmet } from 'react-helmet';

const PageTitle = ({ siteName, activeChannel, unreadCount }) => {
	const countPrefix = unreadCount ? `(${unreadCount}) ` : '';
	const channelPrefix = React.useMemo(() => {
		const prefix =
			_.get(activeChannel, ['data', 'head', 'name']) ||
			_.get(activeChannel, ['data', 'head', 'slug']) ||
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
