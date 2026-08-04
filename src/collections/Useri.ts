import type { CollectionConfig } from 'payload'

// ============================================================
//  USERI — autentificare + nivel abonament (pentru Stripe)
//  Colecția auth a platformei. Suportă comunitatea și conținutul premium.
// ============================================================

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
  access: {
    admin: ({ req: { user } }) =>
      user?.rol === 'admin' || user?.rol === 'editor',

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
