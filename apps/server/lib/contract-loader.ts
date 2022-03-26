import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger, LogContext } from '@balena/jellyfish-logger';
import {
	ContractDefinition,
	TypeContract,
} from '@balena/jellyfish-types/build/core';
import { Worker } from '@balena/jellyfish-worker';
import { Kernel } from 'autumndb';
import Bluebird from 'bluebird';
import _ from 'lodash';

const logger = getLogger(__filename);

export const loadContracts = async (
	logContext: LogContext,
	kernel: Kernel,
	worker: Worker,
	session: string,
	contracts: ContractDefinition[],
) => {
	logger.info(logContext, 'Setting up guest user');

	const guestUser = await kernel.replaceContract(
		logContext,
		session,
		contracts['user-guest'],
	);

	const guestUserSession = await kernel.replaceContract(
		logContext,
		session,
		Kernel.defaults({
			slug: 'session-guest',
			version: '1.0.0',
			type: 'session@1.0.0',
			data: {
				actor: guestUser.id,
			},
		}),
	);

	logger.info(logContext, 'Done setting up guest session');
	logger.info(logContext, 'Setting default contracts');

	const contractsToSkip = ['user-guest'];

	// Only need test user role during development and CI.
	if (environment.isProduction() && !environment.isCI()) {
		contractsToSkip.push('role-user-test');
	}

	const contractLoaders = _.values(contracts).filter(
		(contract: ContractDefinition) => {
			return !contractsToSkip.includes(contract.slug);
		},
	);

	await Bluebird.each(contractLoaders, async (contract: ContractDefinition) => {
		if (!contract) {
			return;
		}

		// Skip contracts that already exist and do not need updating
		// Need to update omitted list if any similar fields are added to the schema
		contract.name = contract.name ? contract.name : null;
		const currentContract = await kernel.getContractBySlug(
			logContext,
			session,
			`${contract.slug}@${contract.version}`,
		);
		if (
			currentContract &&
			_.isEqual(
				contract,
				_.omit(currentContract, [
					'id',
					'created_at',
					'updated_at',
					'linked_at',
				]),
			)
		) {
			return;
		}

		const versionedType = ensureTypeHasVersion(contract.type);
		const typeContract = await kernel.getContractBySlug<TypeContract>(
			logContext,
			session,
			versionedType,
		);

		if (typeContract) {
			logger.info(logContext, 'Inserting default contract using worker', {
				slug: contract.slug,
				type: contract.type,
			});

			await worker.replaceCard(
				logContext,
				session,
				typeContract,
				{
					attachEvents: false,
				},
				contract,
			);

			logger.info(logContext, 'Inserted default contract using worker', {
				slug: contract.slug,
				type: contract.type,
			});
		} else {
			logger.warn(
				logContext,
				'Failed to insert default contract as type not found',
				{
					slug: contract.slug,
					type: versionedType,
				},
			);
		}
	});

	return {
		guestSession: guestUserSession,
	};
};

/**
 * As it's valid to specify a version without type, this guarantees that we
 * have a fully qualified versioned type.
 *
 * @param {string} type - name of type that may or may not contain a version suffix
 * @returns a type string that contains a version suffix
 */
export const ensureTypeHasVersion = (type: string): string => {
	if (!_.includes(type, '@')) {
		// Types should not default to latest to ensure old "insert" code doesn't break
		return `${type}@1.0.0`;
	}
	const versionPattern = /@(?<major>\d+)(\.(?<minor>\d+))?(\.(?<patch>\d+))?$/;
	if (!versionPattern.test(type)) {
		throw Error(`contract-loader encountered invalid type spec: ${type}`);
	}
	return type;
};
