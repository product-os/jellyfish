import type {
	ActionPreRequest,
	ActionRequestContract,
	Producer,
	Worker,
} from '@balena/jellyfish-worker';
import { strict as assert } from 'assert';
import type { AutumnDBSession } from 'autumndb';
import errio from 'errio';
import { v4 as isUUID } from 'is-uuid';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { Storage } from '../file-storage';

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
	fileStore: Storage;
	producer: Producer;
	worker: Worker;

	constructor(worker: Worker, fileStore: Storage) {
		this.fileStore = fileStore;
		this.producer = worker.producer;
		this.worker = worker;
	}

	async processAction(
		context: { [x: string]: any; id: any },
		session: AutumnDBSession,
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

		// FIXME we should first save the file on the fileStore to make sure it will be there
		// when saving the action
		// Current impl will generate broken links if the push to S3 fails
		const actionRequest = await this.worker.insertCard<ActionRequestContract>(
			context,
			this.worker.kernel.adminSession()!,
			this.worker.typeContracts['action-request@1.0.0'],
			{
				timestamp: actionRequestDate.toISOString(),
				actor: session.actor.id,
			},
			{
				type: 'action-request@1.0.0',
				data: {
					...finalRequest,
					context,
					epoch: actionRequestDate.valueOf(),
					timestamp: actionRequestDate.toISOString(),
					actor: session.actor.id,
					input: {
						id: input.id,
					},
				},
			},
		);
		assert(actionRequest);

		const results = await this.producer.waitResults(context, actionRequest);

		if (results.error) {
			throw errio.fromObject(results.data);
		}

		if (options.files) {
			const contractId = (results.data! as any).id!;

			for (const item of files) {
				await this.fileStore.store(context, contractId, item.name, item.buffer);
			}
		}

		return results.data;
	}
}
