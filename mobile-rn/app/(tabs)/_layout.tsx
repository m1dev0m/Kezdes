import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { fetchUnreadMessagesCount } from '../../lib/api';

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [hasNewEvents, setHasNewEvents] = useState(false);

    useEffect(() => {
        let interval: any;
        const load = async () => {
            if (!user?.access) {
                setHasNewEvents(false);
                return;
            }
            try {
                const res = await fetchUnreadMessagesCount(user.access);
                setHasNewEvents(res.unread > 0);
            } catch {
            }
        };
        load();
        if (user?.access) {
            interval = setInterval(load, 5000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [user]);

    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#0047FF', // deep blue
            tabBarInactiveTintColor: '#94a3b8', // soft gray
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
                fontSize: 11,
                fontWeight: '600',
                marginTop: 4,
            }
        }}>
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="events"
                options={{
                    title: 'События',
                    tabBarIcon: ({ color, size }) => (
                        <View>
                            <Ionicons name="calendar-outline" size={24} color={color} />
                            {hasNewEvents && (
                                <View
                                    style={{
                                        position: 'absolute',
                                        top: -2,
                                        right: -4,
                                        minWidth: 16,
                                        height: 16,
                                        borderRadius: 8,
                                        backgroundColor: '#ef4444',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingHorizontal: 3,
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>•</Text>
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: 'Сообщения',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="chatbubble-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="qr"
                options={{
                    title: 'Мой QR',
                    tabBarIcon: ({ color, size }) => (
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: '#0047FF',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: -20,
                            shadowColor: '#0047FF',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 5,
                        }}>
                            <Ionicons name="qr-code-outline" size={26} color="#ffffff" />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Профиль',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
