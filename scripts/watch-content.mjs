import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareContent } from './prepare-content.mjs';

export default function watchContent() {
  return {
    name: 'binrev-content',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        const root = fileURLToPath(new URL('../', import.meta.url));
        const directory = path.join(root, 'content');
        server.watcher.add(directory);
        let timer;
        let pending = Promise.resolve();
        const update = (_event, filename) => {
          if (!path.resolve(filename).startsWith(directory + path.sep)) return;
          clearTimeout(timer);
          timer = setTimeout(() => {
            // Serialize writes when an editor saves several files together.
            pending = pending.then(async () => {
              await prepareContent(root);
              server.ws.send({ type: 'full-reload' });
            }).catch(error => logger.error(error.message));
          }, 150);
        };
        server.watcher.on('all', update);
        server.httpServer?.once('close', () => {
          clearTimeout(timer);
          server.watcher.off('all', update);
        });
      },
    },
  };
}
