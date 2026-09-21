import dayjs from 'dayjs'

/** 全程只用本地日历日，避免跨时区时"已过去 N 天"差一天 */
export const DATE_FORMAT = 'YYYY-MM-DD'

export function today(): string {
  return dayjs().format(DATE_FORMAT)
}

/** from 到 to 相差的自然日数，to 默认今天 */
export function daysBetween(from: string, to: string = today()): number {
  return dayjs(to).startOf('day').diff(dayjs(from).startOf('day'), 'day')
}

export function formatDate(date: string): string {
  return dayjs(date).format('YYYY 年 M 月 D 日')
}

/** 日期输入框的上限：不允许补录未来的日期 */
export function maxSelectableDate(): string {
  return today()
}
