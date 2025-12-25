const REST_DATETIME_LENGTH = 'yyyy-MM-dd HH:mm:ss'.length;

export function formatRestDatetime(date: Date): string {
  return date.toJSON().replace('T', ' ').slice(0, REST_DATETIME_LENGTH);
}
