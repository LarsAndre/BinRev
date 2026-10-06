// Keep wide Markdown tables inside an independently scrollable container.
export default function scrollableTables() {
  return (tree) => {
    function walk(node) {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        walk(child);
        if (child.type === 'element' && child.tagName === 'table') {
          return {
            type: 'element', tagName: 'div',
            properties: { className: ['table-scroll'], tabIndex: 0, role: 'region', ariaLabel: 'Scrollable table' },
            children: [child],
          };
        }
        return child;
      });
    }
    walk(tree);
  };
}
