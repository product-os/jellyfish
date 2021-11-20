import _ from 'lodash';
import * as React from 'react';
import { Box, Button, Txt, Badge } from 'rendition';
import styled from 'styled-components';
import {
	ColorHashPill,
	formatCurrency,
	formatDateLocal,
	helpers,
	Link,
} from '@balena/jellyfish-ui-components';
import SelectWrapper from './SelectWrapper';
import CardTable from '../Table/CardTable';

const SingleLineSpan = styled.span`
	whitespace: 'nowrap';
`;
class CRMTable extends React.Component<any, any> {
	columns;

	constructor(props) {
		super(props);
		this.columns = this.initColumns();
		this.openCreateChannel = this.openCreateChannel.bind(this);
		this.generateTableData = this.generateTableData.bind(this);
	}

	openCreateChannel(item) {
		const { allTypes, activeLoop, actions, tail } = this.props;
		const accountType = helpers.getType('account', allTypes);
		const opportunity = _.find(tail, { id: item.id });
		if (!opportunity) {
			console.warn(`Could not find opportunity ${item.id}`);
			return;
		}
		actions.addChannel({
			head: {
				types: accountType,
				seed: {
					markers: opportunity.markers,
					loop: opportunity.loop || activeLoop,
				},
				onDone: {
					action: 'link',
					targets: [opportunity],
				},
			},
			format: 'create',
			canonical: false,
		});
	}

	initColumns() {
		return [
			{
				field: 'Opportunity',
				sortable: true,
				render: (value, item) => {
					return (
						<Link to={helpers.appendToChannelPath(this.props.channel, item)}>
							{value}
						</Link>
					);
				},
			},
			{
				field: 'Account',
				sortable: true,
				render: (account, item) => {
					if (!account) {
						return (
							<Button
								mr={2}
								success
								// TODO: This should open a linked account create modal
								onClick={() => this.openCreateChannel(item)}
							>
								Add new linked Account
							</Button>
						);
					}

					return (
						<Box>
							<Link
								to={helpers.appendToChannelPath(this.props.channel, account)}
							>
								{account.name}
							</Link>
							<Txt color="text.light" fontSize="0">
								{_.get(account, ['data', 'type'])}
							</Txt>
						</Box>
					);
				},
			},
			{
				field: 'Due Date',
				sortable: true,
				render: (value, item) => {
					if (!value) {
						return '';
					}
					const date = Date.parse(value);
					const due =
						new Date(date).valueOf() <= new Date(Date.now()).valueOf();
					const formattedDate = formatDateLocal(date);

					if (value && due) {
						return (
							<SingleLineSpan>
								<Badge data-test="due-date" shade={5}>
									{`Due: ${formattedDate}`}
								</Badge>
							</SingleLineSpan>
						);
					}

					const noWrapBadge = (
						<SingleLineSpan>
							<Badge data-test="due-date" shade={11}>
								{formattedDate}
							</Badge>
						</SingleLineSpan>
					);

					return value ? noWrapBadge : '';
				},
			},
			{
				field: 'Value',
				sortable: true,
				render: (value) => {
					return formatCurrency(value);
				},
			},
			{
				field: 'Estimated ARR',
				sortable: true,
				render: (value) => {
					return formatCurrency(value);
				},
			},
			{
				field: 'Stage',
				sortable: true,
				render: (value, item) => <SelectWrapper {...this.props} card={value} />,
			},
			{
				field: 'Account Status',
				sortable: true,
				render: (value) => {
					return <SingleLineSpan>{value}</SingleLineSpan>;
				},
			},
			{
				field: 'Usecase',
				sortable: true,
			},
			{
				field: 'Account Industry',
				sortable: true,
			},
			{
				field: 'Account Location',
				sortable: true,
			},
			{
				field: 'Tags',
				sortable: true,
				render: (tags, item) => {
					if (!tags) {
						return '';
					}
					return tags.map((value, index) => {
						return (
							<ColorHashPill
								key={index}
								value={value}
								mr={2}
								mb={1}
								color={'white'}
							/>
						);
					});
				},
			},
		].map((column: any) => {
			// Default all columns to active, unless there is stored state
			column.active = _.get(
				_.find(this.props.lensState.columns, {
					field: column.field,
				}),
				['active'],
				true,
			);
			return column;
		});
	}

	generateTableData() {
		return this.props.tail
			? _.map(this.props.tail, (opportunity) => {
					const account = _.find(
						_.get(opportunity, ['links', 'is attached to']),
					);

					const update = _.find(
						_.get(opportunity, ['links', 'has attached element']),
						(linkedCard) => {
							return ['update', 'update@1.0.0'].includes(linkedCard.type);
						},
					);

					return {
						id: opportunity.id,
						slug: _.get(opportunity, ['slug']),

						Opportunity: _.get(opportunity, ['name']),
						Account: account,
						'Due Date': _.get(opportunity, ['data', 'dueDate']),
						Value: _.get(opportunity, ['data', 'value']),
						'Estimated ARR': _.get(opportunity, ['data', 'totalValue']),
						Stage: opportunity,
						'Account Status': _.get(account, ['data', 'status']),
						Usecase: _.get(opportunity, ['data', 'usecase']),
						'Device Type': opportunity.data.device,
						'Account Usecase': _.get(account, ['data', 'usecase']),
						'Account Industry': _.get(account, ['data', 'industry']),
						'Account Location': _.get(account, ['data', 'location']),
						Tags: _.get(opportunity, ['tags']),

						'Last updated': _.get(update, ['data', 'timestamp'], null),
					};
			  })
			: null;
	}

	render() {
		return (
			<CardTable
				{...this.props}
				rowKey="slug"
				generateData={this.generateTableData}
				columns={this.columns}
			/>
		);
	}
}

export default CRMTable;
