import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions, StatusBar, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTranslation } from '../lib/useTranslation';
import { Logo } from '../components/ui/Logo';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen() {
    const router = useRouter();
    const { t } = useTranslation();

    const handleStart = () => {
        router.replace('/auth/register');
    };

    const handleLogin = () => {
        router.replace('/auth/login');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={styles.header}>
                <View style={styles.branding}>
                    <Logo />
                </View>
                <TouchableOpacity onPress={handleLogin} activeOpacity={0.7}>
                    <Text style={styles.skipText}>{t('welcome.skip')}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.heroContainer}>
                <ImageBackground
                    source={require('../assets/images/onboarding_bg.jpg')}
                    style={styles.heroImage}
                    imageStyle={styles.heroImageBorder}
                >
                    <View style={styles.overlay} />
                </ImageBackground>
            </View>

            <View style={styles.textContainer}>
                <Text style={styles.title}>
                    {t('welcome.title')}
                </Text>
                <Text style={styles.subtitle}>
                    {t('welcome.subtitle')}
                </Text>
            </View>

            <View style={styles.paginationContainer}>
                <View style={[styles.dot, styles.dotActive]} />
                <View style={styles.dot} />
                <View style={styles.dot} />
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.8}>
                    <Text style={styles.startButtonText}>{t('welcome.start')}</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>

                <View style={styles.loginHintContainer}>
                    <TouchableOpacity onPress={handleLogin} activeOpacity={0.7} style={styles.loginRow}>
                        <Text style={styles.loginHintText}>{t('welcome.hasAccount')}</Text>
                        <Text style={styles.loginActionText}>{t('welcome.login')}</Text>
                    </TouchableOpacity>
                </View>

                {Platform.OS === 'ios' && <View style={styles.homeIndicatorSpace} />}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    branding: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoContainer: {
        backgroundColor: colors.primary + '1A', // 10% opacity primary
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandName: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.5,
    },
    skipText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    heroContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    heroImage: {
        width: '100%',
        aspectRatio: 4 / 3, // Maintains the 4:3 box from the design
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    heroImageBorder: {
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)', // from-black/20
        top: '50%',
        bottom: 0,
    },
    textContainer: {
        marginTop: 40,
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 16,
    },
    title: {
        fontSize: 30, // text-3xl
        fontWeight: '800', // font-extrabold
        color: colors.text,
        textAlign: 'center',
        lineHeight: 33, // leading-[1.1]
        letterSpacing: -0.5, // tracking-tight
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 16,
    },
    paginationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 32,
    },
    dot: {
        height: 6,
        width: 6,
        borderRadius: 3,
        backgroundColor: colors.border,
    },
    dotActive: {
        width: 24,
        backgroundColor: colors.primary,
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 48, // ample space for home bar
        gap: 16,
    },
    startButton: {
        width: '100%',
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        gap: 8,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    loginHintContainer: {
        alignItems: 'center',
        marginTop: 8,
    },
    loginRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loginHintText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    loginActionText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    homeIndicatorSpace: {
        height: 6,
        width: 128,
        borderRadius: 3,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginTop: 8,
    }
});
