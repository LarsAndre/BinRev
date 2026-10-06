import test from 'node:test';
import assert from 'node:assert/strict';
import { stat, writeFile, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('content preparation prunes stale files while preserving watched directories and unchanged content', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const output = new URL('../src/content/analyses/', import.meta.url);
  const note = new URL('icedid.md', output);
  const stale = new URL(`__test-draft-${process.pid}.md`, output);
  const attachments = new URL('../public/attachments/', import.meta.url);
  const originals = new URL('../public/originals/', import.meta.url);
  const image = new URL('IcedID_Sections.png', attachments);
  const original = new URL('DrawingLowLevelStructures.excalidraw.md', originals);
  const staleImage = new URL(`__test-draft-${process.pid}.png`, attachments);
  const staleOriginal = new URL(`__test-draft-${process.pid}.md`, originals);
  const prepare = () => execFileSync(process.execPath, ['scripts/prepare-content.mjs'], { cwd: root, stdio: 'pipe' });
  prepare();
  const preserved = [output, note, attachments, image, originals, original];
  const before = await Promise.all(preserved.map(file => stat(file)));
  try {
    await writeFile(stale, '---\ntitle: Stale draft\ndraft: true\n---\nPrivate draft');
    await writeFile(staleImage, 'Private draft image');
    await writeFile(staleOriginal, 'Private draft original');
    prepare();
    for (const [index, file] of preserved.entries()) {
      const after = await stat(file);
      assert.equal(after.ino, before[index].ino, `${file.pathname}: inode preserved`);
      if (after.isFile()) assert.equal(after.mtimeMs, before[index].mtimeMs, `${file.pathname}: unchanged file preserved`);
    }
    assert.equal((await readdir(output)).includes(fileURLToPath(stale).split('/').pop()), false);
    assert.equal((await readdir(attachments)).includes(fileURLToPath(staleImage).split('/').pop()), false);
    assert.equal((await readdir(originals)).includes(fileURLToPath(staleOriginal).split('/').pop()), false);
  } finally {
    await rm(stale, { force: true });
    await rm(staleImage, { force: true });
    await rm(staleOriginal, { force: true });
  }
});
