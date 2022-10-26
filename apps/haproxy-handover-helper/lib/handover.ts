import net from 'node:net';
import { getHaproxyHostAddress } from './network-utils';
import { HandoverStatusMessage } from 'handover-lib';
import _ from 'lodash';
import { getLogger } from '@balena/jellyfish-logger';

type AddressesList = string[];

type ServicesAddressMap = {
	[serviceName: string]: AddressesList;
};

type HaproxyBackendDefinition = {
	backend: string;
	servers: Array<{
		name: string;
		address: string;
		state: string;
	}>;
};

const logger = getLogger(__filename);

// Holds the current data about services and their addresses
let servicesAddressMap: ServicesAddressMap = {};

// Load a JSON version of the backend defined in haproxy that we need to update
// tslint:disable-next-line: no-var-requires
const haproxyBackend: HaproxyBackendDefinition = require('../haproxy-backend.json');

export async function handleStatusMessage(
	message: HandoverStatusMessage,
	context: { id: string },
) {
	const upReceived = message.status === 'UP';
	const downReceived = message.status === 'DOWN';
	const newServicesAddressMap = _.cloneDeep(servicesAddressMap);
	if (upReceived) {
		// ADD the addresses, not override
		if (!newServicesAddressMap[message.serviceName]) {
			newServicesAddressMap[message.serviceName] = [];
		}
		newServicesAddressMap[message.serviceName] = [
			...new Set(
				newServicesAddressMap[message.serviceName].concat(message.addresses),
			),
		];
	} else if (downReceived) {
		// remove the addresses
		if (!newServicesAddressMap[message.serviceName]) {
			newServicesAddressMap[message.serviceName] = [];
		}
		const current = new Set(newServicesAddressMap[message.serviceName]);
		for (const address of message.addresses) {
			current.delete(address);
		}
		newServicesAddressMap[message.serviceName] = [...current];
	} else {
		console.error(`Unexpected message`);
		return;
	}
	if (!_.isEqual(newServicesAddressMap, servicesAddressMap)) {
		const logMessage = {
			serviceName: message.serviceName,
			addresses: message.addresses,
			status: message.status,
		};
		logger.info(
			context,
			'Changes triggered by message received' +
				JSON.stringify({ logMessage }, null, 2),
		);
		logger.info(
			context,
			'Current DB' + JSON.stringify(servicesAddressMap, null, 2),
		);
		logger.info(
			context,
			'New DB' + JSON.stringify(newServicesAddressMap, null, 2),
		);
		servicesAddressMap = newServicesAddressMap;
		updateHaproxyConfig(context, servicesAddressMap[message.serviceName]);
	} else {
		// silent update
		updateHaproxyConfig(context, servicesAddressMap[message.serviceName], true);
	}
}

function updateHaproxyConfig(
	context: { id: string },
	ip4: string[],
	silent: boolean = false,
) {
	const haproxyAddress = getHaproxyHostAddress();
	const haproxyClient = net.createConnection(
		{ host: haproxyAddress, port: 9090 },
		() => {
			// There are several servers defined in the haproxy, we need to update all of them based on the IPs received
			const newHaproxyConfig: HaproxyBackendDefinition =
				_.cloneDeep(haproxyBackend);
			for (let i = 0; i < newHaproxyConfig.servers.length; i++) {
				const server = newHaproxyConfig.servers[i];
				if (ip4[i]) {
					server.address = ip4[i];
					server.state = 'ready';
				}
			}
			// Update the whole config for the backend
			let commands = '';
			for (const server of newHaproxyConfig.servers) {
				commands += `set server ${newHaproxyConfig.backend}/${server.name} addr ${server.address}; set server ${newHaproxyConfig.backend}/${server.name} state ${server.state}; `;
			}

			// echo "show servers state api-backend" | nc 172.20.0.1 9090
			// echo "set server api-backend/api addr 172.20.0.3; set server api-backend/api state ready" | nc 172.20.0.1 9090

			if (!silent) {
				logger.info(context, 'sending commands:' + commands);
			}
			haproxyClient.write(commands);
			haproxyClient.end();

			if (!silent) {
				logger.info(context, `haproxy called`);
			}
		},
	);
	haproxyClient.on('data', (data) => {
		if (!silent) {
			logger.info(context, 'data received:' + data.toString());
		}
	});
	haproxyClient.on('end', () => {
		if (!silent) {
			logger.info(context, 'disconnected from server');
		}
	});
}
