import * as zendesk from 'node-zendesk';
import 'dotenv/config';

//hay que pasar a .env
const client = zendesk.createClient({
  username: 'integrador@mut.cl',
  token: 'mwaNfxfGUxqtiRppJcBVBpgKnUpPphij25m2JEim',
  remoteUri: 'https://territoria.zendesk.com/api/v2',
});

export default client;
