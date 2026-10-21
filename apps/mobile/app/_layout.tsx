import React, { createContext, useState, useContext } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Slot } from 'expo-router';

interface RoleContextType {
  role: 'CUSTOMER' | 'MECHANIC';
  setRole: (role: 'CUSTOMER' | 'MECHANIC') => void;
  language: 'en' | 'hi' | 'kn';
  setLanguage: (lang: 'en' | 'hi' | 'kn') => void;
}

const RoleContext = createContext<RoleContextType>({
  role: 'CUSTOMER',
  setRole: () => {},
  language: 'en',
  setLanguage: () => {},
});

export const useRole = () => useContext(RoleContext);

export default function RootLayout() {
  const [role, setRole] = useState<'CUSTOMER' | 'MECHANIC'>('CUSTOMER');
  const [language, setLanguage] = useState<'en' | 'hi' | 'kn'>('en');

  return (
    <SafeAreaProvider>
      <RoleContext.Provider value={{ role, setRole, language, setLanguage }}>
        <StatusBar style="dark" backgroundColor="#F5FAFF" />
        <Slot />
      </RoleContext.Provider>
    </SafeAreaProvider>
  );
}
