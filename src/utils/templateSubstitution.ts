import { format } from 'date-fns'

export type TemplateContext = {
  title?: string | null
  type?: string | null
  now?: Date
}

const TOKEN_PATTERN = /\{\{(\w+)(?::([^}]+))?\}\}/g

function resolveToken(name: string, arg: string | undefined, ctx: TemplateContext, now: Date): string | null {
  if (name === 'date' || name === 'time') {
    const pattern = arg ?? (name === 'date' ? 'yyyy-MM-dd' : 'HH:mm')
    return safeFormat(now, pattern)
  }
  if (name === 'title') return ctx.title ?? ''
  if (name === 'type') return ctx.type ?? ''
  return null
}

function safeFormat(now: Date, pattern: string): string | null {
  try {
    return format(now, pattern)
  } catch {
    return null
  }
}

/** Resolve `{{var}}` / `{{var:fmt}}` tokens in `template` against `ctx`. Unknown or
 *  malformed tokens are left verbatim so typos stay visible and predictable. */
export function substituteTemplate(template: string, ctx: TemplateContext = {}): string {
  const now = ctx.now ?? new Date()
  return template.replace(TOKEN_PATTERN, (match, name: string, arg: string | undefined) => {
    const resolved = resolveToken(name, arg, ctx, now)
    return resolved === null ? match : resolved
  })
}
