import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import {
	Box,
	Button,
	Flex,
	Input,
	Select,
	Txt,
} from 'rendition';
import { Form } from 'rendition/dist/unstable';
import Icon from './Icon';

interface FreeFieldFormProps {
	onSchemaChange: (schema: JSONSchema6) => void;
	onDataChange: (data: { [k: string]: any }) => void;
	data: { [k: string]: any };
	schema: JSONSchema6;
}

interface FreeFieldFormState {
	key: string;
	fieldType: string;
}

export class FreeFieldForm extends React.Component<FreeFieldFormProps, FreeFieldFormState> {
	public readonly dataTypes = [
		{
			key: 'string',
			name: 'String',
			schema: {
				type: 'string',
			},
		},
		{
			key: 'number',
			name: 'Number',
			schema: {
				type: 'number',
			},
		},
		{
			key: 'boolean',
			name: 'Boolean',
			schema: {
				type: 'boolean',
			},
		},
		{
			key: 'date',
			name: 'Date',
			schema: {
				type: 'string',
				format: 'date-time',
			},
		},
		{
			key: 'markdown',
			name: 'Rich text',
			schema: {
				type: 'string',
				format: 'markdown',
			},
		},
		{
			key: 'mermaid',
			name: 'Chart',
			schema: {
				type: 'string',
				format: 'mermaid',
			},
		},
	];

	constructor(props: FreeFieldFormProps) {
		super(props);

		this.state = {
			key: '',
			fieldType: _.first(this.dataTypes)!.key,
		};
	}

	public setFieldTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ key: e.currentTarget.value });
	}

	public setFieldType = (e: React.ChangeEvent<HTMLSelectElement>) => {
		this.setState({ fieldType: e.currentTarget.value });
	}

	public addField = () => {
		const { key, fieldType } = this.state;
		const schema = this.props.schema;
		const subSchema = _.find(this.dataTypes, { key: fieldType })!.schema;
		_.set(schema, [ 'properties', key ], subSchema);

		this.setState({
			key: '',
			fieldType: _.first(this.dataTypes)!.key,
		});

		this.props.onSchemaChange(schema);
	}

	public handleFormChange = (data: any) => {
		this.props.onDataChange(data.formData);
	}

	public render(): React.ReactNode {
		return (
			<Box>
				<Form
					schema={_.cloneDeep(this.props.schema)}
					value={this.props.data}
					onFormChange={this.handleFormChange}
					hideSubmitButton={true}
				/>

				<Flex justify="space-between" pt={60}>
					<Txt mt={9}>Add a new field</Txt>

					<Input
						value={this.state.key}
						onChange={this.setFieldTitle}
						placeholder="Enter the field title"
					/>

					<Select
						value={this.state.fieldType}
						onChange={this.setFieldType}
					>
						{this.dataTypes.map((item) => (
							<option
								key={item.key}
								value={item.key}
							>
								{item.name}
							</option>
						))}
					</Select>

					<Button
						success
						onClick={this.addField}
					>
						<Icon style={{marginRight: 10}} name="plus" />
						Add field
					</Button>
				</Flex>
			</Box>
		);
	}
}
