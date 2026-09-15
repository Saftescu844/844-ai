export const FLASH_PREPERSISTENCE_EDITORIAL_OUTPUT_SCHEMA:
  Record<string, unknown> = {
    type: 'object',

    properties: {
      language: {
        type: 'string',
        const: 'ro',
      },

      editorialTitle: {
        type: 'string',
      },

      editorialParagraphs: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'string',
          pattern:
            '[A-Za-zĂÂÎȘȚăâîșț]',
        },
      },
    },

    required: [
      'language',
      'editorialTitle',
      'editorialParagraphs',
    ],

    additionalProperties:
      false,
  }
