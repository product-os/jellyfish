import * as React from 'react';
import { Txt } from 'rendition';

// TODO: implement online status
export const AvailabilityStatusOnline = () => null;

export const AvailabilityStatusOffline = () => (
	<Txt fontSize="12px" align="center">
		Available hours: <br />
		<b>8 am – 12 pm (GMT)</b>
	</Txt>
);

export const AvailabilityStatus = ({
	isSupportAgentOnline,
}: {
	isSupportAgentOnline: boolean;
}) =>
	isSupportAgentOnline ? (
		<AvailabilityStatusOnline />
	) : (
		<AvailabilityStatusOffline />
	);
