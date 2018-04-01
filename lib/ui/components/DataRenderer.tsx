import * as _ from 'lodash';
import * as React from 'react';
import { Box, Text } from 'rendition';

interface DataRendererProps {
	data: any;
	labelText?: string[];
}

const DataRenderer = (props: DataRendererProps): JSX.Element => {
	const { data, labelText = [] } = props;

	if (_.isPlainObject(data) || _.isArray(data)) {
		return (
			<React.Fragment>
				{_.map(data, (value, key) => {
					return (
						<DataRenderer key={key} data={value} labelText={labelText.concat(`${key}`)} />
					);
				})}
			</React.Fragment>
		);
	}

	return (
		<Box mb={3}>
			{labelText.length > 0 && <strong>{labelText.join('.')}</strong>}
			<Text>
				{`${data}`}
			</Text>
		</Box>
	);
};

export default DataRenderer;
