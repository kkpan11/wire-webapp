/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {EnrollmentConfig} from '../E2EIdentityEnrollment';
import {MLSStatuses, WireIdentity, isFreshMLSSelfClient} from '../E2EIdentityVerification';

/* eslint-disable no-magic-numbers */

enum TIME_IN_MILLIS {
  SECOND = 1000,
  MINUTE = SECOND * 60,
  HOUR = MINUTE * 60,
  DAY = HOUR * 24,
  WEEK = DAY * 7,
  YEAR = DAY * 365,
}

export const ONE_MINUTE = TIME_IN_MILLIS.MINUTE;
export const FIVE_MINUTES = TIME_IN_MILLIS.MINUTE * 5;
export const FIFTEEN_MINUTES = TIME_IN_MILLIS.MINUTE * 15;
export const ONE_HOUR = TIME_IN_MILLIS.HOUR;
export const FOUR_HOURS = TIME_IN_MILLIS.HOUR * 4;
export const ONE_DAY = TIME_IN_MILLIS.DAY;

/**
 * Will return a suitable snooze time based on the grace period
 * @param gracePeriodInMs - the full grace period length in milliseconds
 */
export function getSnoozeTime(gracePeriodInMs: number): number {
  if (gracePeriodInMs > 0) {
    if (gracePeriodInMs <= FIFTEEN_MINUTES) {
      return Math.min(FIVE_MINUTES, gracePeriodInMs);
    } else if (gracePeriodInMs <= ONE_HOUR) {
      return Math.min(FIFTEEN_MINUTES, gracePeriodInMs);
    } else if (gracePeriodInMs <= FOUR_HOURS) {
      return Math.min(ONE_HOUR, gracePeriodInMs);
    } else if (gracePeriodInMs <= ONE_DAY) {
      return Math.min(FOUR_HOURS, gracePeriodInMs);
    }
    return Math.min(ONE_DAY, gracePeriodInMs);
  }
  return 0;
}

export async function shouldEnableSoftLock(
  enrollmentConfig: EnrollmentConfig,
  identity?: WireIdentity,
): Promise<boolean> {
  if (await isFreshMLSSelfClient()) {
    return true;
  }
  if (!enrollmentConfig.timer.isSnoozeTimeAvailable()) {
    // The user has used up the entire grace period or has a fresh new client, he now needs to enroll
    return true;
  }
  if (!identity?.certificate) {
    return false;
  }
  return [MLSStatuses.EXPIRED, MLSStatuses.REVOKED].includes(identity.status);
}
