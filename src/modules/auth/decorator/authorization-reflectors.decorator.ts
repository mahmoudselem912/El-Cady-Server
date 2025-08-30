import { SetMetadata } from '@nestjs/common';

export enum CoreUserEnum {
  ELCADY = 'ELCADY',
  CLIENT = 'CLIENT',
}

// Accepts one or multiple CoreUserEnum values
export const CORE_USER_TYPE_KEY = 'coreUserType';
export const CoreUserType = (...coreUserTypes: CoreUserEnum[]) =>
  SetMetadata(CORE_USER_TYPE_KEY, coreUserTypes);

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (permissions: string[], actions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { permissions, actions });
