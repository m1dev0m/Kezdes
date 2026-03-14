import { Stack, useSegments, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { View, ActivityIndicator, Alert } from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { NotificationProvider } from '../lib/notifications';
import { useEffect } from 'react';

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === 'auth';
        const isRoot = (segments as any).length === 0 || (segments.length === 1 && (segments[0] as any) === 'index');
        const isOnboarding = segments[0] === 'onboarding';

        if (!user) {
            if (!inAuthGroup && !isRoot && !isOnboarding) {
                router.replace('/onboarding');
            }
        } else {
            const isRestaurantOwner = user.role === 'restaurant_admin' || user.role === 'restaurant_owner';

            if (segments[0] === 'admin' && !isRestaurantOwner) {
                router.replace('/(tabs)/home');
                return;
            }

            if (segments[0] === '(tabs)' && isRestaurantOwner) {
                router.replace('/admin');
                return;
            }

            if (inAuthGroup || isRoot || isOnboarding) {
                if (isRestaurantOwner) {
                    router.replace('/admin');
                } else {
                    router.replace('/(tabs)/home');
                }
            }
        }
    }, [user, isLoading, segments]);



    if (isLoading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return <>{children}</>;
}

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FE' }}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <AuthProvider>
                    <NotificationProvider>
                        <QueryClientProvider client={queryClient}>
                            <AuthGuard>
                                <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                                    <Stack.Screen name="index" />
                                    <Stack.Screen name="onboarding" />
                                    <Stack.Screen name="(tabs)" />
                                    <Stack.Screen name="auth/login" />
                                    <Stack.Screen name="auth/register" />
                                    <Stack.Screen name="wizard" options={{ presentation: 'card' }} />
                                    <Stack.Screen name="results" options={{ presentation: 'card' }} />
                                    <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
                                </Stack>
                            </AuthGuard>
                        </QueryClientProvider>
                    </NotificationProvider>
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
