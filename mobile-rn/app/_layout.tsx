import { Stack, useGlobalSearchParams, useSegments, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { View, ActivityIndicator } from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth, isAdminRole, isRestaurantRole, getPostAuthRoute, sanitizeRedirectTarget, setPendingPostAuthRoute } from '../lib/auth-context';
import { NotificationProvider } from './notifications';
import { useEffect } from 'react';

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const globalSearchParams = useGlobalSearchParams();

    useEffect(() => {
        if (isLoading) return;

        const routeSegments = segments as string[];
        const routeGroup = routeSegments[0];
        const isRoot = routeSegments.length === 0 || (routeSegments.length === 1 && routeGroup === 'index');
        const isAuthGroup = routeGroup === 'auth';
        const isOnboarding = routeGroup === 'onboarding';
        const isAdminGroup = routeGroup === 'admin';
        const isTabsGroup = routeGroup === '(tabs)';
        const currentPath = '/' + routeSegments.filter(Boolean).join('/');

        const safeReplace = (to: Parameters<typeof router.replace>[0]) => {
            if (currentPath !== to) {
                router.replace(to);
            }
        };

        if (!user) {
            if (isAdminGroup || isTabsGroup) {
                setPendingPostAuthRoute(currentPath);
                safeReplace('/onboarding');
            }
            return;
        }

        const adminTarget = isAdminRole(user.role) || isRestaurantRole(user.role)
            ? getPostAuthRoute(user)
            : '/(tabs)/home';

        const isRestaurantUser = adminTarget === '/admin' || adminTarget === '/admin/setup';

        if (isAdminGroup && !isRestaurantUser) {
            safeReplace('/(tabs)/home');
            return;
        }

        if (isTabsGroup && isRestaurantUser) {
            safeReplace('/admin');
            return;
        }

        if (isAuthGroup || isRoot || isOnboarding) {
            const redirectTo = sanitizeRedirectTarget(
                typeof globalSearchParams.redirectTo === 'string' ? globalSearchParams.redirectTo : '',
            );
            if (user && redirectTo) {
                safeReplace(redirectTo as Parameters<typeof router.replace>[0]);
                return;
            }
            safeReplace(user ? adminTarget : '/onboarding');
        }
    }, [user, isLoading, segments, router, globalSearchParams.redirectTo]);



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
