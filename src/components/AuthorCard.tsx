import type {
  AuthorLanguage,
  PublicAuthorEditorialRole,
  PublicAuthorProfile,
} from '@/lib/authors'
import {
  getAuthorProfileHref,
} from '@/lib/authors-page'

export {
  getAuthorProfileHref,
} from '@/lib/authors-page'

export type AuthorCardProps = {
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

export function getAuthorInitials(
  fullName: string,
) {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return '?'

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    words[0].slice(0, 1) +
    words[words.length - 1].slice(0, 1)
  ).toUpperCase()
}

export default function AuthorCard({
  author,
  language,
}: AuthorCardProps) {
  const href = getAuthorProfileHref(
    language,
    author.slug,
  )

  const roles = author.editorialRoles
    .slice(0, 2)
    .map((role) => ROLE_LABELS[language][role])

  const ariaLabel =
    language === 'ro'
      ? `Vezi profilul autorului ${author.fullName}`
      : `View ${author.fullName}'s author profile`

  return (
    <a
      href={href}
      aria-label={ariaLabel}
      style={{
        display: 'block',
        border: '1px solid #e5e5e5',
        borderRadius: 10,
        padding: 16,
        color: 'inherit',
        textDecoration: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f1f1ef',
            color: '#444',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.03em',
          }}
        >
          {getAuthorInitials(author.fullName)}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              lineHeight: 1.3,
              color: '#1a1a1a',
            }}
          >
            {author.fullName}
          </h3>

          {author.publicTitle && (
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 14,
                color: '#444',
                lineHeight: 1.4,
              }}
            >
              {author.publicTitle}
            </p>
          )}

          {author.primaryAffiliation && (
            <p
              style={{
                margin: '3px 0 0',
                fontSize: 13,
                color: '#777',
                lineHeight: 1.4,
              }}
            >
              {author.primaryAffiliation}
            </p>
          )}
        </div>
      </div>

      {roles.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 12,
          }}
        >
          {roles.map((role) => (
            <span
              key={role}
              style={{
                padding: '3px 8px',
                borderRadius: 20,
                background: '#EEF4FB',
                color: '#185FA5',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {role}
            </span>
          ))}
        </div>
      )}

      {author.shortBio && (
        <p
          style={{
            margin: '12px 0 0',
            color: '#666',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {author.shortBio}
        </p>
      )}

      <div
        style={{
          marginTop: 12,
          fontSize: 13,
          fontWeight: 600,
          color: '#185FA5',
        }}
      >
        {language === 'ro'
          ? 'Vezi profilul →'
          : 'View profile →'}
      </div>
    </a>
  )
}
