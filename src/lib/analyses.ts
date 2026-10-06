import { getCollection, type CollectionEntry } from 'astro:content';

export function isPublished(entry: CollectionEntry<'analyses'>) {
  return String(entry.data.draft) !== 'true' && String(entry.data.publish) !== 'false';
}

export async function publishedAnalyses() {
  return (await getCollection('analyses', isPublished)).sort((a, b) =>
    a.data.title.localeCompare(b.data.title),
  );
}

const summaries: Record<string, string> = {
  icedid: 'Unpacking an IcedID loader: anti-analysis checks, shellcode, RC4 decryption, and configuration extraction.',
  zloader: 'Following a Zloader injector through process injection, payload decryption, and its second stage.',
};

export function summary(entry: CollectionEntry<'analyses'>) {
  return entry.data.description || summaries[entry.id] || 'Malware analysis and reverse-engineering notes.';
}
