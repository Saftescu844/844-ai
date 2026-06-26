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
  fields: [
    { name: 'nume', type: 'text' },
    {
      name: 'rol',
      type: 'select',
      required: true,
      defaultValue: 'cititor',
      options: [
        { label: 'Cititor', value: 'cititor' },
        { label: 'Contributor (tânăr cercetător)', value: 'contributor' },
        { label: 'Editor', value: 'editor' },
        { label: 'Administrator', value: 'admin' },
      ],
      access: {
        // doar adminii pot schimba rolul
        update: ({ req: { user } }) => user?.rol === 'admin',
      },
    },
    {
      name: 'nivelAbonament',
      type: 'select',
      defaultValue: 'gratuit',
      options: [
        { label: 'Gratuit', value: 'gratuit' },
        { label: 'Premium (newsletter+)', value: 'premium' },
        { label: 'Acces complet (cursuri)', value: 'complet' },
      ],
      index: true,
    },
    // === Câmpuri Stripe (integrare abonamente) ===
    {
      type: 'collapsible',
      label: 'Abonament Stripe',
      admin: { initCollapsed: true },
      fields: [
        { name: 'stripeCustomerId', type: 'text', admin: { readOnly: true } },
        { name: 'stripeSubscriptionId', type: 'text', admin: { readOnly: true } },
        { name: 'abonamentExpira', type: 'date', admin: { readOnly: true } },
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
