/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as GitHubSDK from '@octokit/rest';
import {
	Auth,
	IssuesGetAllResponseItem as GitHubIssue,
	IssuesGetAllResponseItemRepository as GitHubRepo,
	IssuesGetCommentResponse as GitHubComment,
} from '@octokit/rest';
import { JSONSchema6 } from 'json-schema';
import {
	flatMap,
	forEach,
	includes,
	isString,
} from 'lodash';
import {
	Card,
	Context,
	EvalTemplate,
	JellyfishSession,
} from '../types';
import {
	InsertionRequest,
	MessageTemplate,
} from './types';

module.exports = prepareImport;

/**
 * The github-event types that we parse are 'issues' and
 * 'issue_comment' which both have 'issue' and 'repository' and
 * 'issue_comment' also has 'comment'.
 */
interface GitHubEventPayload {
	comment?: GitHubComment;
	issue: GitHubIssue;
	repository: GitHubRepo;
}

/**
 * A webhook delivered from GitHub will have 'x-github-event' in its
 * headers.
 */
interface GitHubEventHeaders {
	'x-github-event': string;
	[ key: string ]: string;
}

/**
 * The details stored by jellyfish when GitHub delivers it a webhook.
 */
interface GitHubEventCard extends Card {
	data: {
		source: 'github';
		payload: GitHubEventPayload;
		headers: GitHubEventHeaders;
	};
}

/**
 * Calculates a JSON-E insertion matrix from a webhooked event.
 *
 * @param session  ID of the session to use to read data in Jellyfish
 * @param context  Worker context, full of useful methods
 * @param target   Card, created from webhook, that triggered this import
 * @param args     Arguments of the request, as if from the trigger card
 * @returns        Promise that resolves to the events to insert
 */
async function prepareImport(
	session: JellyfishSession,
	context: Context,
	target: GitHubEventCard,
	args: {
		auth?: Auth,
		actorUUID: string | EvalTemplate,
	},
): Promise<InsertionRequest> {
	// Extract some frequently used properties and check the type of
	// payload
	// TODO Defensively code to check that target is GitHubEventCard
	const payload = target.data.payload;
	const eventType = target.data.headers['x-github-event'];
	if (!includes(['issues', 'issue_comment'], eventType)) {
		throw new Error(`${eventType} not supported yet.`);
	}

	// Find out if Jellyfish already knows about the head card
	const headCards = await context.query(
		session,
		makeHeadQuery(payload.issue),
	);
	if (headCards.length === 0) {

		// Authenticate to the SDK if we can, because we get a sensible
		// rate limit and might be accessing private repos
		const sdk = new GitHubSDK();
		if (args.auth) {
			sdk.authenticate(args.auth);
		}

		// Gather the full tail because this is a currently unknown head
		const tailTemplates = await fetchFullTail(
			payload,
			{
				$eval: '0.id',
			},
			args.actorUUID,
			sdk,
		);

		// Specify that Jellyfish should create the head and the full tail
		return [
			{
				active: true,
				links: {},
				tags: [],
				type: 'issue',
				data: payload.issue,
			},
			tailTemplates,
		];

	} else {

		// Create a tail consisting of just the events in this webhook
		const insertCards = flatMap(headCards, (headCard) => {
			return makeShortTail(payload, headCard.id, args.actorUUID);
		});
		// This slightly curious structure is so that JSON-E knows it can
		// insert all of the cards in parallel
		return [ insertCards ];
	}
}

/**
 * Gather from the specified SDK a complete tail, inserting details
 * provided from 'args' on the fly.
 *
 * @param payload  The payload that GitHub delivered
 * @param target   The target property to inject for JSON-E
 * @param actor    The actor property to inject for JSON-E
 * @param sdk      The SDK to query for the comments
 * @returns        A promise that resolves to the tail to write
 */
async function fetchFullTail(
	payload: GitHubEventPayload,
	target: string | EvalTemplate,
	actor: string | EvalTemplate,
	sdk: GitHubSDK,
): Promise<MessageTemplate[]> {
	const issue = payload.issue;
	const events: MessageTemplate[] = [];
	// Enclose a method to append to this array, because we do this a lot
	const appendToEvents = (event: { body: string, created_at: string }) => {
		events.push(makeMessageTemplate(
			event.body,
			event.created_at,
			target,
			actor,
		));
	};
	if (isString(issue.body) && isString(issue.created_at)) {
		appendToEvents({
			body: issue.body,
			created_at: issue.created_at,
		});
	}
	if (!issue.number) {
		throw new Error('Cannot get a tail without specifying an issue number');
	}
	const initialResponse = await sdk.issues.getComments({
		number: issue.number,
		owner: payload.repository.owner.login,
		repo: payload.repository.name,
	});
	forEach(initialResponse.data, appendToEvents);
	let gitHubMangle = {
		// `/node_modules/@octokit/rest/index.d.ts:120` requires `.meta`.
		meta: initialResponse.headers,
		// `/node_modules/@octokit/rest/lib/plugins/pagination/get-page-links.js:4` uses `.header`.
		headers: initialResponse.headers,
		// Yes, I am being serious.
	};
	while (sdk.hasNextPage(gitHubMangle)) {
		const eachResponse = await sdk.getNextPage(gitHubMangle);
		gitHubMangle = {
			meta: eachResponse.headers,
			headers: eachResponse.headers,
		};
		forEach(eachResponse.data, appendToEvents);
	}
	return events;
}

/**
 * Create a query that will get any existing record of this head from
 * Jellyfish
 *
 * @param issue  The issue that we wish to find
 * @returns      JSONSchema query that will find the issue
 */
function makeHeadQuery(issue: GitHubIssue): JSONSchema6 {
	return {
		type: 'object',
		required: [ 'type', 'data' ],
		properties: {
			type: {
				type: 'string',
				const: 'issue',
			},
			data: {
				type: 'object',
				required: [ 'html_url' ],
				properties: {
					html_url: {
						type: 'string',
						const: issue.html_url,
					},
				},
			},
		},
		additionalProperties: true,
	};
}

/**
 * Bundle a message string as a request to insert template
 * @param message    The body string to insert
 * @param timestamp  The timestamp of the message
 * @param target     The head that this message sits under
 * @param actor      The actor that this message should alias under
 * @returns          A message, bundled as a request to insert
 */
function makeMessageTemplate(
	message: string | EvalTemplate,
	timestamp: string | EvalTemplate,
	target: string | EvalTemplate,
	actor: string | EvalTemplate,
): MessageTemplate {
	return {
		active: true,
		links: {},
		tags: [],
		type: 'message',
		data: {
			actor,
			target,
			timestamp,
			payload: {
				message,
			},
		},
	};
}

/**
 * Create a time-line representing just the events in the webhook
 * @param payload  The payload that GitHub delivered
 * @param target   The target property to inject for JSON-E
 * @param actor    The actor property to inject for JSON-E
 * @returns        The events to append under the existing head
 */
function makeShortTail(
	payload: GitHubEventPayload,
	target: string | EvalTemplate,
	actor: string | EvalTemplate,
): MessageTemplate[] {
	if (payload.comment) {
		return [
			makeMessageTemplate(
				payload.comment.body,
				payload.comment.created_at,
				target,
				actor,
			),
		];
	}
	throw new Error('Attempted to summarise an event that is not a comment');
}
