export const richTextTextState = {
  fontFamily: {
    implicit: {
      label: 'Implicit',
      css: {
        'font-family': 'inherit',
      },
    },
    system: {
      label: 'Sistem',
      css: {
        'font-family':
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      },
    },
    serif: {
      label: 'Serif — Georgia',
      css: {
        'font-family': "Georgia, 'Times New Roman', serif",
      },
    },
    monospace: {
      label: 'Monospace',
      css: {
        'font-family':
          "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
      },
    },
  },

  fontSize: {
    implicit: {
      label: 'Implicită',
      css: {
        'font-size': 'inherit',
      },
    },
    small: {
      label: 'Mic — 14 px',
      css: {
        'font-size': '14px',
      },
    },
    normal: {
      label: 'Normal — 16 px',
      css: {
        'font-size': '16px',
      },
    },
    introduction: {
      label: 'Introducere — 18 px',
      css: {
        'font-size': '18px',
      },
    },
    large: {
      label: 'Mare — 20 px',
      css: {
        'font-size': '20px',
      },
    },
    extraLarge: {
      label: 'Foarte mare — 24 px',
      css: {
        'font-size': '24px',
      },
    },
  },

  color: {
    implicit: {
      label: 'Implicită',
      css: {
        color: 'inherit',
      },
    },
    red: {
      label: 'Roșu',
      css: {
        color: '#B42318',
      },
    },
    blue: {
      label: 'Albastru',
      css: {
        color: '#185FA5',
      },
    },
    green: {
      label: 'Verde',
      css: {
        color: '#18794E',
      },
    },
  },
} as const
