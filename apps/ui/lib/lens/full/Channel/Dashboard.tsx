import React from 'react';
import { Flex, Box } from 'rendition';
import Plot from 'react-plotly.js';
import * as _ from 'lodash';
import { withSetup, Setup } from '../../../components/SetupProvider';

interface OwnProps extends Setup {
	filter: any;
}
interface State {
	chartData: any;
}

export default withSetup(
	class App extends React.Component<OwnProps, State> {
		state = {
			chartData: null,
		};
		componentDidMount() {
			const last500Promise = this.props.sdk.query(this.props.filter, {
				limit: 500,
				sortBy: 'created_at',
				sortDir: 'desc',
			});

			Promise.all([
				last500Promise.then((contracts) => {
					const days = _.map(contracts, (c) => c.created_at.split('T')[0]);

					return {
						title: 'Histogram (UTC)',
						data: [
							{
								x: days,
								y: contracts,
								type: 'histogram',
							},
						],
					};
				}),

				last500Promise.then((contracts) => {
					const grouped = _.groupBy(contracts, (c) =>
						new Date(c.created_at).getUTCHours(),
					);
					const buckets = _.keys(grouped).sort();
					const values = _.map(buckets, (key) => {
						return grouped[key].length;
					});

					return {
						title: 'Total created per hour of day (UTC)',
						data: [
							{
								x: buckets,
								y: values,
								type: 'bar',
							},
						],
					};
				}),

				last500Promise.then((contracts) => {
					const grouped = _.groupBy(contracts, (c) =>
						new Date(c.created_at).getUTCDay(),
					);
					const buckets = _.keys(grouped).sort();
					const values = _.map(buckets, (key) => {
						return grouped[key].length;
					});

					return {
						title: 'Total created per day of week (UTC)',
						data: [
							{
								x: buckets,
								y: values,
								type: 'bar',
							},
						],
					};
				}),
			])
				.then((chartData) => {
					this.setState({
						chartData,
					});
				})
				.catch((error) => {
					console.error(error);
				});
		}
		render() {
			const { chartData } = this.state;
			if (!chartData) {
				return null;
			}
			return (
				<Flex flexWrap="wrap" justifyContent="space-around">
					{_.map(chartData, ({ title, data }) => {
						return (
							<Box key={title}>
								<Plot
									data={data}
									layout={{ width: 500, height: 300, title }}
									cofig={{ displayModeBar: false }}
								/>
							</Box>
						);
					})}
				</Flex>
			);
		}
	},
);
