import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminLayout() {
    const insets = useSafeAreaInsets();

    const hiddenScreenOptions = {
        href: null,
        tabBarStyle: { display: 'none' as const }
    };

    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#4300FF', // Vivid purple/blue from mockup
            tabBarInactiveTintColor: '#94a3b8',
            tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopWidth: 0,
                height: 65 + insets.bottom,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
                paddingTop: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 10,
            },
            tabBarLabelStyle: {
                fontSize: 10,
                fontWeight: '600',
                marginTop: 4,
            }
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Дашборд',
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="dashboard" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="bookings"
                options={{
                    title: 'Брони',
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons name="calendar-check" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="calendar"
                options={{
                    title: 'События',
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons name="calendar-text" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="setup"
                options={{
                    title: 'Ресторан',
                    tabBarIcon: ({ color }) => (
                        <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Настройки',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="settings-sharp" size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen name="account" options={hiddenScreenOptions as any} />
            <Tabs.Screen name="analytics" options={hiddenScreenOptions as any} />
            <Tabs.Screen name="claim" options={hiddenScreenOptions as any} />
            <Tabs.Screen name="menu" options={hiddenScreenOptions as any} />
            <Tabs.Screen name="staff" options={hiddenScreenOptions as any} />
            <Tabs.Screen name="verification" options={hiddenScreenOptions as any} />
            <Tabs.Screen name="tables" options={hiddenScreenOptions as any} />
        </Tabs>
    );
}
