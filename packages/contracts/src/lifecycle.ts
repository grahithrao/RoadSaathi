import { BookingStatus, UserRole } from './enums.js';

export interface StateTransitionRule {
  from: BookingStatus;
  to: BookingStatus;
  allowedActors: UserRole[] | 'SYSTEM';
  description: string;
}

export const BOOKING_TRANSITIONS: Record<BookingStatus, {
  allowedNextStates: BookingStatus[];
  allowedActors: (UserRole | 'SYSTEM')[];
}> = {
  [BookingStatus.DRAFT]: {
    allowedNextStates: [BookingStatus.SEARCHING, BookingStatus.OFFERED, BookingStatus.CANCELLED],
    allowedActors: [UserRole.CUSTOMER, 'SYSTEM'],
  },
  [BookingStatus.SEARCHING]: {
    allowedNextStates: [BookingStatus.OFFERED, BookingStatus.UNFULFILLED, BookingStatus.CANCELLED, BookingStatus.EXPIRED],
    allowedActors: ['SYSTEM', UserRole.CUSTOMER, UserRole.ADMIN_SUPPORT, UserRole.SUPER_ADMIN],
  },
  [BookingStatus.OFFERED]: {
    allowedNextStates: [BookingStatus.ASSIGNED, BookingStatus.SEARCHING, BookingStatus.UNFULFILLED, BookingStatus.CANCELLED, BookingStatus.EXPIRED],
    allowedActors: [UserRole.MECHANIC, 'SYSTEM', UserRole.CUSTOMER, UserRole.ADMIN_SUPPORT, UserRole.SUPER_ADMIN],
  },
  [BookingStatus.ASSIGNED]: {
    allowedNextStates: [BookingStatus.EN_ROUTE, BookingStatus.CANCELLED],
    allowedActors: [UserRole.MECHANIC, UserRole.CUSTOMER, UserRole.ADMIN_SUPPORT, UserRole.SUPER_ADMIN, 'SYSTEM'],
  },
  [BookingStatus.EN_ROUTE]: {
    allowedNextStates: [BookingStatus.ARRIVED, BookingStatus.CANCELLED],
    allowedActors: [UserRole.MECHANIC, UserRole.CUSTOMER, UserRole.ADMIN_SUPPORT, UserRole.SUPER_ADMIN, 'SYSTEM'],
  },
  [BookingStatus.ARRIVED]: {
    allowedNextStates: [BookingStatus.DIAGNOSING, BookingStatus.CANCELLED],
    allowedActors: [UserRole.MECHANIC, UserRole.ADMIN_SUPPORT, UserRole.SUPER_ADMIN],
  },
  [BookingStatus.DIAGNOSING]: {
    allowedNextStates: [BookingStatus.AWAITING_QUOTE_APPROVAL, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETION_PENDING, BookingStatus.CANCELLED],
    allowedActors: [UserRole.MECHANIC, UserRole.ADMIN_SUPPORT, UserRole.SUPER_ADMIN],
  },
  [BookingStatus.AWAITING_QUOTE_APPROVAL]: {
    allowedNextStates: [BookingStatus.IN_PROGRESS, BookingStatus.COMPLETION_PENDING, BookingStatus.CANCELLED],
    allowedActors: [UserRole.CUSTOMER, UserRole.ADMIN_SUPPORT, UserRole.SUPER_ADMIN, 'SYSTEM'],
  },
  [BookingStatus.IN_PROGRESS]: {
    allowedNextStates: [BookingStatus.COMPLETION_PENDING, BookingStatus.CANCELLED],
    allowedActors: [UserRole.MECHANIC, UserRole.ADMIN_SUPPORT, UserRole.SUPER_ADMIN],
  },
  [BookingStatus.COMPLETION_PENDING]: {
    allowedNextStates: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
    allowedActors: [UserRole.CUSTOMER, UserRole.MECHANIC, UserRole.ADMIN_SUPPORT, UserRole.SUPER_ADMIN],
  },
  [BookingStatus.COMPLETED]: {
    allowedNextStates: [],
    allowedActors: [],
  },
  [BookingStatus.CANCELLED]: {
    allowedNextStates: [],
    allowedActors: [],
  },
  [BookingStatus.EXPIRED]: {
    allowedNextStates: [],
    allowedActors: [],
  },
  [BookingStatus.UNFULFILLED]: {
    allowedNextStates: [],
    allowedActors: [],
  },
};

export const TERMINAL_BOOKING_STATES: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.EXPIRED,
  BookingStatus.UNFULFILLED,
];

export function isTerminalStatus(status: BookingStatus): boolean {
  return TERMINAL_BOOKING_STATES.includes(status);
}

export function canTransition(
  currentStatus: BookingStatus,
  targetStatus: BookingStatus,
  actor: UserRole | 'SYSTEM'
): { allowed: boolean; reason?: string } {
  if (isTerminalStatus(currentStatus)) {
    return {
      allowed: false,
      reason: `Booking is already in terminal state: ${currentStatus}`,
    };
  }

  const rule = BOOKING_TRANSITIONS[currentStatus];
  if (!rule) {
    return {
      allowed: false,
      reason: `Unknown state: ${currentStatus}`,
    };
  }

  if (!rule.allowedNextStates.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Invalid transition from ${currentStatus} to ${targetStatus}. Permitted next states: [${rule.allowedNextStates.join(', ')}]`,
    };
  }

  // Super admin can override operational transitions
  if (actor === UserRole.SUPER_ADMIN) {
    return { allowed: true };
  }

  if (!rule.allowedActors.includes(actor)) {
    return {
      allowed: false,
      reason: `Actor role ${actor} is not authorized to transition booking from ${currentStatus} to ${targetStatus}`,
    };
  }

  return { allowed: true };
}
