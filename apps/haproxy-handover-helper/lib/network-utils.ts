import os from 'node:os';

/**
 * An alternative to the shell expression
 *   DOCKER_HOST_IP=$(route -n | awk '/UG[ \t]/{print $2}')
 */
export function getHaproxyHostAddress(): string {
	// haproxy listens on all interfaces on the host network, we can access it using the gateway address of eth0
	const getIPv4InterfaceInfo = (iface?: string): os.NetworkInterfaceInfo[] => {
		return Object.entries(os.networkInterfaces())
			.filter(([nic]) => !iface || nic === iface)
			.flatMap(([, ips]) => ips || [])
			.filter((ip) => !ip.internal && ip.family === 'IPv4');
	};

	const localIpV4Address: string = getIPv4InterfaceInfo('eth0')?.[0].address;
	const hostAddress = localIpV4Address
		.split('.')
		.map((v, i) => (i === 3 ? '1' : v))
		.join('.');
	return hostAddress;
}
