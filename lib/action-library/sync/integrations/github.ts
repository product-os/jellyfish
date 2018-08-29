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

import * as GithubSDK from '@octokit/rest';
import {
	IssuesGetCommentsParams,
	IssuesGetEventsParams,
	IssuesGetParams,
	MiscGetRepoLicenseParams,
} from '@octokit/rest';
import * as Bluebird from 'bluebird';
import { concat, isString, map, sortBy } from 'lodash';
import * as moment from 'moment';
import * as request from 'request-promise';
import {
	CreatableCard,
	ExternalEventData,
	TimeLine,
} from '../types';
import * as jwt from '../utils/jwt';

export default class GitHubIntegration {
	private static issueParamsFromUrl(
		url: string,
	): IssuesGetParams & IssuesGetEventsParams & IssuesGetCommentsParams {
		const urlParts = url.split('/');
		const issue = parseInt(urlParts[6], 10);
		if (!Number.isFinite(issue)) {
			throw new Error('Issue URL must contain an issue number.');
		}
		const repoDetails = GitHubIntegration.repoParamsFromUrl(url);
		return {
			number: issue,
			owner: repoDetails.owner,
			repo: repoDetails.repo,
			per_page: 100,
		};
	}

	private static repoParamsFromUrl(url: string): MiscGetRepoLicenseParams {
		const urlParts = url.split('/');
		const owner = urlParts[3];
		if (!isString(owner)) {
			throw new Error('Repo URL must contain a repo owner.');
		}
		const repo = urlParts[4];
		if (!isString(repo)) {
			throw new Error('Repo URL must contain a repo id.');
		}
		return { repo, owner };
	}

	private static translateComment(comment: any): CreatableCard {
		return {
			type: 'message',
			data: {
				data: {
					payload: {
						message: comment.body,
					},
				},
			},
		};
	}

	private static translateIssue(issue: any): CreatableCard {
		return {
			type: 'issue',
			data: issue,
		};
	}

	public constructor(
		public app: string,
		private readonly sdk: GithubSDK = new GithubSDK(),
	) {}

	public async authenticate(authKey: string): Promise<void> {
		const jwtBody = {
			iss: this.app,
		};
		const jwtOptions = {
			expiry: 5 * 60, // 50% of 10 minutes, which is GitHub's max.
		};
		const auth = jwt.makeAuthorizationHeader(
			jwtBody,
			authKey,
			jwtOptions,
		);
		const headers = {
			Accept: 'application/vnd.github.machine-man-preview+json',
			Authorization: auth,
			'User-Agent': 'https://github.com/resin-io-modules/jellysync',
		};
		const apps = await request.get({
			headers,
			json: true,
			url: 'https://api.github.com/app/installations',
		});
		if (apps.status >= 300) {
			throw new Error(
				`Authentication, app listing, returned a ${apps.status} error.`,
			);
		}
		const token = await request.post({
			headers,
			json: true,
			url: apps[0].access_tokens_url,
		});
		if (token.status >= 300) {
			throw new Error(
				`Authentication, token request, returned a ${token.status} error.`,
			);
		}
		await this.sdk.authenticate({
			type: 'token',
			token: token.token,
		});
	}

	public async getFullTimeLine(data: ExternalEventData): Promise<TimeLine> {
		const headId = this.getHeadId(data);
		const params = GitHubIntegration.issueParamsFromUrl(headId);
		const details = await Bluebird.props({
			issue: this.sdk.issues.get(params),
			comments: this.sdk.issues.getComments(params),
		});
		if (!isString(details.issue.data.html_url)) {
			throw new Error();
		}
		const head: CreatableCard = GitHubIntegration.translateIssue(details.issue.data);
		const initialEvent: CreatableCard[] = [];
		if (details.issue.data.body) {
			initialEvent.push(GitHubIntegration.translateComment(details.issue.data));
		}
		const sortedEvents = sortBy(details.comments.data, (comment) => {
			return moment(comment.created_at).unix();
		});
		const trailingEvents = map(sortedEvents, (event) => {
			return GitHubIntegration.translateComment(event);
		});
		return {
			head,
			tail: concat(initialEvent, trailingEvents),
		};
	}

	public getHeadId(data: ExternalEventData): string {
		return data.payload.issue.html_url;
	}

	public getTailCards(data: ExternalEventData): CreatableCard[] {
		switch (data.headers['X-GitHub-Event']) {
			case 'issue-comment':
				return [
					GitHubIntegration.translateComment(data.payload.comment),
				];
			default:
				throw new Error(`${data.headers['X-GitHub-Event']} not recognised yet.`);
		}
	}
}
