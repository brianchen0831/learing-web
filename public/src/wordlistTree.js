// Turns the server's flat word lists into a folder tree. A list's id is its path,
// such as "grade1/part1". The server sends folders first, so that order is kept.
export function buildTree(lists) {
  const root = { children: [] };
  lists.forEach((list) => {
    const parts = list.id.split('/');
    const name = parts.pop();
    let node = root;
    let path = '';
    parts.forEach((folder) => {
      path = path ? `${path}/${folder}` : folder;
      let next = node.children.find((c) => c.type === 'folder' && c.name === folder);
      if (!next) {
        next = { type: 'folder', name: folder, path, children: [] };
        node.children.push(next);
      }
      node = next;
    });
    node.children.push({ type: 'list', name, path: list.id, list });
  });
  return root.children;
}

// Every list inside a tree node.
export const listsIn = (node) => (node.type === 'list' ? [node.list] : node.children.flatMap(listsIn));
