export const FM_DB = 'ARAERP';
export const FM_API = import.meta.env.DEV ? '/fm-api/fmi/data/vLatest' : '/fmi/data/vLatest';

const FILEMAKER_BASIC_AUTH = `Basic ${btoa('DataAPI:didim!7977')}`;

export function sessionHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: FILEMAKER_BASIC_AUTH,
  };
}
