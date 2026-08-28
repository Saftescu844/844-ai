import { APIError, type CollectionBeforeOperationHook, type CollectionConfig } from 'payload'

// ============================================================
//  USERI — autentificare + nivel abonament (pentru Stripe)
//  Colecția auth a platformei. Suportă comunitatea și conținutul premium.
// ============================================================
const protectLastAdminInvariant: CollectionBeforeOperationHook<'useri'> = async ({
  args,
  operation,
  req,
}) => {
  const isDelete = operation === 'delete' || operation === 'deleteByID'

  const isRoleDemotion =
    (operation === 'update' || operation === 'updateByID') &&
    'data' in args &&
    args.data?.rol !== undefined &&
    args.data.rol !== 'admin'

  if (!isDelete && !isRoleDemotion) {
    return
  }

  // Pentru cererile normale lăsăm access control-ul să respingă mai întâi
  // actorii neautorizați, fără să dezvăluim informații despre administratori.
  // Apelurile Local API cu overrideAccess rămân însă supuse invariantului.
  const overridesAccess = 'overrideAccess' in args && args.overrideAccess === true

  if (!overridesAccess && req.user?.rol !== 'admin') {
    return
  }

  const { totalDocs: totalAdmins } = await req.payload.count({
    collection: 'useri',
    overrideAccess: true,
    req,
    where: {
      rol: {
        equals: 'admin',
      },
    },
  })

  if (totalAdmins === 0) {
    return
  }

  let affectedAdmins = 0

  if ('id' in args && (typeof args.id === 'string' || typeof args.id === 'number')) {
    const result = await req.payload.count({
      collection: 'useri',
      overrideAccess: true,
      req,
      where: {
        and: [
          {
            id: {
              equals: args.id,
            },
          },
          {
            rol: {
              equals: 'admin',
            },
          },
        ],
      },
    })

    affectedAdmins = result.totalDocs
  } else if ('where' in args && args.where) {
    const result = await req.payload.count({
      collection: 'useri',
      overrideAccess: true,
      req,
      where: {
        and: [
          args.where,
          {
            rol: {
              equals: 'admin',
            },
          },
        ],
      },
    })

    affectedAdmins = result.totalDocs
  }

  if (affectedAdmins > 0 && affectedAdmins >= totalAdmins) {
    throw new APIError(
      'Operația este blocată deoarece ar elimina ultimul administrator al platformei.',
      409,
    )
  }
}
export const Useri: CollectionConfig = {
  slug: 'useri',
  labels: { singular: 'User', plural: 'Useri' },
  auth: {
    verify: true, // verificare email la înregistrare
    maxLoginAttempts: 5,
    lockTime: 600000, // 10 min
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'nume', 'rol', 'nivelAbonament'],
    group: 'Comunitate',
  },
  hooks: {
    beforeOperation: [protectLastAdminInvariant],
  },
  access: {
    admin: ({ req: { user } }) => user?.rol === 'admin' || user?.rol === 'editor',

    create: ({ req: { user } }) => user?.rol === 'admin',

    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.rol === 'admin') return true
      return { id: { equals: user.id } }
    },

    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.rol === 'admin') return true
      return { id: { equals: user.id } }
    },

    delete: ({ req: { user } }) => user?.rol === 'admin',
    unlock: ({ req: { user } }) => user?.rol === 'admin',
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      access: {
        // Schimbarea adresei necesită un flux explicit de reverificare.
        // Până la implementarea lui, emailul poate fi setat doar la creare.
        update: () => false,
      },
    },
    {
      name: '_verified',
      type: 'checkbox',
      access: {
        // Starea de verificare poate fi administrată manual doar de administratori.
        // Fluxul legitim de verificare prin token este gestionat intern de Payload.
        create: ({ req: { user } }) => user?.rol === 'admin',
        update: ({ req: { user } }) => user?.rol === 'admin',
      },
    },
    { name: 'nume', type: 'text' },
    {
      name: 'rol',
      type: 'select',
      saveToJWT: true,
      required: true,
      defaultValue: 'cititor',
      options: [
        { label: 'Cititor', value: 'cititor' },
        { label: 'Contributor (tânăr cercetător)', value: 'contributor' },
        { label: 'Editor', value: 'editor' },
        { label: 'Administrator', value: 'admin' },
      ],
      access: {
        // Numai administratorul poate atribui sau modifica roluri.
        create: ({ req: { user } }) => user?.rol === 'admin',
        update: ({ req: { user } }) => user?.rol === 'admin',
      },
    },
    {
      name: 'nivelAbonament',
      type: 'select',
      saveToJWT: true,
      defaultValue: 'gratuit',
      options: [
        { label: 'Gratuit', value: 'gratuit' },
        { label: 'Premium (newsletter+)', value: 'premium' },
        { label: 'Acces complet (cursuri)', value: 'complet' },
      ],
      index: true,
      access: {
        // Utilizatorii nu își pot acorda singuri niveluri de abonament.
        create: ({ req: { user } }) => user?.rol === 'admin',
        update: ({ req: { user } }) => user?.rol === 'admin',
      },
    },
    // === Câmpuri Stripe (integrare abonamente) ===
    {
      type: 'collapsible',
      label: 'Abonament Stripe',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'stripeCustomerId',
          type: 'text',
          admin: { readOnly: true },
          access: {
            read: ({ req: { user } }) => user?.rol === 'admin',
            create: ({ req: { user } }) => user?.rol === 'admin',
            update: ({ req: { user } }) => user?.rol === 'admin',
          },
        },
        {
          name: 'stripeSubscriptionId',
          type: 'text',
          admin: { readOnly: true },
          access: {
            read: ({ req: { user } }) => user?.rol === 'admin',
            create: ({ req: { user } }) => user?.rol === 'admin',
            update: ({ req: { user } }) => user?.rol === 'admin',
          },
        },
        {
          name: 'abonamentExpira',
          type: 'date',
          admin: { readOnly: true },
          access: {
            read: ({ req: { user } }) => user?.rol === 'admin',
            create: ({ req: { user } }) => user?.rol === 'admin',
            update: ({ req: { user } }) => user?.rol === 'admin',
          },
        },
      ],
    },
    {
      name: 'limbaPreferata',
      type: 'select',
      defaultValue: 'ro',
      options: [
        { label: 'Română', value: 'ro' },
        { label: 'English', value: 'en' },
      ],
    },
    { name: 'abonatNewsletter', type: 'checkbox', defaultValue: false },
  ],
}
