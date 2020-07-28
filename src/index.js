import register from 'higlass-register';

import { OrthologsTrack} from './scripts';

register({
  name: 'OrthologsTrack',
  track: OrthologsTrack,
  config: OrthologsTrack.config,
});

