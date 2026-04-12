import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';

import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

import { consumePendingPostAuthRoute, getAuthErrorMessage, getPostAuthRoute, sanitizeRedirectTarget, useAuth } from '../../lib/auth-context';
import { Logo } from '../../components/ui/Logo';

export default function LoginScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingRedirectTo] = useState(() => sanitizeRedirectTarget(consumePendingPostAuthRoute()));
    const redirectTo = sanitizeRedirectTarget(typeof params.redirectTo === 'string' ? params.redirectTo : '');

    const handleForgotPassword = () => {
        Alert.alert(
            'Сброс пароля',
            'Автоматическое восстановление пароля пока не подключено. Используйте аккаунт с известным паролем или зарегистрируйтесь заново на тот же email.',
        );
    };

    const handleLogin = async () => {
        if (isSubmitting) return;
        const normalizedLogin = username.trim();
        if (!normalizedLogin || !password) {
            Alert.alert('Ошибка', 'Введите логин и пароль');
            return;
        }

        try {
            setIsSubmitting(true);
            const nextUser = await login({ username: normalizedLogin, password });
            const nextRoute = (redirectTo || pendingRedirectTo || getPostAuthRoute(nextUser)) as Parameters<typeof router.replace>[0];
            router.replace(nextRoute);
        } catch (error) {
            const msg = getAuthErrorMessage(error, 'Не удалось войти');
            Alert.alert('Ошибка', msg);
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Logo />
                    <View style={styles.iconButton} />
                </View>

                <View style={styles.tabsContainer}>
                    <View style={styles.tabActive}>
                        <Text style={styles.tabTextActive}>Вход</Text>
                    </View>
                    <Link href={redirectTo ? ({ pathname: '/auth/register', params: { redirectTo } } as const) : '/auth/register'} asChild>
                        <TouchableOpacity style={styles.tabInactive} activeOpacity={0.7}>
                            <Text style={styles.tabTextInactive}>Регистрация</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>

                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Добро пожаловать</Text>
                        <Text style={styles.subtitle}>Войдите в свой аккаунт для управления бронированиями</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>Логин или Email</Text>
                            <View style={styles.inputIconContainer}>
                                <Ionicons name="mail-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIcon}
                                    placeholder="example"
                                    placeholderTextColor={colors.muted}
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <View style={styles.passwordLabelRow}>
                                <Text style={styles.label}>Пароль</Text>
                                    <TouchableOpacity activeOpacity={0.7} disabled={isSubmitting} onPress={handleForgotPassword}>
                                        <Text style={styles.forgotText}>Забыли пароль?</Text>
                                    </TouchableOpacity>
                            </View>

                            <View style={styles.inputIconContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIconRight}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.muted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginButton, isSubmitting ? styles.loginButtonDisabled : null]}
                            onPress={handleLogin}
                            activeOpacity={0.85}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.loginButtonText}>Войти</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.helperCard}>
                            <Text style={styles.helperCardTitle}>Рабочий способ входа сейчас</Text>
                            <Text style={styles.helperCardText}>
                                Вход доступен по логину или email и паролю. Социальные кнопки скрыты, чтобы не оставлять мёртвые CTA.
                            </Text>
                        </View>

                    </View>

                    <View style={styles.footerLinkContainer}>
                        <Text style={styles.footerLegalText}>
                            Нажимая кнопку «Войти», вы соглашаетесь с нашими{'\n'}
                            <Text style={styles.legalLink}>Условиями использования</Text> и <Text style={styles.legalLink}>Политикой конфиденциальности</Text>
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tabActive: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 3,
        borderBottomColor: colors.primary,
    },
    tabInactive: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabTextActive: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
    },
    tabTextInactive: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.muted,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 30, // HTML text-3xl
        fontWeight: '700', // HTML font-bold
        color: colors.text,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400', // HTML font-normal
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    form: {
        gap: 20,
    },
    inputWrapper: {
        gap: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginLeft: 4,
    },
    passwordLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    inputIconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 40,
        backgroundColor: colors.white,
    },
    inputIcon: {
        paddingLeft: 16,
    },
    inputWithIcon: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 12,
        fontSize: 16,
        color: colors.text,
    },
    inputWithIconRight: {
        flex: 1,
        paddingVertical: 14,
        paddingLeft: 12,
        paddingRight: 40,
        fontSize: 16,
        color: colors.text,
    },
    eyeBtn: {
        position: 'absolute',
        right: 0,
        padding: 16,
    },
    forgotText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.primary,
    },
    helperCard: {
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#f8fafc',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 6,
    },
    helperCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    helperCardText: {
        fontSize: 13,
        lineHeight: 20,
        color: colors.textSecondary,
    },
    loginButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 40,
        alignItems: 'center',
        marginTop: 4,
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
            web: {
                boxShadow: '0px 4px 10px rgba(29, 78, 216, 0.22)',
            },
            default: {},
        }),
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        paddingHorizontal: 16,
        color: colors.muted,
        fontSize: 12, // HTML text-xs
        fontWeight: '500', // HTML font-medium
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    socialGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    socialBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
        gap: 8,
    },
    socialLogo: {
        width: 20,
        height: 20,
    },
    socialBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    footerLinkContainer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerLegalText: {
        fontSize: 12,
        color: colors.muted,
        textAlign: 'center',
        lineHeight: 18,
    },
    legalLink: {
        color: colors.primary,
    }
});
