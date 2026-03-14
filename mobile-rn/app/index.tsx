import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';

export default function WelcomeScreen() {
    const router = useRouter();
    const { user, isLoading } = useAuth();

    React.useEffect(() => {
        if (isLoading) return;

        if (user) {
            router.replace('/(tabs)/home');
        } else {
            router.replace('/onboarding');
        }
    }, [user, isLoading]);

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
    );
}
