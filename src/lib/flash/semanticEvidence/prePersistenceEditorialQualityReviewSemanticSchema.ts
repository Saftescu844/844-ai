export const FLASH_PREPERSISTENCE_EDITORIAL_QUALITY_REVIEW_OUTPUT_SCHEMA:
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

      paragraphEdits: {
        type: 'array',

        items: {
          type: 'object',

          properties: {
            paragraphIndex: {
              type: 'integer',
              minimum: 0,
            },

            replacement: {
              type: 'string',
              pattern:
                '[A-Za-zĂÂÎȘȚăâîșț]',
            },
          },

          required: [
            'paragraphIndex',
            'replacement',
          ],

          additionalProperties:
            false,
        },
      },
    },

    required: [
      'language',
      'editorialTitle',
      'paragraphEdits',
    ],

    additionalProperties:
      false,
  }
