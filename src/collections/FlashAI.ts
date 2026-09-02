import {
  APIError,
  type CollectionBeforeOperationHook,
  type CollectionConfig,
} from 'payload'
import {
  FixedToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

const enforceFlashPublicationRBAC: CollectionBeforeOperationHook<'flash-ai'> = ({
  args,
  operation,
  req,
}) => {
  const role = req.user?.rol

  if (operation === 'restoreVersion') {
    if (role !== 'admin') {
      throw new APIError(
        'Doar administratorii pot restaura versiuni Flash.',
        403,
      )
    }
    return
  }

  if (operation === 'delete' || operation === 'deleteByID') {
    if (role !== 'admin') {
      throw new APIError(
        'Doar administratorii pot șterge Flash-uri.',
        403,
      )
    }
    return
  }

  if (
    operation !== 'create' &&
    operation !== 'update' &&
    operation !== 'updateByID'
  ) {
    return
  }

  const attemptsPublication =
    args.data?._status === 'published' ||
    args.publishAllLocales === true ||
    Boolean(args.publishSpecificLocale)

  const attemptsUnpublish =
    'unpublishAllLocales' in args &&
    args.unpublishAllLocales === true

  // Până la implementarea Flash Engine-ului controlat,
  // publicarea directă rămâne rezervată administratorului.
  if (
    (attemptsPublication || attemptsUnpublish) &&
    role !== 'admin'
  ) {
    throw new APIError(
      'Publicarea Flash este rezervată fluxului autorizat.',
      403,
    )
  }

  if (role === 'admin') return

  if (args.draft !== true) {
    throw new APIError(
      'Modificările non-admin trebuie salvate ca draft.',
      403,
    )
  }
}

export const FlashAI: CollectionConfig = {
  slug: 'flash-ai',
  labels: {
    singular: 'Flash AI',
    plural: 'Flash AI',
  },
  admin: {
    useAsTitle: 'titlu',
    group: 'Conținut',
    defaultColumns: [
      'titlu',
      'limba',
      'flashType',
      'informationStatus',
      'riskLevel',
      'editorialStatus',
      '_status',
    ],
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.rol === 'admin' || user?.rol === 'editor') {
        return true
      }

      return {
        _status: {
          equals: 'published',
        },
      }
    },
    create: ({ req: { user } }) =>
      user?.rol === 'admin' || user?.rol === 'editor',
    update: ({ data, req: { user } }) => {
      if (user?.rol === 'admin') return true
      if (user?.rol !== 'editor') return false

      return data?._status !== 'published'
    },
    delete: ({ req: { user } }) =>
      user?.rol === 'admin',
  },
  versions: {
    drafts: {
      schedulePublish: true,
    },
  },
  fields: [
    {
      name: 'titlu',
      type: 'text',
      required: true,
      maxLength: 200,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'limba',
      type: 'select',
      required: true,
      defaultValue: 'ro',
      index: true,
      options: [
        { label: 'Română', value: 'ro' },
        { label: 'English', value: 'en' },
      ],
    },
    {
      name: 'versiuneAlternativa',
      type: 'relationship',
      relationTo: 'flash-ai',
      maxDepth: 0,
      admin: {
        description:
          'Flash-ul echivalent în cealaltă limbă.',
      },
    },
    {
      name: 'pilon',
      type: 'relationship',
      relationTo: 'categorii',
      required: true,
      index: true,
    },
    {
      name: 'flashType',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Anunț', value: 'announcement' },
        { label: 'Cercetare', value: 'research' },
        { label: 'Reglementare', value: 'regulation' },
        { label: 'Produs / instrument', value: 'product' },
        { label: 'Afaceri', value: 'business' },
        { label: 'Incident', value: 'incident' },
        { label: 'Actualizare', value: 'update' },
        { label: 'Altele', value: 'other' },
      ],
    },
    {
      name: 'excerpt',
      type: 'textarea',
      maxLength: 300,
    },
    {
      name: 'continut',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          FixedToolbarFeature(),
        ],
      }),
      admin: {
        description:
          'Țintă editorială Flash: aproximativ 400–1000 de cuvinte.',
      },
    },
    {
      name: 'imaginePrincipala',
      type: 'upload',
      relationTo: 'media',
    },

    {
      name: 'surseFlash',
      type: 'array',
      labels: {
        singular: 'Sursă Flash',
        plural: 'Surse Flash',
      },
      fields: [
        {
          name: 'sursa',
          type: 'relationship',
          relationTo: 'surse',
          maxDepth: 0,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
        {
          name: 'sourcePublishedAt',
          type: 'date',
        },
        {
          name: 'primary',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },

    {
      name: 'informationStatus',
      type: 'select',
      required: true,
      defaultValue: 'unverified',
      index: true,
      options: [
        { label: 'Oficial', value: 'official' },
        { label: 'Confirmat', value: 'confirmed' },
        { label: 'Emergent', value: 'emerging' },
        { label: 'Preliminar', value: 'preliminary' },
        { label: 'Contestat', value: 'disputed' },
        { label: 'Neverificat', value: 'unverified' },
      ],
    },
    {
      name: 'riskLevel',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      index: true,
      options: [
        { label: 'Scăzut', value: 'low' },
        { label: 'Mediu', value: 'medium' },
        { label: 'Ridicat', value: 'high' },
      ],
    },

    {
      name: 'isHealthRelated',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
    {
      name: 'medicalEvidenceType',
      type: 'select',
      defaultValue: 'notApplicable',
      options: [
        { label: 'Nu se aplică', value: 'notApplicable' },
        { label: 'Preclinic', value: 'preclinical' },
        { label: 'Studiu clinic', value: 'clinicalStudy' },
        { label: 'Revizuire sistematică', value: 'systematicReview' },
        { label: 'Ghid / consens', value: 'guidelineOrConsensus' },
        { label: 'Decizie regulatorie', value: 'regulatoryDecision' },
        { label: 'Real-world evidence', value: 'realWorldEvidence' },
        { label: 'Afirmație companie/produs', value: 'productOrCompanyClaim' },
        { label: 'Altele', value: 'other' },
      ],
      admin: {
        condition: (data) => data?.isHealthRelated === true,
      },
    },
    {
      name: 'clinicalValidationStatus',
      type: 'select',
      defaultValue: 'notApplicable',
      options: [
        { label: 'Nu se aplică', value: 'notApplicable' },
        { label: 'Nevalidat clinic', value: 'notValidated' },
        { label: 'În evaluare', value: 'underEvaluation' },
        { label: 'Dovezi limitate', value: 'limitedEvidence' },
        { label: 'Validat pentru utilizare specifică', value: 'validatedForSpecificUse' },
        { label: 'Autorizat / aprobat', value: 'authorizedOrApproved' },
        { label: 'Neclar', value: 'unclear' },
      ],
      admin: {
        condition: (data) => data?.isHealthRelated === true,
      },
    },
    {
      name: 'disclaimerTypes',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Informare medicală', value: 'medicalInformational' },
        { label: 'Dovezi emergente', value: 'emergingEvidence' },
        { label: 'Nevalidat clinic', value: 'notClinicallyValidated' },
        { label: 'Statut regulator limitat/neclar', value: 'regulatoryStatusLimitedOrUnclear' },
        { label: 'Decizia aparține specialistului', value: 'specialistDecision' },
      ],
    },
    {
      name: 'specialistQuestions',
      type: 'array',
      maxRows: 3,
      admin: {
        condition: (data) => data?.isHealthRelated === true,
      },
      fields: [
        {
          name: 'question',
          type: 'text',
          required: true,
          maxLength: 300,
        },
      ],
    },

    {
      name: 'autorPrincipal',
      type: 'relationship',
      relationTo: 'autori',
      maxDepth: 0,
    },
    {
      name: 'verificatorEditorial',
      type: 'relationship',
      relationTo: 'autori',
      maxDepth: 0,
    },
    {
      name: 'verificatorMedical',
      type: 'relationship',
      relationTo: 'autori',
      maxDepth: 0,
    },
    {
      name: 'relatedArticle',
      type: 'relationship',
      relationTo: 'articole',
      maxDepth: 0,
    },
    {
      name: 'relatedFlash',
      type: 'relationship',
      relationTo: 'flash-ai',
      maxDepth: 0,
    },

    {
      name: 'editorialStatus',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'În revizuire', value: 'review' },
        { label: 'Aprobat', value: 'approved' },
        { label: 'Blocat', value: 'blocked' },
      ],
    },
    {
      name: 'automationDecision',
      type: 'select',
      required: true,
      defaultValue: 'review',
      index: true,
      options: [
        { label: 'Eligibil AUTO', value: 'autoPublish' },
        { label: 'Necesită review', value: 'review' },
        { label: 'Blocat', value: 'blocked' },
      ],
    },
    {
      name: 'decisionReason',
      type: 'textarea',
    },
    {
      name: 'eventFingerprint',
      type: 'text',
      index: true,
    },
    {
      name: 'sourceFingerprint',
      type: 'text',
      index: true,
    },
    {
      name: 'generatAutomat',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'significantUpdatedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
  ],

  hooks: {
    beforeOperation: [
      enforceFlashPublicationRBAC,
    ],
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data

        const valid =
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/

        const current =
          data.slug ?? originalDoc?.slug

        if (current && valid.test(current)) {
          return data
        }

        const source =
          data.titlu ?? originalDoc?.titlu ?? ''

        if (!source) return data

        const base = source
          .toLowerCase()
          .replace(/[ăâ]/g, 'a')
          .replace(/î/g, 'i')
          .replace(/[șş]/g, 's')
          .replace(/[țţ]/g, 't')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 70)
          .replace(/-+$/g, '')

        const suffix =
          Math.random().toString(36).slice(2, 10)

        data.slug = base
          ? `${base}-${suffix}`
          : suffix

        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc, req }) => {
        if (!data) return data

        if (req.user?.rol !== 'admin') {
          const status =
            data.editorialStatus ??
            originalDoc?.editorialStatus

          if (
            status === 'approved' ||
            status === 'blocked'
          ) {
            data.editorialStatus = 'review'
          }
        }

        const publicationStatus =
          data._status ?? originalDoc?._status

        if (publicationStatus === 'published') {
          data.editorialStatus = 'approved'

          if (
            !data.publishedAt &&
            !originalDoc?.publishedAt
          ) {
            data.publishedAt =
              new Date().toISOString()
          }
        }

        return data
      },
    ],
  },
}
