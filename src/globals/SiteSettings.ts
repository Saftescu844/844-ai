import type { GlobalConfig } from "payload"

const trimText = ({ value }: { value?: unknown }) =>
  typeof value === "string" ? value.trim() : value

const requiredTrimmedText = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? true
    : "Câmpul este obligatoriu și nu poate conține numai spații."

const validateNavigationHref = (value: unknown, linkType: unknown) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "Destinația este obligatorie."
  }

  const href = value.trim()

  if (linkType === "internal") {
    return href.startsWith("/") && !href.startsWith("//")
      ? true
      : "Linkurile interne trebuie să înceapă cu / și să nu conțină un domeniu."
  }

  if (linkType === "external") {
    try {
      return new URL(href).protocol === "https:"
        ? true
        : "Linkurile externe trebuie să utilizeze https."
    } catch {
      return "Linkul extern nu este valid."
    }
  }

  return "Selectează tipul linkului."
}

const validateLanguageSettings = (value: unknown) => {
  if (typeof value !== "object" || value === null) {
    return "Configurarea limbilor este obligatorie."
  }

  const settings = value as {
    availableLanguages?: unknown
    defaultLanguage?: unknown
  }

  if (
    !Array.isArray(settings.availableLanguages) ||
    settings.availableLanguages.length === 0
  ) {
    return "Configurează cel puțin o limbă."
  }

  const languages = settings.availableLanguages.filter(
    (language): language is Record<string, unknown> =>
      typeof language === "object" && language !== null,
  )

  const codes = languages
    .map((language) => language.code)
    .filter((code): code is string => typeof code === "string")

  if (new Set(codes).size !== codes.length) {
    return "Fiecare limbă poate fi configurată o singură dată."
  }

  const activeCodes = languages
    .filter((language) => language.enabled !== false)
    .map((language) => language.code)
    .filter((code): code is string => typeof code === "string")

  if (activeCodes.length === 0) {
    return "Cel puțin o limbă trebuie să fie activă."
  }

  if (
    typeof settings.defaultLanguage !== "string" ||
    !activeCodes.includes(settings.defaultLanguage)
  ) {
    return "Limba implicită trebuie să existe în listă și să fie activă."
  }

  return true
}

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Setări site",
  admin: {
    group: "Configurare",
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) => user?.rol === "admin",
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Identitate",
          fields: [
            {
              name: "identity",
              type: "group",
              label: "Identitatea site-ului",
              fields: [
                {
                  name: "siteName",
                  type: "text",
                  label: "Numele platformei",
                  required: true,
                  localized: true,
                  maxLength: 80,
                  validate: requiredTrimmedText,
                  hooks: { beforeValidate: [trimText] },
                  admin: {
                    description: "Denumirea completă a platformei.",
                  },
                },
                {
                  name: "shortName",
                  type: "text",
                  label: "Denumire scurtă",
                  required: true,
                  localized: true,
                  maxLength: 30,
                  validate: requiredTrimmedText,
                  hooks: { beforeValidate: [trimText] },
                  admin: {
                    description: "Denumirea compactă utilizată în interfață.",
                  },
                },
                {
                  name: "tagline",
                  type: "textarea",
                  label: "Descriere scurtă",
                  localized: true,
                  maxLength: 160,
                  hooks: { beforeValidate: [trimText] },
                  admin: {
                    description: "Mesajul scurt care descrie platforma.",
                  },
                },
                {
                  name: "logoPrimary",
                  type: "upload",
                  label: "Logo principal",
                  relationTo: "media",
                  required: false,
                },
                {
                  name: "logoAlternative",
                  type: "upload",
                  label: "Logo alternativ",
                  relationTo: "media",
                  required: false,
                },
                {
                  name: "favicon",
                  type: "upload",
                  label: "Favicon",
                  relationTo: "media",
                  required: false,
                },
              ],
            },
          ],
        },
        {
          label: "Navigație",
          fields: [
            {
              name: "navigation",
              type: "group",
              label: "Navigație și acțiuni",
              fields: [
                {
                  name: "primaryNavigation",
                  type: "array",
                  label: "Navigație principală",
                  maxRows: 8,
                  fields: [
                    {
                      name: "label",
                      type: "text",
                      label: "Etichetă",
                      required: true,
                      localized: true,
                      validate: requiredTrimmedText,
                      hooks: { beforeValidate: [trimText] },
                    },
                    {
                      name: "linkType",
                      type: "select",
                      label: "Tipul linkului",
                      required: true,
                      defaultValue: "internal",
                      options: [
                        { label: "Intern", value: "internal" },
                        { label: "Extern", value: "external" },
                      ],
                    },
                    {
                      name: "href",
                      type: "text",
                      label: "Destinație",
                      required: true,
                      localized: true,
                      validate: (
                        value: unknown,
                        { siblingData }: { siblingData?: Record<string, unknown> },
                      ) => validateNavigationHref(value, siblingData?.linkType),
                      hooks: { beforeValidate: [trimText] },
                    },
                    {
                      name: "openInNewTab",
                      type: "checkbox",
                      label: "Deschide într-o filă nouă",
                      defaultValue: false,
                    },
                    {
                      name: "showInDesktop",
                      type: "checkbox",
                      label: "Afișează pe desktop",
                      defaultValue: true,
                    },
                    {
                      name: "showInMobile",
                      type: "checkbox",
                      label: "Afișează pe mobil",
                      defaultValue: true,
                    },
                    {
                      name: "enabled",
                      type: "checkbox",
                      label: "Activ",
                      defaultValue: true,
                    },
                  ],
                },
                {
                  name: "headerActions",
                  type: "array",
                  label: "Acțiuni în antet",
                  maxRows: 3,
                  fields: [
                    {
                      name: "label",
                      type: "text",
                      label: "Etichetă",
                      required: true,
                      localized: true,
                      validate: requiredTrimmedText,
                      hooks: { beforeValidate: [trimText] },
                    },
                    {
                      name: "actionType",
                      type: "select",
                      label: "Tipul acțiunii",
                      required: true,
                      defaultValue: "link",
                      options: [
                        { label: "Link", value: "link" },
                        { label: "Căutare", value: "search" },
                        { label: "Selector limbă", value: "languageSwitcher" },
                        { label: "Autentificare", value: "login" },
                      ],
                    },
                    {
                      name: "href",
                      type: "text",
                      label: "Destinație",
                      localized: true,
                      hooks: { beforeValidate: [trimText] },
                      admin: {
                        condition: (_, siblingData) =>
                          siblingData?.actionType === "link" ||
                          siblingData?.actionType === "login",
                      },
                      validate: (
                        value: unknown,
                        { siblingData }: { siblingData?: Record<string, unknown> },
                      ) => {
                        const actionType = siblingData?.actionType

                        if (actionType !== "link" && actionType !== "login") {
                          return true
                        }

                        const href =
                          typeof value === "string" ? value.trim() : ""

                        return validateNavigationHref(
                          value,
                          href.startsWith("/") ? "internal" : "external",
                        )
                      },
                    },
                    {
                      name: "style",
                      type: "select",
                      label: "Stil vizual",
                      required: true,
                      defaultValue: "link",
                      options: [
                        { label: "Link simplu", value: "link" },
                        { label: "Secundar", value: "secondary" },
                        { label: "Principal", value: "primary" },
                      ],
                    },
                    {
                      name: "enabled",
                      type: "checkbox",
                      label: "Activ",
                      defaultValue: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Limbi",
          fields: [
            {
              name: "languageSettings",
              type: "group",
              label: "Limbi și selector de limbă",
              validate: validateLanguageSettings,
              fields: [
                {
                  name: "availableLanguages",
                  type: "array",
                  label: "Limbi disponibile",
                  required: true,
                  minRows: 1,
                  maxRows: 2,
                  fields: [
                    {
                      name: "code",
                      type: "select",
                      label: "Codul limbii",
                      required: true,
                      options: [
                        { label: "Română", value: "ro" },
                        { label: "English", value: "en" },
                      ],
                    },
                    {
                      name: "label",
                      type: "text",
                      label: "Denumirea limbii",
                      required: true,
                      validate: requiredTrimmedText,
                      hooks: { beforeValidate: [trimText] },
                    },
                    {
                      name: "shortLabel",
                      type: "text",
                      label: "Denumire scurtă",
                      required: true,
                      validate: requiredTrimmedText,
                      hooks: { beforeValidate: [trimText] },
                    },
                    {
                      name: "enabled",
                      type: "checkbox",
                      label: "Activă",
                      defaultValue: true,
                    },
                    {
                      name: "order",
                      type: "number",
                      label: "Ordinea afișării",
                      required: true,
                      defaultValue: 0,
                      min: 0,
                    },
                  ],
                },
                {
                  name: "defaultLanguage",
                  type: "select",
                  label: "Limba implicită",
                  required: true,
                  defaultValue: "ro",
                  options: [
                    { label: "Română", value: "ro" },
                    { label: "English", value: "en" },
                  ],
                },
                {
                  name: "showLanguageSwitcher",
                  type: "checkbox",
                  label: "Afișează selectorul de limbă",
                  defaultValue: true,
                },
              ],
            },
          ],
        },
        {
          label: "Încredere",
          fields: [
            {
              name: "trustBar",
              type: "group",
              label: "Bară de încredere",
              fields: [
                {
                  name: "enabled",
                  type: "checkbox",
                  label: "Afișează bara de încredere",
                  defaultValue: true,
                },
                {
                  name: "items",
                  type: "array",
                  label: "Elemente de încredere",
                  maxRows: 4,
                  fields: [
                    {
                      name: "label",
                      type: "text",
                      label: "Mesaj de încredere",
                      required: true,
                      localized: true,
                      maxLength: 80,
                      validate: requiredTrimmedText,
                      hooks: { beforeValidate: [trimText] },
                    },
                    {
                      name: "icon",
                      type: "select",
                      label: "Pictogramă",
                      options: [
                        { label: "Verificat", value: "verified" },
                        { label: "Surse", value: "sources" },
                        { label: "Actualizat", value: "updated" },
                        { label: "Transparență", value: "transparent" },
                        { label: "Independent", value: "independent" },
                        { label: "Revizuire medicală", value: "medicalReview" },
                      ],
                    },
                    {
                      name: "description",
                      type: "textarea",
                      label: "Explicație",
                      localized: true,
                      maxLength: 200,
                      hooks: { beforeValidate: [trimText] },
                    },
                    {
                      name: "enabled",
                      type: "checkbox",
                      label: "Activ",
                      defaultValue: true,
                    },
                    {
                      name: "order",
                      type: "number",
                      label: "Ordinea afișării",
                      required: true,
                      defaultValue: 0,
                      min: 0,
                    },
                  ],
                },
                {
                  name: "methodologyLabel",
                  type: "text",
                  label: "Eticheta metodologiei",
                  localized: true,
                  maxLength: 80,
                  hooks: { beforeValidate: [trimText] },
                  admin: {
                    description: "Textul linkului către pagina metodologiei.",
                  },
                },
                {
                  name: "methodologyHref",
                  type: "text",
                  label: "Ruta metodologiei",
                  localized: true,
                  hooks: { beforeValidate: [trimText] },
                  validate: (value: unknown) => {
                    if (
                      value === undefined ||
                      value === null ||
                      value === ""
                    ) {
                      return true
                    }

                    return validateNavigationHref(value, "internal")
                  },
                  admin: {
                    description: "Rută internă, de exemplu /ro/metodologie.",
                  },
                },
              ],
            },
          ],
        },
        {
          label: "Metodologie",
          fields: [
            {
              name: "methodology",
              type: "group",
              label: "Metodologie și principii",
              fields: [
                {
                  name: "enabled",
                  type: "checkbox",
                  label: "Afișează secțiunea metodologie",
                  defaultValue: true,
                },
                {
                  name: "title",
                  type: "text",
                  label: "Titlu",
                  localized: true,
                  maxLength: 100,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "summary",
                  type: "textarea",
                  label: "Rezumat",
                  localized: true,
                  maxLength: 400,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "pageLabel",
                  type: "text",
                  label: "Eticheta paginii complete",
                  localized: true,
                  maxLength: 80,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "pageHref",
                  type: "text",
                  label: "Ruta paginii complete",
                  localized: true,
                  hooks: { beforeValidate: [trimText] },
                  validate: (value: unknown) => {
                    if (value === undefined || value === null || value === "") {
                      return true
                    }

                    return validateNavigationHref(value, "internal")
                  },
                  admin: {
                    description: "Rută internă, de exemplu /ro/metodologie.",
                  },
                },
                {
                  name: "principles",
                  type: "array",
                  label: "Principii",
                  maxRows: 6,
                  fields: [
                    {
                      name: "title",
                      type: "text",
                      label: "Titlul principiului",
                      required: true,
                      localized: true,
                      maxLength: 100,
                      validate: requiredTrimmedText,
                      hooks: { beforeValidate: [trimText] },
                    },
                    {
                      name: "description",
                      type: "textarea",
                      label: "Descrierea principiului",
                      required: true,
                      localized: true,
                      maxLength: 300,
                      validate: requiredTrimmedText,
                      hooks: { beforeValidate: [trimText] },
                    },
                    {
                      name: "enabled",
                      type: "checkbox",
                      label: "Activ",
                      defaultValue: true,
                    },
                    {
                      name: "order",
                      type: "number",
                      label: "Ordinea afișării",
                      required: true,
                      defaultValue: 0,
                      min: 0,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Newsletter",
          fields: [
            {
              name: "newsletter",
              type: "group",
              label: "Newsletter public",
              fields: [
                {
                  name: "enabled",
                  type: "checkbox",
                  label: "Afișează formularul newsletter",
                  defaultValue: true,
                },
                {
                  name: "title",
                  type: "text",
                  label: "Titlu",
                  localized: true,
                  maxLength: 100,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "description",
                  type: "textarea",
                  label: "Descriere",
                  localized: true,
                  maxLength: 300,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "emailLabel",
                  type: "text",
                  label: "Eticheta câmpului e-mail",
                  localized: true,
                  maxLength: 80,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "emailPlaceholder",
                  type: "text",
                  label: "Text orientativ pentru e-mail",
                  localized: true,
                  maxLength: 120,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "submitLabel",
                  type: "text",
                  label: "Textul butonului de înscriere",
                  localized: true,
                  maxLength: 80,
                  hooks: { beforeValidate: [trimText] },
                },

                {
                  name: "consentText",
                  type: "textarea",
                  label: "Text de consimțământ",
                  localized: true,
                  maxLength: 300,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "successMessage",
                  type: "text",
                  label: "Mesaj pentru înscriere reușită",
                  localized: true,
                  maxLength: 200,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "alreadySubscribedMessage",
                  type: "text",
                  label: "Mesaj pentru adresă deja înscrisă",
                  localized: true,
                  maxLength: 200,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "invalidEmailMessage",
                  type: "text",
                  label: "Mesaj pentru adresă invalidă",
                  localized: true,
                  maxLength: 200,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "genericErrorMessage",
                  type: "text",
                  label: "Mesaj pentru eroare generală",
                  localized: true,
                  maxLength: 200,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "privacyLabel",
                  type: "text",
                  label: "Eticheta politicii de confidențialitate",
                  localized: true,
                  maxLength: 100,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "privacyHref",
                  type: "text",
                  label: "Ruta politicii de confidențialitate",
                  localized: true,
                  hooks: { beforeValidate: [trimText] },
                  validate: (value: unknown) => {
                    if (value === undefined || value === null || value === "") {
                      return true
                    }

                    return validateNavigationHref(value, "internal")
                  },
                  admin: {
                    description: "Rută internă, de exemplu /ro/confidentialitate.",
                  },
                },
              ],
            },
          ],
        },
        {
          label: "Subsol",
          fields: [
            {
              name: "footer",
              type: "group",
              label: "Configurarea subsolului",
              fields: [
                {
                  name: "footerEnabled",
                  type: "checkbox",
                  label: "Afișează subsolul",
                  defaultValue: true,
                },
                {
                  name: "footerIntro",
                  type: "textarea",
                  label: "Text introductiv",
                  localized: true,
                  maxLength: 300,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "footerSections",
                  type: "array",
                  label: "Secțiuni",
                  maxRows: 5,
                  fields: [
                    {
                      name: "title",
                      type: "text",
                      label: "Titlul secțiunii",
                      required: true,
                      localized: true,
                      maxLength: 100,
                      validate: requiredTrimmedText,
                      hooks: { beforeValidate: [trimText] },
                    },
                    {
                      name: "enabled",
                      type: "checkbox",
                      label: "Activă",
                      defaultValue: true,
                    },
                    {
                      name: "order",
                      type: "number",
                      label: "Ordinea afișării",
                      required: true,
                      defaultValue: 0,
                      min: 0,
                    },
                    {
                      name: "links",
                      type: "array",
                      label: "Linkuri",
                      maxRows: 10,
                      fields: [
                        {
                          name: "label",
                          type: "text",
                          label: "Etichetă",
                          required: true,
                          localized: true,
                          maxLength: 100,
                          validate: requiredTrimmedText,
                          hooks: { beforeValidate: [trimText] },
                        },
                        {
                          name: "linkType",
                          type: "select",
                          label: "Tipul linkului",
                          required: true,
                          defaultValue: "internal",
                          options: [
                            { label: "Intern", value: "internal" },
                            { label: "Extern", value: "external" },
                          ],
                        },
                        {
                          name: "href",
                          type: "text",
                          label: "Destinație",
                          required: true,
                          localized: true,
                          validate: (
                            value: unknown,
                            { siblingData }: { siblingData?: Record<string, unknown> },
                          ) => validateNavigationHref(value, siblingData?.linkType),
                          hooks: { beforeValidate: [trimText] },
                        },
                        {
                          name: "openInNewTab",
                          type: "checkbox",
                          label: "Deschide într-o filă nouă",
                          defaultValue: false,
                        },
                        {
                          name: "enabled",
                          type: "checkbox",
                          label: "Activ",
                          defaultValue: true,
                        },
                        {
                          name: "order",
                          type: "number",
                          label: "Ordinea afișării",
                          required: true,
                          defaultValue: 0,
                          min: 0,
                        },
                      ],
                    },
                  ],
                },
                {
                  name: "copyrightText",
                  type: "text",
                  label: "Text copyright",
                  localized: true,
                  maxLength: 200,
                  hooks: { beforeValidate: [trimText] },
                },
              ],
            },
          ],
        },
        {
          label: "Contact",
          fields: [
            {
              name: "contact",
              type: "group",
              label: "Informații publice de contact",
              fields: [
                {
                  name: "enabled",
                  type: "checkbox",
                  label: "Afișează informațiile de contact",
                  defaultValue: true,
                },
                {
                  name: "contactTitle",
                  type: "text",
                  label: "Titlul secțiunii",
                  localized: true,
                  maxLength: 100,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "publicEmail",
                  type: "email",
                  label: "Adresă publică de e-mail",
                  required: false,
                  hooks: { beforeValidate: [trimText] },
                  admin: {
                    description: "Adresa afișată public pentru contact.",
                  },
                },
                {
                  name: "phone",
                  type: "text",
                  label: "Telefon public",
                  required: false,
                  maxLength: 40,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "address",
                  type: "textarea",
                  label: "Adresă",
                  required: false,
                  localized: true,
                  maxLength: 300,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "contactPageLabel",
                  type: "text",
                  label: "Eticheta paginii de contact",
                  localized: true,
                  maxLength: 100,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "contactPageHref",
                  type: "text",
                  label: "Ruta paginii de contact",
                  localized: true,
                  hooks: { beforeValidate: [trimText] },
                  validate: (value: unknown) => {
                    if (value === undefined || value === null || value === "") {
                      return true
                    }

                    return validateNavigationHref(value, "internal")
                  },
                  admin: {
                    description: "Rută internă, de exemplu /ro/contact.",
                  },
                },
              ],
            },
          ],
        },
        {
          label: "Rețele sociale",
          fields: [
            {
              name: "socialLinks",
              type: "array",
              label: "Linkuri către rețele sociale",
              maxRows: 8,
              fields: [
                {
                  name: "platform",
                  type: "select",
                  label: "Platformă",
                  required: true,
                  options: [
                    { label: "Facebook", value: "facebook" },
                    { label: "LinkedIn", value: "linkedin" },
                    { label: "YouTube", value: "youtube" },
                    { label: "Instagram", value: "instagram" },
                    { label: "X", value: "x" },
                    { label: "TikTok", value: "tiktok" },
                    { label: "GitHub", value: "github" },
                  ],
                },
                {
                  name: "label",
                  type: "text",
                  label: "Etichetă publică",
                  localized: true,
                  maxLength: 80,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "url",
                  type: "text",
                  label: "Adresă URL",
                  required: true,
                  validate: (value: unknown) =>
                    validateNavigationHref(value, "external"),
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "enabled",
                  type: "checkbox",
                  label: "Activ",
                  defaultValue: true,
                },
                {
                  name: "order",
                  type: "number",
                  label: "Ordinea afișării",
                  required: true,
                  defaultValue: 0,
                  min: 0,
                },
              ],
            },
          ],
        },
        {
          label: "Linkuri legale",
          fields: [
            {
              name: "legalLinks",
              type: "array",
              label: "Linkuri legale obligatorii",
              required: true,
              fields: [
                {
                  name: "label",
                  type: "text",
                  label: "Etichetă",
                  required: true,
                  localized: true,
                  maxLength: 100,
                  validate: requiredTrimmedText,
                  hooks: { beforeValidate: [trimText] },
                },
                {
                  name: "href",
                  type: "text",
                  label: "Rută legală",
                  required: true,
                  localized: true,
                  hooks: { beforeValidate: [trimText] },
                  validate: (value: unknown) =>
                    validateNavigationHref(value, "internal"),
                },
                {
                  name: "enabled",
                  type: "checkbox",
                  label: "Activ",
                  defaultValue: true,
                },
                {
                  name: "order",
                  type: "number",
                  label: "Ordinea afișării",
                  required: true,
                  defaultValue: 0,
                  min: 0,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
