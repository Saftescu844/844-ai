import {
  schedulePublishHandler,
  type SchedulePublishHandlerArgs,
} from '@payloadcms/ui/utilities/schedulePublishHandler'
import type { ServerFunction } from 'payload'

export const schedulePublishAdminOnly: ServerFunction<
  SchedulePublishHandlerArgs
> = async (args) => {
  const { user } = args.req

  if (!user || user.rol !== 'admin') {
    return {
      error: 'Doar administratorii pot programa sau anula publicarea.',
    }
  }

  return schedulePublishHandler(args)
}
