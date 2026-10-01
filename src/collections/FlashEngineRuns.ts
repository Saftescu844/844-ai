import type { CollectionConfig } from 'payload'

export const FlashEngineRuns: CollectionConfig = {
  slug: 'flash-engine-runs',

  // Colecție de audit gestionată exclusiv de sistem.
  // Nu avem nevoie de document locking în Admin.
  lockDocuments: false,

  labels: {
    singular: 'Evaluare Flash',
    plural: 'Evaluări Flash',
  },

  admin: {
    useAsTitle: 'runId',
    group: 'Sistem',
    defaultColumns: [
      'flash',
      'status',
      'decision',
      'model',
      'startedAt',
      'completedAt',
    ],
    description:
      'Jurnal tehnic read-only pentru execuțiile Flash Engine. Nu reprezintă autoritatea de publicare.',
  },

  access: {
    read: ({ req: { user } }) =>
      user?.rol === 'admin' || user?.rol === 'editor',

    // Audit trail deținut de sistem:
    // utilizatorii nu creează, modifică sau șterg
    // manual execuții Flash Engine.
    create: () => false,
    update: () => false,
    delete: () => false,
  },

  fields: [
    {
      name: 'flash',
      type: 'relationship',
      relationTo: 'flash-ai',
      index: true,
      maxDepth: 0,
      admin: {
        readOnly: true,
        description:
          'Relația curentă către Flash. Poate deveni null dacă documentul Flash este șters.',
      },
    },

    {
      name: 'flashIdSnapshot',
      type: 'number',
      required: true,
      index: true,
      min: 1,
      validate: (value: number | null | undefined) =>
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 1
          ? true
          : 'ID-ul Flash trebuie să fie un număr întreg pozitiv.',
      admin: {
        readOnly: true,
        description:
          'ID-ul original al Flash-ului evaluat, păstrat independent de existența ulterioară a documentului.',
      },
    },

    {
      name: 'runId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description:
          'Identificator unic al unei execuții Flash Engine.',
      },
    },

    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'running',
      index: true,
      options: [
        {
          label: 'În execuție',
          value: 'running',
        },
        {
          label: 'Finalizată',
          value: 'completed',
        },
        {
          label: 'Eșuată',
          value: 'failed',
        },
      ],
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'provider',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
        description:
          'Providerul semantic utilizat de această execuție.',
      },
    },

    {
      name: 'model',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'engineVersion',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
        description:
          'Versiunea logică sau revizia Flash Engine folosită pentru evaluare.',
      },
    },

    {
      name: 'startedAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'completedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'decision',
      type: 'select',
      index: true,
      options: [
        {
          label: 'Eligibil AUTO',
          value: 'autoPublish',
        },
        {
          label: 'Necesită review',
          value: 'review',
        },
        {
          label: 'Blocat',
          value: 'blocked',
        },
      ],
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'reasons',
      type: 'array',
      labels: {
        singular: 'Motiv',
        plural: 'Motive',
      },
      admin: {
        readOnly: true,
        description:
          'Codurile structurate returnate de Decision Engine.',
      },
      fields: [
        {
          name: 'reason',
          type: 'text',
          required: true,
          maxLength: 100,
        },
      ],
    },

    {
      name: 'decisionInputSnapshot',
      type: 'json',
      admin: {
        readOnly: true,
        description:
          'Snapshot structurat al intrării finale în Decision Engine.',
      },
    },

    {
      name: 'evidenceSummary',
      type: 'json',
      admin: {
        readOnly: true,
        description:
          'Rezumat auditabil al componentelor runtime. Nu stochează pagini sursă sau chunks brute.',
      },
    },

    {
      name: 'errorCode',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'errorMessage',
      type: 'textarea',
      admin: {
        readOnly: true,
        description:
          'Mesaj tehnic sanitizat. Nu se stochează chei API sau răspunsuri provider brute.',
      },
    },
  ],
}
