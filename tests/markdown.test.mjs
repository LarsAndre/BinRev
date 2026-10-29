import test from 'node:test';
import assert from 'node:assert/strict';
import { convertMarkdown, isPublished, splitNote } from '../scripts/markdown.mjs';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';

const note = body => `---\ntitle: Test\n---\n${body}`;

test('publication flags exclude both boolean and Obsidian string drafts', () => {
  for (const data of [{ draft: true }, { draft: 'true' }, { publish: false }, { publish: 'false' }]) assert.equal(isPublished(data), false);
  for (const data of [{}, { draft: 'false', publish: 'true' }, { draft: false, publish: true }]) assert.equal(isPublished(data), true);
});

test('wikilinks resolve notes, labels, headings, and local anchors', () => {
  const result = convertMarkdown(note('[[IcedID#RC4 Encryption|RC4]] and [[#Local heading]]'), { routes: new Map([['icedid', '/analyses/icedid/']]) });
  assert.match(result.markdown, /\[RC4\]\(\/analyses\/icedid\/#rc4-encryption\)/);
  assert.match(result.markdown, /\[Local heading\]\(#local-heading\)/);
});

test('unavailable notes become readable text without a broken link', () => {
  const result = convertMarkdown(note('[[Unpacking#Breakpoints|More information]]'));
  assert.match(result.markdown, /More information \*\(note unavailable\)\*/);
  assert.deepEqual(result.warnings, ['Unresolved note: Unpacking#Breakpoints']);
});

test('attachments preserve width, escape alt text, and reject missing files', () => {
  const result = convertMarkdown(note('![[Diagram_1.png|1000]]'), { attachments: new Set(['Diagram_1.png']) });
  assert.match(result.markdown, /src="\/attachments\/Diagram_1.png" alt="Diagram 1" width="1000"/);
  assert.deepEqual([...result.images], ['Diagram_1.png']);
  assert.throws(() => convertMarkdown(note('![[absent.png]]')), /Missing attachment/);
});

test('Excalidraw embeds use exported SVGs, retain width, and leave code examples alone', () => {
  const drawing = { original: 'Diagrams/Boot process.excalidraw.md', diagram: 'Diagrams/Boot process.svg' };
  const resolveDiagram = file => file.endsWith('.excalidraw') ? drawing : undefined;
  const result = convertMarkdown(note('![[Boot process.excalidraw|1000]]\n`![[Example.excalidraw]]`'), { resolveDiagram });
  assert.match(result.markdown, /src="\/diagrams\/Boot%20process.svg" alt="Boot process" width="1000"/);
  assert.match(result.markdown, /`!\[\[Example.excalidraw\]\]`/);
  assert.deepEqual([...result.diagrams], [drawing]);
  assert.equal(result.images.size, 0);
});

test('code fences and inline examples preserve Obsidian syntax and hashes', () => {
  const body = '# Heading\n`[[Example]]`\n```python\n# Code comment\nvalue = "![[example.png]]"\n```\n> [!tip] Useful tip';
  const result = convertMarkdown(note(body));
  assert.match(result.markdown, /## Heading/);
  assert.match(result.markdown, /`\[\[Example\]\]`/);
  assert.match(result.markdown, /# Code comment\nvalue = "!\[\[example.png\]\]"/);
  assert.match(result.markdown, /> \*\*Useful tip\*\*/);
  assert.equal(result.warnings.length, 0);
});

test('YAML frontmatter supports CRLF notes', () => {
  assert.equal(splitNote('---\r\ntitle: Test\r\n---\r\nBody').data.title, 'Test');
});

test('headings immediately after Obsidian image embeds render as Markdown', async () => {
  const source = note('![[Diagram_1.png]]\n### 5.2.2 - RC4 Key (sub_4014F9)\nText with **emphasis** and `inline code`.');
  const converted = convertMarkdown(source, { attachments: new Set(['Diagram_1.png']) });
  const renderer = await createMarkdownProcessor({ syntaxHighlight: false });
  const { code } = await renderer.render(splitNote(converted.markdown).body);
  assert.match(code, /<h4[^>]*>5\.2\.2 - RC4 Key \(sub_4014F9\)<\/h4>/);
  assert.match(code, /<strong>emphasis<\/strong>/);
  assert.match(code, /<code>inline code<\/code>/);
});
