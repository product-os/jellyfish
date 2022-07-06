import _ from 'lodash';
import React from 'react';
import { CSVLink } from 'react-csv';
import { Box, Modal, Txt } from 'rendition';
import styled from 'styled-components';
import type { Contract, JsonSchema } from 'autumndb';
import { flatten } from 'flat';
import Icon from './Icon';
import { useSetup } from './SetupProvider';

// Style CSV link to match rendition theme
const CSVLinkWrapper = styled(Box)`
	a {
		display: block;
		font-size: 14px;
		color: #00aeef;
		text-decoration: none;
		display: block !important;
		cursor: pointer;
	}
`;

interface HeaderProps {
	query: JsonSchema;
	onDone: () => void;
}

interface CSVData {
	name: string;
	rows: Array<{ [key: string]: any }>;
	headers: Array<{ label: string; key: string }>;
}

export default React.memo<HeaderProps>((props) => {
	const { query } = props;
	const { sdk } = useSetup()!;
	const [csvData, setCSVData] = React.useState<CSVData | null>(null);

	const load = async () => {
		const limit = 500;
		let data: Contract[] = [];
		while (true) {
			const results = await sdk.query(query, { limit, skip: data.length });
			if (results.length) {
				data = data.concat(results);
			} else if (data.length < limit) {
				break;
			} else {
				break;
			}
		}

		const name = `contracts_${new Date().toISOString()}.csv`;
		const rows = data.map((item) => {
			// To keep the CSV functionality simple, don't include any link data in the output
			const flattened: any = flatten(
				{
					...item,
					links: {},
					linked_at: item.linked_at || {},
				},
				{
					// "safe" option preserves arrays, preventing a new header being created for each tag/marker
					safe: true,
				},
			);
			// react-csv does not correctly escape double quotes in fields, so it has to be done here.
			// Once https://github.com/react-csv/react-csv/pull/287 is resolved, we need to remove this code
			return _.mapValues(flattened, (field) => {
				// escape all non-escaped double-quotes (double double-quotes escape them in CSV)
				return _.isString(field)
					? field.replace(/([^"]|^)"(?=[^"]|$)/g, '$1""')
					: field;
			});
		});

		const headers = rows.length
			? Object.keys(rows[0]).map((key) => {
					return {
						key,
						label: key,
					};
			  })
			: [];

		setCSVData({
			name,
			headers,
			rows,
		});
	};
	React.useEffect(() => {
		load();
	}, []);

	return (
		<Modal
			title="Download data as CSV"
			done={props.onDone}
			cancel={props.onDone}
			primaryButtonProps={{ style: { display: 'none' } }}
		>
			{!csvData && (
				<Txt>
					Generating CSV... <Icon name="cog" spin />
				</Txt>
			)}
			{!!csvData && (
				<CSVLinkWrapper>
					<CSVLink
						data={csvData.rows}
						headers={csvData.headers as any}
						filename={csvData.name}
					>
						{csvData.name}
					</CSVLink>
				</CSVLinkWrapper>
			)}
		</Modal>
	);
});
