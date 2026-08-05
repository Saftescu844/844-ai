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
      ],
    },
  ],
}
