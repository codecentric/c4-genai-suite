export default {
  meta: {
    type: 'problem',
    messages: {
      restrictedZustand: "Do not import from 'zustand' outside of '*/state/zustand/*'.",
    },
  },
  create(context) {
    const filename = context.getFilename();
    const isAllowed = /[\\/]state[\\/]zustand[\\/]/.test(filename) || /[\\/]state.ts/.test(filename);

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        if ((importPath === 'zustand' || importPath.startsWith('zustand/')) && !isAllowed) {
          context.report({
            node,
            messageId: 'restrictedZustand',
          });
        }
      },
    };
  },
};
