import * as Bluebird from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import {
	Fixed,
	Modal,
	ProgressBar,
	SchemaSieve,
	Select,
} from 'rendition';
import {
	Form
} from 'rendition/dist/unstable';
import { sdk } from '../core';

const DELIMITER = '___';

interface GroupUpdateProps {
	schema: JSONSchema6;
	cards: Array<{ id: string; }>;
	onClose: () => void;
}

interface GroupUpdateState {
	flatSchema?: JSONSchema6;
	selectedField?: string;
	updateData: any;
	processing: boolean;
	processingProgress: number;
}

export class GroupUpdate extends React.Component<GroupUpdateProps, GroupUpdateState> {
	constructor(props: GroupUpdateProps) {
		super(props);

		this.state = {
			updateData: {},
			processing: false,
			processingProgress: 0,
		};
	}

	public componentDidMount() {
		this.setSchema(this.props.schema);
	}

	public setSchema = (schema: JSONSchema6) => {
		const flatSchema = SchemaSieve.flattenSchema(schema, DELIMITER);

		// Remove known metadata properties
		if (flatSchema.properties) {
			(flatSchema as any).properties = _.omitBy(
				flatSchema.properties,
				(value) => {
					return _.includes(['alertsUser', 'mentionsUser', '$$localSchema'], (value as any).title);
				},
			);
		}

		const selectedField = _.keys(flatSchema.properties).shift()!;

		this.setState({
			flatSchema,
			selectedField,
		});
	}

	public updateCards = () => {
		if (_.isEmpty(this.state.updateData)) {
			return;
		}
		const flattenedKey = _.keys(this.state.updateData).shift()!;
		const keys = _.trimStart(flattenedKey, DELIMITER).split(DELIMITER);
		const update = {};
		_.set(update, keys, this.state.updateData[flattenedKey]);

		this.setState({
			processing: true,
		});

		const length = this.props.cards.length;

		let processed = 0;

		Bluebird.map(this.props.cards, ({ id }) => {
			return sdk.card.update(id, update)
				.then(() => {
					processed++;
					this.setState({
						processingProgress: processed / length * 100,
					});
				});
		}, {
			concurrency: 10,
		})
			.then(() => {
				this.props.onClose();
			});
	}

	public setUpdateData = (data: any) => {
		this.setState({
			updateData: {
				[this.state.selectedField!]: data.formData[this.state.selectedField!],
			},
		});
	}

	public handleFieldChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		this.setState({
			selectedField: event.target.value,
		});
	}

	render() {
		const {
			flatSchema,
			selectedField,
			updateData,
			processing,
			processingProgress,
		} = this.state;
		const { length } = this.props.cards;

		return (
			<Fixed
				z={9}
				top
				right
				bottom
				left
				onClick={this.props.onClose}
			>
				<Modal
					title={`Updating ${length} item${length === 1 ? '' : 's'}`}
					cancel={this.props.onClose}
					done={this.updateCards}
					action="Update"
					primaryButtonProps={{
						disabled: _.isEmpty(updateData) || processing,
					}}
				>
					{processing &&
						<React.Fragment>
							<p>Processing updates...</p>
							<ProgressBar
								primary
								value={processingProgress}
							/>
						</React.Fragment>
					}

					{!processing &&
						<React.Fragment>
							<p>Select a field to update:</p>

							{!!flatSchema &&
								<Select
									value={selectedField}
									onChange={this.handleFieldChange}
									mb={3}
								>
									{_.map(flatSchema.properties, (value: any, key) => {
										return (
											<option value={key}>{value.title || key}</option>
										);
									})}
								</Select>
							}

							{!!flatSchema && !!selectedField &&
								<Form
									schema={{
										type: 'object',
										properties: {
											[selectedField]: flatSchema.properties![selectedField] as JSONSchema6,
										},
									}}
									hideSubmitButton
									value={updateData}
									onFormChange={this.setUpdateData}
								/>
							}
						</React.Fragment>
					}
				</Modal>
			</Fixed>
		);
	}
}

