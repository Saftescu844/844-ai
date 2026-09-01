import { RichText } from '@payloadcms/richtext-lexical/react'

import type {
  AuthorLanguage,
  PublicAuthorEditorialRole,
  PublicAuthorProfile,
} from '@/lib/authors'
import { getAuthorInitials } from '@/components/AuthorCard'

type AuthorProfileProps = {
  author: PublicAuthorProfile
  language: AuthorLanguage
}

const ROLE_LABELS: Record<
  AuthorLanguage,
  Record<PublicAuthorEditorialRole, string>
> = {
  ro: {
    author: 'Autor',
    coauthor: 'Coautor',
    editorialReviewer: 'Recenzor editorial',
    medicalReviewer: 'Verificator medical',
    technicalReviewer: 'Recenzor tehnic',
    toolEvaluator: 'Evaluator instrumente AI',
    courseAuthor: 'Autor curs',
    instructor: 'Instructor',
    contentCurator: 'Curator de conținut',
    externalExpert: 'Expert extern',
  },
  en: {
    author: 'Author',
    coauthor: 'Co-author',
    editorialReviewer: 'Editorial reviewer',
    medicalReviewer: 'Medical reviewer',
    technicalReviewer: 'Technical reviewer',
    toolEvaluator: 'AI tool evaluator',
    courseAuthor: 'Course author',
    instructor: 'Instructor',
    contentCurator: 'Content curator',
    externalExpert: 'External expert',
  },
}

function formatPublicDate(
  value: string | undefined,
  language: AuthorLanguage,
) {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(
    language === 'ro' ? 'ro-RO' : 'en-GB',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  ).format(date)
}

export default function AuthorProfile({
  author,
  language,
}: AuthorProfileProps) {
  const text =
    language === 'ro'
      ? {
          expertise: 'Domenii de expertiză',
          credentials: 'Calificări publice verificate',
          transparency: 'Transparență',
          links: 'Linkuri profesionale',
          conflict: 'Conflict de interese',
          aiUse: 'Utilizarea inteligenței artificiale',
          affiliations: 'Afilieri și colaborări relevante',
          medicalScope: 'Aria de verificare medicală',
          reviewed: 'Profil verificat ultima dată',
          fallback:
            'Unele informații nu sunt încă traduse în engleză și sunt afișate temporar în română.',
          website: 'Website',
          institutional: 'Profil instituțional',
          orcid: 'ORCID',
          email: 'E-mail profesional',
        }
      : {
          expertise: 'Areas of expertise',
          credentials: 'Verified public credentials',
          transparency: 'Transparency',
          links: 'Professional links',
          conflict: 'Conflict of interest',
          aiUse: 'Use of artificial intelligence',
          affiliations: 'Relevant affiliations and collaborations',
          medicalScope: 'Medical review scope',
          reviewed: 'Profile last reviewed',
          fallback:
            'Some information is not yet available in English and is temporarily shown in Romanian.',
          website: 'Website',
          institutional: 'Institutional profile',
          orcid: 'ORCID',
          email: 'Professional email',
        }

  const reviewedDate = formatPublicDate(
    author.lastReviewedAt,
    language,
  )

  const showFallbackNotice =
    language === 'en' &&
    author.localization.fallbackFrom === 'ro' &&
    author.localization.fallbackFields.length > 0

  const hasProfessionalLinks =
    Boolean(author.website) ||
    Boolean(author.institutionalProfile) ||
    Boolean(author.orcidUrl) ||
    Boolean(author.publicEmail) ||
    Boolean(author.socialLinks?.length)

  const hasTransparency =
    Boolean(author.conflictOfInterestStatement) ||
    Boolean(author.aiUseDisclosure) ||
    Boolean(author.affiliationsAndSponsorships?.length)

  return (
    <article
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '2.5rem 0',
      }}
    >
      <header
        style={{
          display: 'flex',
          gap: 18,
          alignItems: 'flex-start',
          marginBottom: 28,
        }}
      >
        {author.profileImage ? (
          <figure
            style={{
              margin: 0,
              width: 92,
              flexShrink: 0,
            }}
          >
            <img
              src={author.profileImage.url}
              alt={
                author.profileImage.alt ??
                author.fullName
              }
              width={72}
              height={72}
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block',
              }}
            />

            {author.profileImage.credit && (
              <figcaption
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  lineHeight: 1.25,
                  color: '#888',
                }}
              >
                {author.profileImage.credit}
              </figcaption>
            )}
          </figure>
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f1f1ef',
              color: '#444',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            {getAuthorInitials(author.fullName)}
          </div>
        )}

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 700,
              lineHeight: 1.2,
              color: '#1a1a1a',
            }}
          >
            {author.fullName}
          </h1>

          {author.publicTitle && (
            <p
              style={{
                margin: '7px 0 0',
                color: '#444',
                fontSize: 17,
                lineHeight: 1.4,
              }}
            >
              {author.publicTitle}
            </p>
          )}

          {author.primaryAffiliation && (
            <p
              style={{
                margin: '5px 0 0',
                color: '#777',
                fontSize: 14,
              }}
            >
              {author.primaryAffiliation}
            </p>
          )}

          {author.publicLocation && (
            <p
              style={{
                margin: '4px 0 0',
                color: '#888',
                fontSize: 13,
              }}
            >
              {author.publicLocation}
            </p>
          )}
        </div>
      </header>

      {showFallbackNotice && (
        <p
          role="note"
          style={{
            padding: '10px 14px',
            margin: '0 0 24px',
            background: '#f6f6f4',
            borderRadius: 8,
            color: '#666',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {text.fallback}
        </p>
      )}

      {author.platformRoleDescription && (
        <p
          style={{
            color: '#555',
            fontSize: 15,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {author.platformRoleDescription}
        </p>
      )}

      {author.biography ? (
        <div
          style={{
            fontSize: 16,
            lineHeight: 1.7,
            color: '#222',
            marginBottom: 30,
          }}
        >
          <RichText data={author.biography} />
        </div>
      ) : (
        author.shortBio && (
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: '#333',
              marginBottom: 30,
            }}
          >
            {author.shortBio}
          </p>
        )
      )}

      {author.editorialRoles.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 7,
            marginBottom: 30,
          }}
        >
          {author.editorialRoles.map((role) => (
            <span
              key={role}
              style={{
                padding: '4px 9px',
                borderRadius: 20,
                background: '#EEF4FB',
                color: '#185FA5',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {ROLE_LABELS[language][role]}
            </span>
          ))}
        </div>
      )}

      {author.expertiseAreas &&
        author.expertiseAreas.length > 0 && (
          <section style={{ marginTop: 30 }}>
            <h2
              style={{
                fontSize: 20,
                marginBottom: 14,
              }}
            >
              {text.expertise}
            </h2>

            <div
              style={{
                display: 'grid',
                gap: 10,
              }}
            >
              {author.expertiseAreas.map(
                (area, index) => (
                  <div
                    key={`${area.name}-${index}`}
                    style={{
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <strong>{area.name}</strong>

                    {area.description && (
                      <p
                        style={{
                          margin: '5px 0 0',
                          color: '#666',
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        {area.description}
                      </p>
                    )}
                  </div>
                ),
              )}
            </div>
          </section>
        )}

      {author.medicalReviewScope && (
        <section style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 20 }}>
            {text.medicalScope}
          </h2>

          <p
            style={{
              color: '#555',
              lineHeight: 1.6,
            }}
          >
            {author.medicalReviewScope}
          </p>
        </section>
      )}

      {author.credentials &&
        author.credentials.length > 0 && (
          <section style={{ marginTop: 30 }}>
            <h2
              style={{
                fontSize: 20,
                marginBottom: 14,
              }}
            >
              {text.credentials}
            </h2>

            <ul
              style={{
                paddingLeft: 20,
                lineHeight: 1.6,
              }}
            >
              {author.credentials.map(
                (credential, index) => (
                  <li
                    key={`${credential.title}-${index}`}
                    style={{
                      marginBottom: 8,
                    }}
                  >
                    <strong>
                      {credential.title}
                    </strong>

                    {credential.institution
                      ? ` — ${credential.institution}`
                      : ''}

                    {credential.yearObtained
                      ? ` (${credential.yearObtained})`
                      : ''}
                  </li>
                ),
              )}
            </ul>
          </section>
        )}

      {hasTransparency && (
        <section style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 20 }}>
            {text.transparency}
          </h2>

          {author.conflictOfInterestStatement && (
            <div style={{ marginTop: 12 }}>
              <strong>{text.conflict}</strong>
              <p
                style={{
                  color: '#555',
                  lineHeight: 1.6,
                }}
              >
                {
                  author.conflictOfInterestStatement
                }
              </p>
            </div>
          )}

          {author.aiUseDisclosure && (
            <div style={{ marginTop: 12 }}>
              <strong>{text.aiUse}</strong>
              <p
                style={{
                  color: '#555',
                  lineHeight: 1.6,
                }}
              >
                {author.aiUseDisclosure}
              </p>
            </div>
          )}

          {author.affiliationsAndSponsorships &&
            author.affiliationsAndSponsorships
              .length > 0 && (
              <div style={{ marginTop: 12 }}>
                <strong>
                  {text.affiliations}
                </strong>

                <ul
                  style={{
                    paddingLeft: 20,
                    lineHeight: 1.6,
                  }}
                >
                  {author.affiliationsAndSponsorships.map(
                    (affiliation, index) => (
                      <li
                        key={`${affiliation.organization}-${index}`}
                      >
                        {
                          affiliation.organization
                        }
                        {affiliation.description
                          ? ` — ${affiliation.description}`
                          : ''}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
        </section>
      )}

      {hasProfessionalLinks && (
        <section style={{ marginTop: 30 }}>
          <h2
            style={{
              fontSize: 20,
              marginBottom: 12,
            }}
          >
            {text.links}
          </h2>

          <ul
            style={{
              paddingLeft: 20,
              lineHeight: 1.8,
            }}
          >
            {author.website && (
              <li>
                <a
                  href={author.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {text.website}
                </a>
              </li>
            )}

            {author.institutionalProfile && (
              <li>
                <a
                  href={
                    author.institutionalProfile
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {text.institutional}
                </a>
              </li>
            )}

            {author.orcidUrl && (
              <li>
                <a
                  href={author.orcidUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {text.orcid}
                </a>
              </li>
            )}

            {author.publicEmail && (
              <li>
                <a
                  href={`mailto:${author.publicEmail}`}
                >
                  {text.email}
                </a>
              </li>
            )}

            {author.socialLinks?.map(
              (link, index) => (
                <li
                  key={`${link.url}-${index}`}
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label ||
                      link.platform}
                  </a>
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      {reviewedDate && (
        <p
          style={{
            marginTop: 36,
            paddingTop: 16,
            borderTop: '1px solid #e5e5e5',
            color: '#888',
            fontSize: 12,
          }}
        >
          {text.reviewed}: {reviewedDate}
        </p>
      )}
    </article>
  )
}
