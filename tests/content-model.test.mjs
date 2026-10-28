import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadContent } from '../scripts/content-model.mjs';
import { prepareContent } from '../scripts/prepare-content.mjs';
import { splitNote, convertMarkdown } from '../scripts/markdown.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'binrev-content-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const put = async (name, content) => {
    const filename = path.join(root, 'content', name);
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, content);
  };
  return { root, put };
}

test('numbered folders discover sections and nested notes without metadata or code changes', async t => {
  const { root, put } = await fixture(t);
  await put('10-Zig-Malware-Analysis/Nested/First steps.md', '# Getting started\nNotes.');
  await put('02-Windows-Internals/index.md', '---\ntitle: Windows internals\n---\n');
  await put('02-Windows-Internals/Second.md', '---\norder: 2\n---\nSecond');
  await put('02-Windows-Internals/First.md', '---\norder: 1\n---\nFirst');
  await put('Templates/Example.md', 'This must stay outside the public site.');
  await put('10-Zig-Malware-Analysis/Sketch.excalidraw.md', 'Not an article.');
  const { sections, notes, routes } = await loadContent(root);
  assert.deepEqual(sections.map(section => section.title), ['Windows internals', 'Zig Malware Analysis']);
  assert.equal(notes.length, 3);
  const nested = notes.find(note => note.slug === 'first-steps');
  assert.equal(nested.title, 'First steps');
  assert.equal(nested.url, '/notes/first-steps/');
  assert.equal(nested.sourcePath, '10-Zig-Malware-Analysis/Nested/First steps.md');
  assert.deepEqual(notes.filter(note => note.section === 'windows-internals').map(note => note.title), ['First', 'Second']);
  const converted = convertMarkdown('[[10-Zig-Malware-Analysis/Nested/First steps|Start]]', { routes });
  assert.equal(converted.markdown, '[Start](/notes/first-steps/)');
});

test('analysis sections preserve existing routes and slugs survive title changes', async t => {
  const { root, put } = await fixture(t);
  await put('01-Samples/index.md', '---\ntitle: Samples\ntype: analyses\n---\n');
  await put('01-Samples/Renamed file.md', '---\ntitle: A different title\nslug: icedid\n---\nBody');
  const { notes } = await loadContent(root);
  assert.equal(notes[0].url, '/analyses/icedid/');
  assert.equal(notes[0].kind, 'analysis');
});

test('draft notes, draft sections, and their assets never enter generated output', async t => {
  const { root, put } = await fixture(t);
  await put('01-Notes/Public.md', '# Public\n![[public.png]]');
  await put('01-Notes/Private.md', '---\ndraft: "true"\n---\nSecret ![[private.png]]');
  await put('01-Notes/Diagram.md', '---\ntype: diagram\npublish: false\ndiagram: Diagrams/private.svg\n---\nSecret diagram');
  await put('02-Private/index.md', '---\npublish: "false"\n---\n');
  await put('02-Private/Hidden.md', 'This entire section is private.');
  await put('Attachments/public.png', 'public image');
  await put('Attachments/private.png', 'private image');
  await put('Diagrams/private.svg', '<svg>private</svg>');
  await prepareContent(root);
  assert.deepEqual(await readdir(path.join(root, 'src/content/notes')), ['public.md']);
  assert.deepEqual(await readdir(path.join(root, 'src/content/sections')), ['notes.md']);
  assert.deepEqual(await readdir(path.join(root, 'public/attachments')), ['public.png']);
  assert.deepEqual(await readdir(path.join(root, 'public/diagrams')), []);
  await put('01-Notes/Public.md', '---\npublish: false\n---\nPreviously public');
  await prepareContent(root);
  assert.deepEqual(await readdir(path.join(root, 'src/content/notes')), []);
  assert.deepEqual(await readdir(path.join(root, 'public/attachments')), []);
});

test('diagram metadata drives resources and copies only referenced assets', async t => {
  const { root, put } = await fixture(t);
  await put('01-Windows/PE.md', '---\ntitle: Portable Executable\nslug: pe-format\ntype: diagram\ndiagram: Diagrams/pe.svg\n---\nAdditional **notes**.');
  await put('Diagrams/pe.svg', '<svg>public diagram</svg>');
  await put('Diagrams/unused.svg', '<svg>unreferenced</svg>');
  await prepareContent(root);
  const note = splitNote(await readFile(path.join(root, 'src/content/notes/pe-format.md'), 'utf8'));
  assert.equal(note.data.url, '/resources/pe-format/');
  assert.equal(note.data.image, '/diagrams/pe.svg');
  assert.equal(note.data.original, '/originals/pe.svg');
  assert.match(note.body, /Additional \*\*notes\*\*/);
  assert.deepEqual(await readdir(path.join(root, 'public/diagrams')), ['pe.svg']);
  const { routes } = await loadContent(root);
  assert.equal(routes.get('pe'), '/resources/pe-format/');
});

test('duplicate slugs and invalid metadata fail with the source path', async t => {
  const { root, put } = await fixture(t);
  await put('01-Notes/First.md', '---\nslug: duplicate\n---\n');
  await put('01-Notes/Second.md', '---\nslug: duplicate\n---\n');
  await assert.rejects(loadContent(root), /01-Notes\/Second.md: duplicate slug/);
  await put('01-Notes/Second.md', '---\nslug: Invalid Slug\n---\n');
  await assert.rejects(loadContent(root), /01-Notes\/Second.md: slug must/);
  await put('01-Notes/Second.md', '---\ntype: diagram\ndiagram: ../outside.svg\n---\n');
  await assert.rejects(loadContent(root), /Asset must be inside content/);
  await put('01-Notes/Second.md', '---\norder: first\n---\n');
  await assert.rejects(loadContent(root), /01-Notes\/Second.md: order must be a number/);
});
