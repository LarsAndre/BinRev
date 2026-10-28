import { getCollection, type CollectionEntry } from 'astro:content';

export type Note = CollectionEntry<'notes'>;

export function isPublished(entry: Note) {
  return String(entry.data.draft) !== 'true' && String(entry.data.publish) !== 'false';
}

export async function publishedNotes() {
  return (await getCollection('notes', isPublished)).sort((a, b) =>
    a.data.order - b.data.order || a.data.title.localeCompare(b.data.title, 'en'),
  );
}

export async function publishedAnalyses() {
  return (await publishedNotes()).filter(entry => entry.data.kind === 'analysis');
}

export async function publishedResources() {
  return (await publishedNotes()).filter(entry => entry.data.kind === 'resource');
}

export async function notebookSections() {
  const notes = await publishedNotes();
  return (await getCollection('sections')).sort((a, b) => a.data.order - b.data.order)
    .map(section => ({ ...section, notes: notes.filter(note => note.data.section === section.id) }));
}

export function summary(entry: Note) {
  return entry.data.description || 'Malware analysis and reverse-engineering notes.';
}

export function sourceUrl(entry: Note) {
  return `https://github.com/LarsAndre/BinRev/blob/main/content/${entry.data.sourcePath.split('/').map(encodeURIComponent).join('/')}`;
}
