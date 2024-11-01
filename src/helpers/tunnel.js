import { createTunnel as mondayTunnel } from "@mondaydotcomorg/tunnel";

const MAX_RETRIES = 5;

const createTunnel = async (port, retries = 0) => {
  // console.log('creating tunnel');
  const tunnel = await mondayTunnel({
    port,
    subdomain: process.env.TUNNEL_SUBDOMAIN,
  });
  // console.log('tunnel created', tunnel);
  const { url } = tunnel;

  const usedSubDomain = url.includes(process.env.TUNNEL_SUBDOMAIN);
  if (!usedSubDomain && retries < MAX_RETRIES) {
    console.warn('could not use requested subdomain, retrying');
    tunnel.close();
    return setTimeout(() => {
      createTunnel(port, ++retries);
    }, 200);
  }

  if (!usedSubDomain) {
    console.warn('could not use requested subdomain, generated a random one');
  }
  console.log(`listening at localhost:${port} || tunnel: ${url}`);
};

export { createTunnel };
