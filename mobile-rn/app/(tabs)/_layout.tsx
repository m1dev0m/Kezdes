import React from 'react';
import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { isTablet } = useResponsive();

    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#0047FF', 
            tabBarInactiveTintColor: '#94a3b8', 
            tabBarLabelPosition: isTablet ? 'beside-icon' : 'below-icon',
            tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopWidth: 0,
                height: (isTablet ? 72 : 65) + insets.bottom,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
                paddingTop: isTablet ? 8 : 10,
                ...Platform.select({
                    ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.05,
                        shadowRadius: 12,
                    },
                    android: {
                        elevation: 10,
                    },
                    web: {
                        boxShadow: '0px -4px 18px rgba(15, 23, 42, 0.08)',
                    },
                    default: {},
                }),
            },
            tabBarLabelStyle: {
                fontSize: isTablet ? 12 : 11,
                fontWeight: '600',
                marginTop: 4,
            }
        }}>
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Главная',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="home-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="events"
                options={{
                    title: 'События',
                    tabBarIcon: ({ color }) => (
                        <View>
                            <Ionicons name="calendar-outline" size={24} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Профиль',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="person-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: 'Сообщения',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="chatbubble-ellipses-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="qr"
                options={{ href: null }}
            />
        </Tabs>
    );
}
