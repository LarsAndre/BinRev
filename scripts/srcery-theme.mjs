// Syntax colors from the user's Srcery terminal palette:
// https://terminalcolors.com/themes/srcery/default/
export default {
  name: 'srcery',
  type: 'dark',
  colors: {
    'editor.background': '#1c1b19',
    'editor.foreground': '#fce8c3',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#918175' } },
    { scope: ['string', 'markup.inline.raw'], settings: { foreground: '#98bc37' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: '#ff5c8f' } },
    { scope: ['keyword', 'storage.type', 'storage.modifier'], settings: { foreground: '#f75341' } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: '#fbb829' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'], settings: { foreground: '#fed06e' } },
    { scope: ['variable.parameter', 'entity.other.attribute-name'], settings: { foreground: '#68a8e4' } },
    { scope: ['entity.name.tag', 'constant.other', 'support.constant'], settings: { foreground: '#2be4d0' } },
    { scope: ['invalid'], settings: { foreground: '#ef2f27' } },
  ],
};
