import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';

export default function AdminLayout() {
    const insets = useSafeAreaInsets();
    const { isTablet } = useResponsive();

    const hiddenScreenOptions = {
        href: null,
        tabBarStyle: { display: 'none' as const }
    };

    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#1d4ed8',
            tabBarInactiveTintColor: '#94a3b8',
            tabBarLabelPosition: isTablet ? 'beside-icon' : 'below-icon',
            tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopWidth: 0,
                height: (isTablet ? 72 : 65) + insets.bottom,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
                paddingTop: isTablet ? 8 : 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 10,
            },
            tabBarLabelStyle: {
                fontSize: isTablet ? 12 : 10,
                fontWeight: '600',
                marginTop: 4,
            },
            tabBarItemStyle: isTablet ? { width: 'auto', paddingHorizontal: 8 } : undefined,
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Дашборд',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="grid-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="bookings"
                options={{
                    title: 'Брони',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="calendar-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="calendar"
                options={{
                    title: 'События',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="calendar-number-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="tables"
                options={{
                    title: 'Столы',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="grid-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="account"
                options={{
                    title: 'Кабинет',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="settings-sharp" size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen name="analytics" options={hiddenScreenOptions as any} />
            <Tabs.Screen name="claim" options={hiddenScreenOptions as any} />
            <Tabs.Screen name="menu" options={hiddenScreenOptions as any} />
            <Tabs.Screen name="staff" options={hiddenScreenOptions as any} />
            <Tabs.Screen name="verification" options={hiddenScreenOptions as any} />
            <Tabs.Screen name="setup" options={hiddenScreenOptions as any} />
            <Tabs.Screen name="messages" options={hiddenScreenOptions as any} />
            <Tabs.Screen name="profile" options={hiddenScreenOptions as any} />
        </Tabs>
    );
}
