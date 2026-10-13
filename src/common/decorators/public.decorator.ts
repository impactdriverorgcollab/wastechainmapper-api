import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route that needs neither an API key nor a login, such as sign-in and the tier list. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
