import { getLogger } from '@balena/jellyfish-logger';
import type {
	ActionPreRequest,
	ActionRequestContract,
	Producer,
	Worker,
} from '@balena/jellyfish-worker';
import { strict as assert } from 'assert';
import type { SessionContract } from 'autumndb';
import errio from 'errio';
import { v4 as isUUID } from 'is-uuid';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';

const logger = getLogger(__filename);

interface FileItem {
	buffer: any;
	name: string;
}

interface FileDetails {
	originalname: string;
	fieldname: string;
	mimetype: string;
	buffer: any;
}

interface ActionFacadeOptions {
	files?: FileDetails[];
}

export class ActionFacade {
	fileStore: any;
	producer: Producer;
	worker: Worker;

	constructor(worker: Worker, fileStore: any) {
		this.fileStore = fileStore;
		this.producer = worker.producer;
		this.worker = worker;
	}

	async processAction(
		context: { [x: string]: any; id: any },
		session: string,
		action: ActionPreRequest,
		options: ActionFacadeOptions = {},
	) {
		// TODO: Drop workaround for context/logContext mismatch
		action.logContext = context;

		const files: FileItem[] = [];

		if (options.files) {
			const id = uuidv4();

			// Upload magic
			options.files.forEach((file) => {
				const name = `${id}.${file.originalname}`;

				_.set(action.arguments as any, ['payload', file.fieldname], {
					name: file.originalname,
					slug: name,
					mime: file.mimetype,
					bytesize: file.buffer.byteLength,
				});

				files.push({
					buffer: file.buffer,
					name,
				});
			});
		}

		const finalRequest = await this.worker.pre(session, action);
		const sessionContract =
			await this.worker.kernel.getContractById<SessionContract>(
				context,
				session,
				session,
			);
		assert(sessionContract);
		const input = isUUID(action.card)
			? {
					id: action.card,
			  }
			: await this.worker.kernel.getContractBySlug(
					context,
					session,
					`${action.card}@latest`,
			  );
		assert(input);
		const actionRequestDate = new Date();
		const actionRequest = await this.worker.insertCard<ActionRequestContract>(
			context,
			this.worker.kernel.adminSession()!,
			this.worker.typeContracts['action-request@1.0.0'],
			{
				timestamp: actionRequestDate.toISOString(),
				actor: sessionContract.data.actor,
			},
			{
				type: 'action-request@1.0.0',
				data: {
					...finalRequest,
					context,
					epoch: actionRequestDate.valueOf(),
					timestamp: actionRequestDate.toISOString(),
					actor: sessionContract.data.actor,
					input: {
						id: input.id,
					},
				},
			},
		);
		assert(actionRequest);

		const results = await this.producer.waitResults(context, actionRequest);
		logger.info(context, 'Got action results', results);

		if (results.error) {
			throw errio.fromObject(results.data);
		}

		if (options.files) {
			const contractId = (results.data! as any).id!;

			for (const item of files) {
				logger.info(context, 'Uploading attachment', {
					card: contractId,
					key: item.name,
				});

				await this.fileStore.store(context, contractId, item.name, item.buffer);
			}
		}

		return results.data;
	}
}
