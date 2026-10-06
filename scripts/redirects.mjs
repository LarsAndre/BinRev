// Both source casing and Quartz's deployed lowercase URLs are supported.
const routes = [
  ['/02-Analyzed-Samples/IcedID', '/analyses/icedid/'],
  ['/02-Analyzed-Samples/Zloader', '/analyses/zloader/'],
  ['/01-Resources/MalLoaderFlow.excalidraw', '/resources/malware-loader-flow/'],
  ['/01-Resources/DrawingLowLevelStructures.excalidraw', '/resources/low-level-structures/'],
  ['/01-Resources/PE_Format_Overview', '/resources/pe-format/'],
  ['/01-Resources', '/resources/'],
  ['/02-Analyzed-Samples', '/analyses/'],
  ['/IcedID', '/analyses/icedid/'],
  ['/Zloader', '/analyses/zloader/'],
];

export const redirects = Object.fromEntries(routes.flatMap(([from, to]) =>
  [...new Set([from, from.toLowerCase()])].flatMap((pathname) => [
    [pathname, to], [pathname + '.html', to],
  ]),
));
