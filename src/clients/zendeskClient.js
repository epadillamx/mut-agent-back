import * as zendesk from 'node-zendesk';
import dotenv from 'dotenv';

dotenv.config();

//hay que pasar a .env
const client = zendesk.createClient({
  username: process.env.ZENDESK_USER,
  token: process.env.ZENDESK_TOKEN,
  remoteUri: 'https://territoria.zendesk.com/api/v2',
});

export default client;
