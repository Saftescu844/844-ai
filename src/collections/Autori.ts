import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
} from 'payload'

import type { Autori as AutoriDocument } from '../payload-types'
import {
  BlockquoteFeature,
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  ItalicFeature,
  lexicalEditor,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnderlineFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical'

const trimText = ({ value }: { value?: unknown }) =>
  typeof value === 'string' ? value.trim() : value

const requiredTrimmedText = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0
    ? true
    : 'Câmpul este obligatoriu.'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const isAdmin = (user: unknown) =>
  typeof user === 'object' &&
  user !== null &&
  'rol' in user &&
  (user as { rol?: unknown }).rol === 'admin'

const canAccessAuthorAdmin = (user: unknown) => {
  if (
    typeof user !== 'object' ||
    user === null ||
    !('rol' in user)
  ) {
    return false
  }

  const role = (user as { rol?: unknown }).rol

  return role === 'admin' || role === 'editor'
}

const validateHttpsUrl = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return true
  }

  if (typeof value !== 'string') {
    return 'Adresa trebuie să fie un URL valid.'
  }

  try {
    const url = new URL(value.trim())

    return url.protocol === 'https:'
      ? true
      : 'Adresa trebuie să utilizeze protocolul https.'
  } catch {
    return 'Adresa trebuie să fie un URL valid.'
  }
}

const validateOrcidUrl = (value: unknown) => {
  const httpsResult = validateHttpsUrl(value)

  if (httpsResult !== true || !value) {
    return httpsResult
  }

  if (typeof value !== 'string') {
    return 'Adresa ORCID nu este validă.'
  }

  try {
    const url = new URL(value.trim())
    const hostname = url.hostname.toLowerCase()
    const path = url.pathname.replace(/\/$/, '')

    if (
      hostname !== 'orcid.org' ||
      !/^\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(path)
    ) {
      return 'Adresa trebuie să fie un URL ORCID valid.'
    }

    return true
  } catch {
    return 'Adresa trebuie să fie un URL ORCID valid.'
  }
}

const hostnameMatches = (
  hostname: string,
  allowedDomains: string[],
) =>
  allowedDomains.some(
    (domain) =>
      hostname === domain ||
      hostname.endsWith(`.${domain}`),
  )

const validateSocialUrl = (
  value: unknown,
  siblingData: unknown,
) => {
  const httpsResult = validateHttpsUrl(value)

  if (httpsResult !== true || !value) {
    return httpsResult
  }

  if (
    typeof value !== 'string' ||
    typeof siblingData !== 'object' ||
    siblingData === null ||
    !('platform' in siblingData)
  ) {
    return true
  }

  const platform = (siblingData as { platform?: unknown }).platform

  if (typeof platform !== 'string' || platform === 'other') {
    return true
  }

  const allowedDomains: Record<string, string[]> = {
    linkedin: ['linkedin.com'],
    github: ['github.com'],
    youtube: ['youtube.com', 'youtu.be'],
    x: ['x.com', 'twitter.com'],
    facebook: ['facebook.com'],
    instagram: ['instagram.com'],
    researchGate: ['researchgate.net'],
    googleScholar: ['scholar.google.com'],
  }

  const domains = allowedDomains[platform]

  if (!domains) {
    return true
  }

  try {
    const hostname = new URL(value.trim()).hostname.toLowerCase()

    return hostnameMatches(hostname, domains)
      ? true
      : 'Domeniul URL nu corespunde platformei selectate.'
  } catch {
    return 'Adresa trebuie să fie un URL valid.'
  }
}

const asRecord = (
  value: unknown,
): Record<string, unknown> =>
  typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {}

const hasValue = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  value !== ''

const hasPublicContactData = (
  document: Record<string, unknown>,
) => {
  if (
    hasValue(document.publicEmail) ||
    hasValue(document.website) ||
    hasValue(document.institutionalProfile) ||
    hasValue(document.orcidUrl)
  ) {
    return true
  }

  const socialLinks = Array.isArray(document.socialLinks)
    ? document.socialLinks
    : []

  return socialLinks.some((socialLink) => {
    const item = asRecord(socialLink)

    return (
      item.enabled !== false &&
      hasValue(item.url)
    )
  })
}

const getLifecycleErrors = (
  document: Record<string, unknown>,
) => {
  const errors: string[] = []

  if (
    document.status === 'archived' &&
    (
      typeof document.archivalReason !== 'string' ||
      document.archivalReason.trim().length === 0
    )
  ) {
    errors.push(
      'Motivul arhivării este obligatoriu pentru un profil arhivat.',
    )
  }

  if (
    hasValue(document.consentWithdrawnAt) &&
    document.status !== 'inactive' &&
    document.status !== 'archived'
  ) {
    errors.push(
      'După retragerea consimțământului, profilul trebuie trecut în starea Inactiv sau Arhivat.',
    )
  }

  return errors
}

const getPublicationReadinessErrors = (
  document: Record<string, unknown>,
) => {
  const errors: string[] = []

  const editorialRoles = Array.isArray(document.editorialRoles)
    ? document.editorialRoles.filter(
        (role): role is string =>
          typeof role === 'string' && role.length > 0,
      )
    : []

  if (editorialRoles.length === 0) {
    errors.push(
      'Trebuie selectat cel puțin un rol editorial.',
    )
  }

  if (document.verificationStatus !== 'verified') {
    errors.push(
      'Starea verificării profesionale trebuie să fie Verificat.',
    )
  }

  if (document.publicationConsent !== true) {
    errors.push(
      'Consimțământul pentru publicarea profilului trebuie confirmat.',
    )
  }

  if (
    hasPublicContactData(document) &&
    document.publicContactConsent !== true
  ) {
    errors.push(
      'Datele profesionale de contact necesită consimțământ explicit pentru afișarea publică.',
    )
  }

  if (!hasValue(document.lastReviewedAt)) {
    errors.push(
      'Data ultimei verificări editoriale este obligatorie.',
    )
  }

  if (!hasValue(document.reviewedBy)) {
    errors.push(
      'Persoana care a verificat editorial profilul este obligatorie.',
    )
  }

  /*
   * Media nu conține încă metadatele complete aprobate
   * pentru licență / drept de utilizare.
   *
   * Până la implementarea separată a acelor metadate,
   * profilurile pot fi publicate fără imagini proprii,
   * dar nu cu profileImage sau socialImage configurat.
   */
  if (hasValue(document.profileImage)) {
    errors.push(
      'Fotografia nu poate fi publicată încă: schema Media nu documentează complet dreptul de utilizare.',
    )
  }

  if (hasValue(document.socialImage)) {
    errors.push(
      'Imaginea socială nu poate fi publicată încă: schema Media nu documentează complet dreptul de utilizare.',
    )
  }

  const isMedicalReviewer =
    document.isMedicalReviewer === true ||
    editorialRoles.includes('medicalReviewer')

  if (isMedicalReviewer) {
    const credentials = Array.isArray(document.credentials)
      ? document.credentials
      : []

    const currentYear = new Date().getUTCFullYear()

    const hasCurrentVerifiedCredential = credentials.some(
      (credential) => {
        const item = asRecord(credential)

        if (item.verified !== true) {
          return false
        }

        if (
          typeof item.yearExpires === 'number' &&
          item.yearExpires < currentYear
        ) {
          return false
        }

        return true
      },
    )

    if (!hasCurrentVerifiedCredential) {
      errors.push(
        'Un verificator medical trebuie să aibă cel puțin o calificare verificată și neexpirată.',
      )
    }

    if (hasValue(document.nextVerificationDue)) {
      const nextVerificationDue = Date.parse(
        String(document.nextVerificationDue),
      )

      if (
        Number.isFinite(nextVerificationDue) &&
        nextVerificationDue < Date.now()
      ) {
        errors.push(
          'Verificarea profesională a verificatorului medical este expirată.',
        )
      }
    }
  }

  return errors
}


const validateRomanianShortBioForPublication:
  CollectionBeforeChangeHook<AutoriDocument> = async ({
    data,
    operation,
    originalDoc,
    req,
  }) => {
    const status = data.status ?? originalDoc?.status

    if (status !== 'published') {
      return data
    }

    const hasText = (value: unknown) =>
      typeof value === 'string' &&
      value.trim().length > 0

    const fail = (): never => {
      throw new APIError(
        'Profilul de autor nu poate fi publicat. Biografia scurtă în limba română este obligatorie.',
        400,
      )
    }

    if (operation === 'create') {
      if (
        req.locale === 'en' ||
        req.locale === 'all'
      ) {
        throw new APIError(
          'Profilul de autor trebuie creat cu biografia scurtă în limba română înainte de publicarea dintr-o altă limbă.',
          400,
        )
      }

      if (!hasText(data.shortBio)) {
        fail()
      }

      return data
    }

    const sendsRomanianShortBio =
      (req.locale === 'ro' ||
        req.locale === undefined) &&
      Object.prototype.hasOwnProperty.call(
        data,
        'shortBio',
      )

    if (sendsRomanianShortBio) {
      if (!hasText(data.shortBio)) {
        fail()
      }

      return data
    }

    if (
      req.locale !== 'ro' &&
      req.locale !== 'en' &&
      req.locale !== undefined
    ) {
      throw new APIError(
        'Context de localizare neacceptat pentru publicarea profilului.',
        400,
      )
    }

    const originalAuthorId = originalDoc?.id

    if (originalAuthorId === undefined) {
      throw new APIError(
        'Profilul de autor nu poate fi publicat fără un document existent pentru verificarea localizării.',
        400,
      )
    }

    const roAuthor = await req.payload.findByID({
      collection: 'autori',
      id: originalAuthorId,
      locale: 'ro',
      fallbackLocale: false,
      depth: 0,
      overrideAccess: true,
      req,
      select: {
        shortBio: true,
      },
    })

    if (!hasText(roAuthor.shortBio)) {
      fail()
    }

    return data
  }

const validateMedicalReviewScopeForPublication:
  CollectionBeforeChangeHook<AutoriDocument> = async ({
    data,
    operation,
    originalDoc,
    req,
  }) => {
    const status =
      data.status ?? originalDoc?.status

    const editorialRoles =
      data.editorialRoles ??
      originalDoc?.editorialRoles ??
      []

    const isMedicalReviewer =
      (
        data.isMedicalReviewer ??
        originalDoc?.isMedicalReviewer
      ) === true ||
      editorialRoles.includes('medicalReviewer')

    if (
      status !== 'published' ||
      isMedicalReviewer !== true
    ) {
      return data
    }

    const hasText = (value: unknown) =>
      typeof value === 'string' &&
      value.trim().length > 0

    const fail = (): never => {
      throw new APIError(
        'Profilul de verificator medical nu poate fi publicat fără descrierea domeniului verificării medicale în limba română.',
        400,
      )
    }

    /*
     * La create publicat folosim limba implicită RO.
     * Publicarea directă din EN este deja blocată și de
     * regula shortBio, dar guard-ul rămâne independent.
     */
    if (operation === 'create') {
      if (
        req.locale === 'en' ||
        req.locale === 'all'
      ) {
        fail()
      }

      if (!hasText(data.medicalReviewScope)) {
        fail()
      }

      return data
    }

    /*
     * Dacă update-ul RO trimite explicit câmpul,
     * verificăm valoarea care urmează să fie salvată.
     */
    const sendsRomanianMedicalReviewScope =
      (req.locale === 'ro' ||
        req.locale === undefined) &&
      Object.prototype.hasOwnProperty.call(
        data,
        'medicalReviewScope',
      )

    if (sendsRomanianMedicalReviewScope) {
      if (!hasText(data.medicalReviewScope)) {
        fail()
      }

      return data
    }

    if (
      req.locale !== 'ro' &&
      req.locale !== 'en' &&
      req.locale !== undefined
    ) {
      throw new APIError(
        'Context de localizare neacceptat pentru verificarea domeniului medical.',
        400,
      )
    }

    const originalAuthorId = originalDoc?.id

    if (originalAuthorId === undefined) {
      throw new APIError(
        'Profilul de verificator medical nu poate fi publicat fără un document existent pentru verificarea localizării.',
        400,
      )
    }

    const roAuthor =
      await req.payload.findByID({
        collection: 'autori',
        id: originalAuthorId,
        locale: 'ro',
        fallbackLocale: false,
        depth: 0,
        overrideAccess: true,
        req,
        select: {
          medicalReviewScope: true,
        },
      })

    if (!hasText(roAuthor.medicalReviewScope)) {
      fail()
    }

    return data
  }

export const Autori: CollectionConfig = {
  slug: 'autori',

  labels: {
    singular: 'Autor',
    plural: 'Autori',
  },

  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'publicTitle', 'updatedAt'],
    group: 'Conținut',
  },

  access: {
    admin: ({ req: { user } }) =>
      canAccessAuthorAdmin(user),

    read: ({ req: { user } }) => {
      if (canAccessAuthorAdmin(user)) {
        return true
      }

      return {
        status: {
          equals: 'published',
        },
      }
    },

    create: ({ req: { user } }) => isAdmin(user),
    update: ({ req: { user } }) => isAdmin(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },

  /*
   * Access control-ul și regulile deterministe de publication readiness
   * sunt definite înainte de înregistrarea colecției în Payload.
   */

  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const document = {
          ...asRecord(originalDoc),
          ...asRecord(data),
        }

        const lifecycleErrors =
          getLifecycleErrors(document)

        if (lifecycleErrors.length > 0) {
          throw new APIError(
            [
              'Starea profilului de autor nu este validă.',
              ...lifecycleErrors,
            ].join(' '),
            400,
          )
        }

        if (document.status === 'published') {
          const errors =
            getPublicationReadinessErrors(document)

          if (errors.length > 0) {
            throw new APIError(
              [
                'Profilul de autor nu poate fi publicat.',
                ...errors,
              ].join(' '),
              400,
            )
          }

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
      validateRomanianShortBioForPublication,
      validateMedicalReviewScopeForPublication,
    ],
  },

  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identitate și profil public',
          fields: [
            {
              name: 'fullName',
              type: 'text',
              label: 'Nume complet',
              required: true,
              index: true,
              maxLength: 150,
              validate: requiredTrimmedText,
              hooks: {
                beforeValidate: [trimText],
              },
            },
            {
              name: 'slug',
              type: 'text',
              label: 'Slug',
              required: true,
              unique: true,
              index: true,
              validate: (value: unknown) => {
                if (typeof value !== 'string' || !value.trim()) {
                  return 'Slugul este obligatoriu.'
                }

                return slugPattern.test(value.trim())
                  ? true
                  : 'Slugul poate conține numai litere mici, cifre și cratime.'
              },
              hooks: {
                beforeValidate: [
                  ({ value, data, originalDoc }) => {
                    const currentValue =
                      typeof value === 'string' ? value.trim() : ''

                    if (currentValue) {
                      return currentValue
                    }

                    const existingSlug =
                      typeof originalDoc?.slug === 'string'
                        ? originalDoc.slug.trim()
                        : ''

                    if (existingSlug) {
                      return existingSlug
                    }

                    const fullName =
                      typeof data?.fullName === 'string'
                        ? data.fullName.trim()
                        : ''

                    return fullName ? slugify(fullName) : value
                  },
                ],
              },
              admin: {
                description:
                  'Identificator stabil pentru ruta publică. După creare nu se regenerează automat din nume.',
              },
            },
            {
              name: 'publicTitle',
              type: 'text',
              label: 'Titulatură publică',
              localized: true,
              maxLength: 160,
              hooks: {
                beforeValidate: [trimText],
              },
            },
            {
              name: 'primaryAffiliation',
              type: 'text',
              label: 'Afiliere principală',
              localized: true,
              maxLength: 180,
              hooks: {
                beforeValidate: [trimText],
              },
            },
            {
              name: 'profileImage',
              type: 'upload',
              label: 'Fotografie de profil',
              relationTo: 'media',
            },
            {
              name: 'shortBio',
              type: 'textarea',
              label: 'Biografie scurtă',
              localized: true,
              maxLength: 400,
              hooks: {
                beforeValidate: [trimText],
              },
              admin: {
                description:
                  'Recomandată pentru publicare și utilizată în carduri și antetul profilului.',
              },
            },
            {
              name: 'biography',
              type: 'richText',
              label: 'Biografie extinsă',
              localized: true,
              editor: lexicalEditor({
                features: () => [
                  ParagraphFeature(),
                  HeadingFeature({
                    enabledHeadingSizes: ['h2', 'h3'],
                  }),
                  BoldFeature(),
                  ItalicFeature(),
                  UnderlineFeature(),
                  LinkFeature(),
                  UnorderedListFeature(),
                  OrderedListFeature(),
                  BlockquoteFeature(),
                  FixedToolbarFeature(),
                ],
              }),
              admin: {
                description:
                  'Editor controlat: paragrafe, H2/H3, formatare de bază, linkuri, liste și citate.',
              },
            },
            {
              name: 'platformRoleDescription',
              type: 'textarea',
              label: 'Rol în cadrul platformei',
              localized: true,
              maxLength: 500,
              hooks: {
                beforeValidate: [trimText],
              },
            },
            {
              name: 'publicLocation',
              type: 'text',
              label: 'Localizare publică',
              localized: true,
              hooks: {
                beforeValidate: [trimText],
              },
              admin: {
                description:
                  'Numai o localizare generală, precum orașul sau țara. Nu introduceți adrese private.',
              },
            },
            {
              name: 'displayOrder',
              type: 'number',
              label: 'Ordine de afișare',
              defaultValue: 100,
            },
          ],
        },

        {
          label: 'Roluri și competențe',
          fields: [
            {
              name: 'editorialRoles',
              type: 'select',
              label: 'Roluri editoriale',
              hasMany: true,
              options: [
                { label: 'Autor', value: 'author' },
                { label: 'Coautor', value: 'coauthor' },
                {
                  label: 'Verificator editorial',
                  value: 'editorialReviewer',
                },
                {
                  label: 'Verificator medical',
                  value: 'medicalReviewer',
                },
                {
                  label: 'Verificator tehnic',
                  value: 'technicalReviewer',
                },
                {
                  label: 'Evaluator de instrumente AI',
                  value: 'toolEvaluator',
                },
                { label: 'Autor de curs', value: 'courseAuthor' },
                { label: 'Instructor', value: 'instructor' },
                {
                  label: 'Curator de conținut',
                  value: 'contentCurator',
                },
                { label: 'Expert extern', value: 'externalExpert' },
              ],
              admin: {
                description:
                  'Cel puțin un rol va deveni obligatoriu la publicarea profilului.',
              },
            },
            {
              name: 'expertiseAreas',
              type: 'array',
              label: 'Domenii de expertiză',
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  label: 'Domeniu',
                  required: true,
                  localized: true,
                  validate: requiredTrimmedText,
                  hooks: {
                    beforeValidate: [trimText],
                  },
                },
                {
                  name: 'description',
                  type: 'textarea',
                  label: 'Descriere',
                  localized: true,
                  hooks: {
                    beforeValidate: [trimText],
                  },
                },
                {
                  name: 'verified',
                  type: 'checkbox',
                  label: 'Verificat intern',
                  defaultValue: false,
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                  admin: {
                    description:
                      'Indicator intern. Nu va fi inclus în datele publice.',
                  },
                },
                {
                  name: 'order',
                  type: 'number',
                  label: 'Ordine',
                },
              ],
            },
            {
              name: 'specialties',
              type: 'array',
              label: 'Specializări',
              localized: true,
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  label: 'Specializare',
                  required: true,
                  validate: requiredTrimmedText,
                  hooks: {
                    beforeValidate: [trimText],
                  },
                },
                {
                  name: 'description',
                  type: 'textarea',
                  label: 'Descriere',
                  hooks: {
                    beforeValidate: [trimText],
                  },
                },
                {
                  name: 'order',
                  type: 'number',
                  label: 'Ordine',
                },
              ],
            },
            {
              name: 'contributionTypes',
              type: 'select',
              label: 'Tipuri de contribuție',
              hasMany: true,
              options: [
                { label: 'Articole', value: 'articles' },
                { label: 'Flash AI', value: 'flashAI' },
                { label: 'Cursuri', value: 'courses' },
                { label: 'Roadmaps', value: 'roadmaps' },
                {
                  label: 'Evaluări instrumente AI',
                  value: 'toolReviews',
                },
                { label: 'Apeluri UE', value: 'euCalls' },
                {
                  label: 'Conținut medical',
                  value: 'medicalContent',
                },
                {
                  label: 'Verificare editorială',
                  value: 'editorialReview',
                },
              ],
            },
            {
              name: 'isMedicalReviewer',
              type: 'checkbox',
              label: 'Eligibil pentru verificare medicală',
              defaultValue: false,
              access: {
                read: ({ req: { user } }) => isAdmin(user),
                create: ({ req: { user } }) => isAdmin(user),
                update: ({ req: { user } }) => isAdmin(user),
              },
              admin: {
                description:
                  'Indicator controlat intern. La publicare necesită o calificare verificată și neexpirată.',
              },
            },
            {
              name: 'medicalReviewScope',
              type: 'textarea',
              label: 'Domeniul verificării medicale',
              localized: true,
              hooks: {
                beforeValidate: [trimText],
              },
              admin: {
                condition: (data) =>
                  Boolean(data?.isMedicalReviewer) ||
                  (
                    Array.isArray(data?.editorialRoles) &&
                    data.editorialRoles.includes(
                      'medicalReviewer',
                    )
                  ),
                description:
                  'Descrie limitele domeniului în care persoana poate verifica informații medicale.',
              },
            },
          ],
        },

        {
          label: 'Calificări și verificare',
          fields: [
            {
              name: 'credentials',
              type: 'array',
              label: 'Calificări profesionale',
              access: {
                read: ({ req: { user } }) =>
                  canAccessAuthorAdmin(user),
              },
              fields: [
                {
                  name: 'credentialType',
                  type: 'select',
                  label: 'Tip calificare',
                  required: true,
                  options: [
                    {
                      label: 'Diplomă academică',
                      value: 'academicDegree',
                    },
                    {
                      label: 'Titlu profesional',
                      value: 'professionalTitle',
                    },
                    {
                      label: 'Licență / drept de practică medicală',
                      value: 'medicalLicense',
                    },
                    {
                      label: 'Certificare profesională',
                      value: 'certification',
                    },
                    {
                      label: 'Formare relevantă',
                      value: 'training',
                    },
                    {
                      label: 'Apartenență profesională',
                      value: 'membership',
                    },
                    {
                      label: 'Altă calificare',
                      value: 'other',
                    },
                  ],
                },
                {
                  name: 'title',
                  type: 'text',
                  label: 'Titlu',
                  required: true,
                  localized: true,
                  validate: requiredTrimmedText,
                  hooks: {
                    beforeValidate: [trimText],
                  },
                },
                {
                  name: 'institution',
                  type: 'text',
                  label: 'Instituție',
                  hooks: {
                    beforeValidate: [trimText],
                  },
                },
                {
                  name: 'country',
                  type: 'text',
                  label: 'Țară',
                  hooks: {
                    beforeValidate: [trimText],
                  },
                },
                {
                  name: 'yearObtained',
                  type: 'number',
                  label: 'An obținere',
                },
                {
                  name: 'yearExpires',
                  type: 'number',
                  label: 'An expirare',
                },
                {
                  name: 'identifier',
                  type: 'text',
                  label: 'Identificator intern',
                  hooks: {
                    beforeValidate: [trimText],
                  },
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'verificationUrl',
                  type: 'text',
                  label: 'URL verificare',
                  hooks: {
                    beforeValidate: [trimText],
                  },
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'publiclyVisible',
                  type: 'checkbox',
                  label: 'Poate fi afișată public',
                  defaultValue: false,
                  admin: {
                    description:
                      'Calificarea poate fi expusă public numai dacă este și verificată.',
                  },
                },
                {
                  name: 'verified',
                  type: 'checkbox',
                  label: 'Verificată',
                  defaultValue: false,
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'verifiedAt',
                  type: 'date',
                  label: 'Data verificării',
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'order',
                  type: 'number',
                  label: 'Ordine',
                },
              ],
            },

            {
              name: 'professionalIdentifiers',
              type: 'array',
              label: 'Identificatori profesionali',
              access: {
                read: ({ req: { user } }) =>
                  canAccessAuthorAdmin(user),
              },
              fields: [
                {
                  name: 'type',
                  type: 'select',
                  label: 'Tip',
                  options: [
                    { label: 'ORCID', value: 'orcid' },
                    {
                      label: 'Researcher ID',
                      value: 'researcherId',
                    },
                    {
                      label: 'Registru profesional',
                      value: 'professionalRegistry',
                    },
                    {
                      label: 'Registru medical',
                      value: 'medicalRegistry',
                    },
                    {
                      label: 'Profil instituțional',
                      value: 'institutionalProfile',
                    },
                    { label: 'Altul', value: 'other' },
                  ],
                },
                {
                  name: 'value',
                  type: 'text',
                  label: 'Valoare',
                  required: true,
                  validate: requiredTrimmedText,
                  hooks: {
                    beforeValidate: [trimText],
                  },
                },
                {
                  name: 'publiclyVisible',
                  type: 'checkbox',
                  label: 'Vizibil public',
                  defaultValue: false,
                },
                {
                  name: 'verificationUrl',
                  type: 'text',
                  label: 'URL verificare',
                  hooks: {
                    beforeValidate: [trimText],
                  },
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'verified',
                  type: 'checkbox',
                  label: 'Verificat',
                  defaultValue: false,
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
              ],
            },

            {
              name: 'verificationStatus',
              type: 'select',
              label: 'Starea verificării profesionale',
              required: true,
              defaultValue: 'pending',
              options: [
                {
                  label: 'În așteptarea verificării',
                  value: 'pending',
                },
                {
                  label: 'Verificat parțial',
                  value: 'partiallyVerified',
                },
                {
                  label: 'Verificat',
                  value: 'verified',
                },
                {
                  label: 'Verificare expirată',
                  value: 'expired',
                },
                {
                  label: 'Respins',
                  value: 'rejected',
                },
              ],
              access: {
                read: ({ req: { user } }) => isAdmin(user),
                create: ({ req: { user } }) => isAdmin(user),
                update: ({ req: { user } }) => isAdmin(user),
              },
            },

            {
              type: 'collapsible',
              label: 'Verificare internă',
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'verifiedAt',
                  type: 'date',
                  label: 'Data verificării profilului',
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'verifiedBy',
                  type: 'relationship',
                  label: 'Verificat de',
                  relationTo: 'useri',
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'verificationSource',
                  type: 'textarea',
                  label: 'Sursa verificării',
                  hooks: {
                    beforeValidate: [trimText],
                  },
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'nextVerificationDue',
                  type: 'date',
                  label: 'Următoarea verificare',
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'verificationNotes',
                  type: 'textarea',
                  label: 'Observații interne',
                  hooks: {
                    beforeValidate: [trimText],
                  },
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'documentsReviewed',
                  type: 'checkbox',
                  label: 'Documente verificate',
                  defaultValue: false,
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Linkuri profesionale',
          fields: [
            {
              name: 'publicEmail',
              type: 'email',
              label: 'E-mail profesional public',
              access: {
                read: ({ req: { user } }) =>
                  canAccessAuthorAdmin(user),
              },
              admin: {
                description:
                  'Se completează numai cu acordul explicit al persoanei.',
              },
            },
            {
              name: 'website',
              type: 'text',
              label: 'Website profesional',
              access: {
                read: ({ req: { user } }) =>
                  canAccessAuthorAdmin(user),
              },
              validate: validateHttpsUrl,
              hooks: {
                beforeValidate: [trimText],
              },
            },
            {
              name: 'institutionalProfile',
              type: 'text',
              label: 'Profil instituțional',
              access: {
                read: ({ req: { user } }) =>
                  canAccessAuthorAdmin(user),
              },
              validate: validateHttpsUrl,
              hooks: {
                beforeValidate: [trimText],
              },
            },
            {
              name: 'orcidUrl',
              type: 'text',
              label: 'Profil ORCID',
              access: {
                read: ({ req: { user } }) =>
                  canAccessAuthorAdmin(user),
              },
              validate: validateOrcidUrl,
              hooks: {
                beforeValidate: [trimText],
              },
            },
            {
              name: 'socialLinks',
              type: 'array',
              label: 'Linkuri sociale și profesionale',
              maxRows: 8,
              access: {
                read: ({ req: { user } }) =>
                  canAccessAuthorAdmin(user),
              },
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  label: 'Platformă',
                  required: true,
                  options: [
                    { label: 'LinkedIn', value: 'linkedin' },
                    { label: 'GitHub', value: 'github' },
                    { label: 'YouTube', value: 'youtube' },
                    { label: 'X', value: 'x' },
                    { label: 'Facebook', value: 'facebook' },
                    { label: 'Instagram', value: 'instagram' },
                    {
                      label: 'ResearchGate',
                      value: 'researchGate',
                    },
                    {
                      label: 'Google Scholar',
                      value: 'googleScholar',
                    },
                    { label: 'Altă platformă', value: 'other' },
                  ],
                },
                {
                  name: 'label',
                  type: 'text',
                  label: 'Etichetă publică',
                  localized: true,
                  hooks: {
                    beforeValidate: [trimText],
                  },
                },
                {
                  name: 'url',
                  type: 'text',
                  label: 'URL',
                  required: true,
                  hooks: {
                    beforeValidate: [trimText],
                  },
                  validate: (
                    value: unknown,
                    { siblingData }: { siblingData?: unknown },
                  ) => validateSocialUrl(value, siblingData),
                },
                {
                  name: 'enabled',
                  type: 'checkbox',
                  label: 'Activ',
                  defaultValue: true,
                },
                {
                  name: 'order',
                  type: 'number',
                  label: 'Ordine',
                },
              ],
            },
          ],
        },

        {
          label: 'Transparență și consimțământ',
          fields: [
            {
              name: 'conflictOfInterestStatement',
              type: 'textarea',
              label: 'Declarație privind conflictele de interese',
              localized: true,
              maxLength: 1000,
              hooks: {
                beforeValidate: [trimText],
              },
            },
            {
              name: 'affiliationsAndSponsorships',
              type: 'array',
              label: 'Afilieri și sponsorizări',
              access: {
                read: ({ req: { user } }) =>
                  canAccessAuthorAdmin(user),
              },
              fields: [
                {
                  name: 'organization',
                  type: 'text',
                  label: 'Organizație',
                  required: true,
                  validate: requiredTrimmedText,
                  hooks: {
                    beforeValidate: [trimText],
                  },
                },
                {
                  name: 'relationshipType',
                  type: 'select',
                  label: 'Tipul relației',
                  required: true,
                  options: [
                    {
                      label: 'Angajare',
                      value: 'employment',
                    },
                    {
                      label: 'Consultanță',
                      value: 'consulting',
                    },
                    {
                      label: 'Finanțare pentru cercetare',
                      value: 'researchFunding',
                    },
                    {
                      label: 'Sponsorizare',
                      value: 'sponsorship',
                    },
                    {
                      label: 'Parteneriat',
                      value: 'partnership',
                    },
                    {
                      label: 'Rol consultativ',
                      value: 'advisoryRole',
                    },
                    {
                      label: 'Participație / interes financiar',
                      value: 'ownership',
                    },
                    {
                      label: 'Remunerare pentru prezentări',
                      value: 'speakerFee',
                    },
                    {
                      label: 'Altă relație relevantă',
                      value: 'other',
                    },
                  ],
                },
                {
                  name: 'description',
                  type: 'textarea',
                  label: 'Descriere',
                  localized: true,
                  hooks: {
                    beforeValidate: [trimText],
                  },
                },
                {
                  name: 'startDate',
                  type: 'date',
                  label: 'Data începerii',
                },
                {
                  name: 'endDate',
                  type: 'date',
                  label: 'Data încheierii',
                },
                {
                  name: 'currentlyActive',
                  type: 'checkbox',
                  label: 'Relație activă',
                  defaultValue: false,
                },
                {
                  name: 'publiclyVisible',
                  type: 'checkbox',
                  label: 'Vizibilă public',
                  defaultValue: true,
                  admin: {
                    description:
                      'Se păstrează activ numai pentru relațiile relevante pentru transparența editorială.',
                  },
                },
                {
                  name: 'verified',
                  type: 'checkbox',
                  label: 'Verificată intern',
                  defaultValue: false,
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
              ],
            },
            {
              name: 'aiUseDisclosure',
              type: 'textarea',
              label: 'Declarație privind utilizarea AI',
              localized: true,
              hooks: {
                beforeValidate: [trimText],
              },
            },
            {
              name: 'publicationConsent',
              type: 'checkbox',
              label: 'Consimțământ pentru publicarea profilului',
              defaultValue: false,
              access: {
                read: ({ req: { user } }) => isAdmin(user),
                create: ({ req: { user } }) => isAdmin(user),
                update: ({ req: { user } }) => isAdmin(user),
              },
              admin: {
                description:
                  'Va fi obligatoriu logic înainte de trecerea profilului în starea publicată.',
              },
            },
            {
              type: 'collapsible',
              label: 'Consimțământ intern',
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'consentConfirmedAt',
                  type: 'date',
                  label: 'Data confirmării consimțământului',
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'consentConfirmedBy',
                  type: 'relationship',
                  label: 'Consimțământ confirmat de',
                  relationTo: 'useri',
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'consentScope',
                  type: 'textarea',
                  label: 'Domeniul consimțământului',
                  hooks: {
                    beforeValidate: [trimText],
                  },
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'profileImageConsent',
                  type: 'checkbox',
                  label: 'Consimțământ pentru fotografie',
                  defaultValue: false,
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'publicContactConsent',
                  type: 'checkbox',
                  label: 'Consimțământ pentru date publice de contact',
                  defaultValue: false,
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'consentWithdrawnAt',
                  type: 'date',
                  label: 'Data retragerii consimțământului',
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
                {
                  name: 'consentNotes',
                  type: 'textarea',
                  label: 'Observații privind consimțământul',
                  hooks: {
                    beforeValidate: [trimText],
                  },
                  access: {
                    read: ({ req: { user } }) => isAdmin(user),
                    create: ({ req: { user } }) => isAdmin(user),
                    update: ({ req: { user } }) => isAdmin(user),
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Publicare și ciclu de viață',
          fields: [
            {
              name: 'status',
              type: 'select',
              label: 'Starea profilului',
              required: true,
              defaultValue: 'draft',
              index: true,
              options: [
                {
                  label: 'Draft',
                  value: 'draft',
                },
                {
                  label: 'În verificare',
                  value: 'pendingVerification',
                },
                {
                  label: 'Verificat',
                  value: 'verified',
                },
                {
                  label: 'Publicat',
                  value: 'published',
                },
                {
                  label: 'Inactiv',
                  value: 'inactive',
                },
                {
                  label: 'Arhivat',
                  value: 'archived',
                },
              ],
              access: {
                create: ({ req: { user } }) => isAdmin(user),
                update: ({ req: { user } }) => isAdmin(user),
              },
              admin: {
                position: 'sidebar',
                description:
                  'Numai administratorul poate modifica starea profilului în prima implementare.',
              },
            },
            {
              name: 'publishedAt',
              type: 'date',
              label: 'Data primei publicări',
              admin: {
                position: 'sidebar',
                readOnly: true,
                description:
                  'Este completată automat la prima trecere în starea Publicat.',
              },
            },
            {
              name: 'lastReviewedAt',
              type: 'date',
              label: 'Ultima verificare editorială',
              admin: {
                position: 'sidebar',
              },
            },
            {
              name: 'nextReviewDue',
              type: 'date',
              label: 'Următoarea revizuire',
              admin: {
                position: 'sidebar',
              },
            },
            {
              name: 'inactiveAt',
              type: 'date',
              label: 'Data trecerii în inactiv',
              admin: {
                position: 'sidebar',
              },
            },
            {
              name: 'archivedAt',
              type: 'date',
              label: 'Data arhivării',
              admin: {
                position: 'sidebar',
              },
            },
            {
              name: 'reviewedBy',
              type: 'relationship',
              label: 'Verificat editorial de',
              relationTo: 'useri',
              access: {
                read: ({ req: { user } }) => isAdmin(user),
                create: ({ req: { user } }) => isAdmin(user),
                update: ({ req: { user } }) => isAdmin(user),
              },
              admin: {
                description:
                  'Câmp intern pentru trasabilitatea verificării editoriale.',
              },
            },
            {
              name: 'archivalReason',
              type: 'textarea',
              label: 'Motivul arhivării',
              hooks: {
                beforeValidate: [trimText],
              },
              access: {
                read: ({ req: { user } }) => isAdmin(user),
                create: ({ req: { user } }) => isAdmin(user),
                update: ({ req: { user } }) => isAdmin(user),
              },
              admin: {
                condition: (data) => data?.status === 'archived',
                description:
                  'Obligatoriu logic atunci când profilul este în starea Arhivat.',
              },
            },
          ],
        },
        {
          label: 'Relații și SEO',
          fields: [
            {
              name: 'linkedUser',
              type: 'relationship',
              relationTo: 'useri',
              label: 'Cont Useri asociat',
              access: {
                read: ({ req: { user } }) => isAdmin(user),
                create: ({ req: { user } }) => isAdmin(user),
                update: ({ req: { user } }) => isAdmin(user),
              },
              admin: {
                description:
                  'Relație internă opțională. Asocierea nu acordă drepturi de acces și nu creează automat un profil public.',
              },
            },
            {
              name: 'metaTitle',
              type: 'text',
              label: 'Titlu SEO',
              localized: true,
              maxLength: 70,
              hooks: {
                beforeValidate: [trimText],
              },
              admin: {
                description:
                  'Opțional. Frontendul va utiliza fallbackul aprobat când lipsește.',
              },
            },
            {
              name: 'metaDescription',
              type: 'textarea',
              label: 'Descriere SEO',
              localized: true,
              maxLength: 170,
              hooks: {
                beforeValidate: [trimText],
              },
              admin: {
                description:
                  'Opțional. Frontendul va utiliza biografia scurtă ca fallback.',
              },
            },
            {
              name: 'socialImage',
              type: 'upload',
              label: 'Imagine socială',
              relationTo: 'media',
              admin: {
                description:
                  'Opțional. Fallback: fotografia autorului, apoi imaginea globală din SiteSettings.',
              },
            },
            {
              name: 'robots',
              type: 'select',
              label: 'Indexare',
              required: true,
              defaultValue: 'indexFollow',
              options: [
                {
                  label: 'Index, follow',
                  value: 'indexFollow',
                },
                {
                  label: 'Noindex, follow',
                  value: 'noindexFollow',
                },
                {
                  label: 'Noindex, nofollow',
                  value: 'noindexNofollow',
                },
              ],
              admin: {
                description:
                  'Frontendul va forța noindex pentru orice profil care nu este în starea Published.',
              },
            },
          ],
        },
      ],
    },
  ],
}
