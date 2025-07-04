export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow use of conversations from useApi or api.conversations except in whitelisted paths',
      category: 'Best Practices',
      recommended: false,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          allowedPaths: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      restrictedConversationsDestructuring:
        'Destructuring "conversations" from useApi() is not allowed in this file. Only allowed in: {{allowedPaths}}',
      restrictedConversationsAccess:
        'Accessing "api.conversations" is not allowed in this file. Only allowed in: {{allowedPaths}}',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedPaths = options.allowedPaths || [];
    const filename = context.getFilename();

    const isAllowed = allowedPaths.some((allowedPath) => {
      return filename.includes(allowedPath);
    });

    if (isAllowed) {
      return {}; // Skip checking if file is in allowed paths
    }

    let hasUseApiImport = false;
    let useApiVariableName = null;

    return {
      // Track import of useApi
      ImportDeclaration(node) {
        if (node.source.value === 'src/api') {
          node.specifiers.forEach((spec) => {
            if (spec.type === 'ImportSpecifier' && spec.imported.name === 'useApi') {
              hasUseApiImport = true;
            }
          });
        }
      },

      // Check for destructuring conversations from useApi()
      VariableDeclarator(node) {
        if (!hasUseApiImport) return;

        // Check for const { conversations } = useApi()
        if (
          node.id.type === 'ObjectPattern' &&
          node.init &&
          node.init.type === 'CallExpression' &&
          node.init.callee.name === 'useApi'
        ) {
          const hasConversations = node.id.properties.some(
            (prop) => prop.type === 'Property' && prop.key.name === 'conversations',
          );

          if (hasConversations) {
            context.report({
              node,
              messageId: 'restrictedConversationsDestructuring',
              data: {
                allowedPaths: allowedPaths.join(', '),
              },
            });
          }
        }

        // Check for const api = useApi() (to track variable name)
        if (
          node.id.type === 'Identifier' &&
          node.init &&
          node.init.type === 'CallExpression' &&
          node.init.callee.name === 'useApi'
        ) {
          useApiVariableName = node.id.name;
        }
      },

      // Check for api.conversations access
      MemberExpression(node) {
        if (!hasUseApiImport || !useApiVariableName) return;

        if (node.object.name === useApiVariableName && node.property.name === 'conversations') {
          context.report({
            node,
            messageId: 'restrictedConversationsAccess',
            data: {
              allowedPaths: allowedPaths.join(', '),
            },
          });
        }
      },
    };
  },
};
