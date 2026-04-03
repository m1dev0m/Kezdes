import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getPostAuthRoute, useAuth } from '../lib/auth-context';
import { Logo } from '../components/ui/Logo';
import { colors } from '../theme/colors';

export default function WelcomeScreen() {
    const router = useRouter();
    const { user, isLoading } = useAuth();

    React.useEffect(() => {
        if (isLoading) return;

        router.replace(user ? getPostAuthRoute(user) : '/onboarding');
    }, [router, user, isLoading]);

    return (
        <View style={styles.container}>
            <Logo />
            <Text style={styles.text}>Загружаем Kezdes…</Text>
            <ActivityIndicator size="small" color={colors.primary} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 24,
    },
    text: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
});
