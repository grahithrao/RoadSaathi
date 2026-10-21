import React from 'react';
import { CustomerNavigator } from '../src/components/CustomerNavigator.js';
import { MechanicNavigator } from '../src/components/MechanicNavigator.js';
import { useRole } from './_layout.js';

export default function AppEntry() {
  const { role } = useRole();

  if (role === 'MECHANIC') {
    return <MechanicNavigator />;
  }

  return <CustomerNavigator />;
}
