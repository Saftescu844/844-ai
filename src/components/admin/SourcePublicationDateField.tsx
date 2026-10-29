'use client'

import type { DateFieldClientComponent, Validate } from 'payload'
import { FieldDescription, FieldError, FieldLabel, useField, withCondition } from '@payloadcms/ui'
import { useCallback, useId } from 'react'

import {
  sourcePublicationCalendarDate,
  sourcePublicationTimestamp,
} from '@/lib/flash/sourcePublicationDate'

const SourcePublicationDateField: DateFieldClientComponent = ({ field, path, readOnly, validate }) => {
  const validateDate = useCallback<Validate>(
    (value, options) => validate ? validate(value, {
      ...options,
      type: 'date',
      name: field.name,
      required: field.required,
    }) : true,
    [field.name, field.required, validate],
  )
  const { value, setValue, disabled, showError, path: fieldPath } = useField<string | null>({
    potentiallyStalePath: path,
    validate: validateDate,
  })
  const locked = Boolean(readOnly || disabled || field.admin?.readOnly)
  const instanceId = useId()
  const id = `field-${fieldPath.replace(/\./g, '__')}-${instanceId}`

  return (
    <div className={`field-type date-time-field${showError ? ' error' : ''}${locked ? ' read-only' : ''}`}>
      <FieldLabel htmlFor={id} label={field.label || field.name} path={fieldPath} required={field.required} />
      <FieldError path={fieldPath} showError={showError} />
      <input
        id={id}
        name={fieldPath}
        type="date"
        value={sourcePublicationCalendarDate(value)}
        disabled={locked}
        aria-invalid={showError || undefined}
        aria-required={field.required || undefined}
        onChange={event => {
          if (!locked) setValue(sourcePublicationTimestamp(event.currentTarget.value))
        }}
      />
      <FieldDescription description={field.admin?.description} path={fieldPath} />
    </div>
  )
}

export default withCondition(SourcePublicationDateField)
