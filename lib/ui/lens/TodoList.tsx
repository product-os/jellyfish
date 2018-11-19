import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Button,
	Flex,
	Input,
	Txt,
} from 'rendition';
import { Card, Lens, RendererProps, Type } from '../../Types';
import { analytics, sdk } from '../core';
import { actionCreators, selectors, StoreState } from '../core/store';

interface TodoListState {
	todoMessage: string;
	completedItems: string[];
}

interface TodoListProps extends RendererProps {
	actions: typeof actionCreators;
	type: null | Type;
	user: null | Card;
}

class TodoList extends React.Component<TodoListProps, TodoListState> {
	constructor(props: TodoListProps) {
		super(props);

		this.state = {
			todoMessage: '',
			completedItems: [],
		};
	}

	public handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ todoMessage: e.target.value });
	}

	public handleInputKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter') {
			this.addTodo();
		}
	}

	public handleCheckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const id = e.currentTarget.dataset.id || '';
		const complete = e.currentTarget.checked;

		sdk.card.update(id, {
			type: 'todo',
			data: {
				complete,
			},
		})
			.then(() => {
				analytics.track('element.update', {
					element: {
						type: 'todo',
						id,
					},
				});
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message || error);
			});

		if (complete) {
			this.setState(({ completedItems }) => ({
				completedItems: completedItems.concat(id),
			}));
		} else {
			this.setState(({ completedItems }) => ({
				completedItems: _.pull(completedItems, id),
			}));
		}
	}

	public addTodo = () => {
		sdk.card.create({
			type: 'todo',
			data: {
				actor: this.props.user!.id,
				message: this.state.todoMessage,
			},
		})
			.then(() => {
				analytics.track('element.create', {
					element: {
						type: 'todo',
					},
				});
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message || error);
			});

		this.setState({ todoMessage: '' });
	}

	public render(): React.ReactNode {
		const { tail } = this.props;

		return (
			<React.Fragment>
				<Flex
					p={3}
					style={{borderTop: '1px solid #eee'}}
					justify="space-between"
				>
					<Input
						w="100%"
						mr={3}
						placeholder="What needs to be done?"
						value={this.state.todoMessage}
						onChange={this.handleInputChange}
						onKeyPress={this.handleInputKeyPress}
					/>

					<Button
						success={true}
						onClick={this.addTodo}
						disabled={!this.state.todoMessage}
					>
						Add
					</Button>
				</Flex>

				<Box p={3} flex="1" style={{overflowY: 'auto'}}>
					{!!tail && _.map(tail, (card) => {
						const complete = card.data.complete || _.includes(this.state.completedItems, card.id);
						return (
							<Flex key={card.id} mb={3}>
								<input
									type="checkbox"
									data-id={card.id}
									checked={complete}
									onChange={this.handleCheckChange}
								/>

								<Txt
									ml={2}
									style={{
										textDecoration: complete ? 'line-through' : 'none',
									}}
								>
									{card.data.message}
								</Txt>
							</Flex>
						);
					})}
				</Box>
			</React.Fragment>
		);
	}
}

const mapStateToProps = (state: StoreState) => {
	return {
		user: selectors.getCurrentUser(state),
	};
};

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

const lens: Lens = {
	slug: 'lens-todolist',
	type: 'lens',
	version: '1.0.0',
	name: 'Todo list lens',
	data: {
		renderer: connect(mapStateToProps, mapDispatchToProps)(TodoList),
		icon: 'list-ul',
		type: '*',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					slug: {
						type: 'string',
					},
				},
			},
		},
	},
};

export default lens;
