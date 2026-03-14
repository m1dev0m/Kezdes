import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';

export default function AdminEditRedirectScreen() {
    const router = useRouter();

    useEffect(() => {
        router.replace({ pathname: '/admin/setup', params: { edit: 'true' } });
    }, [router]);

    return (
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
            <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
    );
}
