import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { request } from '../../lib/api';
import { consumePendingPostAuthRoute, getAuthErrorMessage, getPostAuthRoute, sanitizeRedirectTarget, useAuth } from '../../lib/auth-context';
import { Logo } from '../../components/ui/Logo';

type RegisterRole = 'customer' | 'owner';

export default function RegisterScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { login } = useAuth();

    const [role, setRole] = useState<RegisterRole>('customer');
    const [step, setStep] = useState<1 | 2>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [otpEmail, setOtpEmail] = useState('');
    const [debugOtpCode, setDebugOtpCode] = useState('');
    const [otpRequired, setOtpRequired] = useState(true);

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [pendingRedirectTo] = useState(() => sanitizeRedirectTarget(consumePendingPostAuthRoute()));
    const redirectTo = sanitizeRedirectTarget(typeof params.redirectTo === 'string' ? params.redirectTo : '');

    const normalizedEmail = email.trim().toLowerCase();
    const isOtpCooldownActive = otpCooldown > 0 && otpEmail === normalizedEmail && normalizedEmail.length > 0;

    useEffect(() => {
        if (otpCooldown <= 0) return;
        const timer = setInterval(() => setOtpCooldown((value) => Math.max(0, value - 1)), 1000);
        return () => clearInterval(timer);
    }, [otpCooldown]);

    const canSendOtp = useMemo(() => {
        if (!normalizedEmail) return false;
        if (isSendingOtp) return false;
        if (isOtpCooldownActive) return false;
        return true;
    }, [isOtpCooldownActive, isSendingOtp, normalizedEmail]);

    const validateBaseForm = () => {
        if (!normalizedEmail || !username.trim() || !phone.trim() || !password || !confirmPassword) {
            Alert.alert('Ошибка', 'Заполните email, логин, телефон и пароль.');
            return false;
        }
        if (password !== confirmPassword) {
            Alert.alert('Ошибка', 'Пароли не совпадают.');
            return false;
        }
        if (password.length < 8) {
            Alert.alert('Ошибка', 'Пароль должен быть не короче 8 символов.');
            return false;
        }
        return true;
    };

    const handleSendOtp = async () => {
        if (!validateBaseForm()) return;
        if (isOtpCooldownActive) {
            Alert.alert('Подождите', `Новый код можно запросить через ${otpCooldown} сек.`);
            return;
        }

        setIsSendingOtp(true);
        try {
            const data = await request('/auth/send-otp/', undefined, {
                method: 'POST',
                body: JSON.stringify({ email: normalizedEmail }),
            });

            const nextOtpRequired = data?.otp_required !== false;
            setOtpEmail(normalizedEmail);
            setDebugOtpCode(typeof data?.code === 'string' ? data.code : '');
            setOtpRequired(nextOtpRequired);
            setOtpCooldown(60);
            setStep(2);
            Alert.alert(
                nextOtpRequired ? 'Код отправлен' : 'Почта подтверждена',
                data?.detail || (nextOtpRequired ? 'Проверьте почту и введите код подтверждения.' : 'OTP не требуется. Продолжайте регистрацию.'),
            );
        } catch (error) {
            const message = error instanceof Error && error.message
                ? error.message
                : 'Не удалось отправить код. Проверьте соединение с сервером.';
            Alert.alert('Ошибка', message);
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleRegister = async () => {
        if (isSubmitting) return;
        if (!validateBaseForm()) return;
        if (otpRequired && !otpCode.trim()) {
            Alert.alert('Ошибка', 'Введите код подтверждения.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: Record<string, string> = {
                email: normalizedEmail,
                username: username.trim(),
                password,
                password2: confirmPassword,
                phone: phone.trim(),
                role,
            };
            if (otpRequired) {
                payload.otp_code = otpCode.trim();
            }

            await request('/auth/register/', undefined, {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            const nextUser = await login({ username: username.trim(), email: normalizedEmail, password });
            const nextRoute = (redirectTo || pendingRedirectTo || getPostAuthRoute(nextUser)) as Parameters<typeof router.replace>[0];
            router.replace(nextRoute);
        } catch (error) {
            const message = getAuthErrorMessage(error, 'Не удалось завершить регистрацию.');
            Alert.alert('Ошибка', message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const roleHint =
        role === 'owner'
            ? 'Кабинет ресторана с настройкой зала, бронирований и заявкой на подключение.'
            : 'Личный кабинет гостя с бронированиями, историей и отзывами.';

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <MaterialIcons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Logo />
                    <View style={styles.iconButton} />
                </View>

                <View style={styles.tabsContainer}>
                    <Link href={redirectTo ? ({ pathname: '/auth/login', params: { redirectTo } } as const) : '/auth/login'} asChild>
                        <TouchableOpacity style={styles.tabInactive} activeOpacity={0.7}>
                            <Text style={styles.tabTextInactive}>Вход</Text>
                        </TouchableOpacity>
                    </Link>
                    <View style={styles.tabActive}>
                        <Text style={styles.tabTextActive}>Регистрация</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{step === 1 ? 'Создать аккаунт' : 'Подтвердить email'}</Text>
                        <Text style={styles.subtitle}>
                            {step === 1
                                ? 'Один аккаунт для гостя или ресторана.'
                                : `Мы отправили код на ${normalizedEmail || 'ваш email'}.`}
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.roleSegmentContainer}>
                            <View style={styles.roleSegmentDouble}>
                                <TouchableOpacity
                                    style={role === 'customer' ? styles.roleSegmentActive : styles.roleSegmentInactive}
                                    onPress={() => setRole('customer')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={role === 'customer' ? styles.roleSegmentTextActive : styles.roleSegmentTextInactive}>
                                        Гость
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={role === 'owner' ? styles.roleSegmentActive : styles.roleSegmentInactive}
                                    onPress={() => setRole('owner')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={role === 'owner' ? styles.roleSegmentTextActive : styles.roleSegmentTextInactive}>
                                        Ресторан
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.hintCard}>
                            <MaterialIcons name={role === 'owner' ? 'storefront' : 'person-outline'} size={18} color={colors.primary} />
                            <Text style={styles.hintText}>{roleHint}</Text>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>Электронная почта</Text>
                            <View style={styles.inputIconContainer}>
                                <MaterialIcons name="mail" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIcon}
                                    placeholder="example@kezdes.kz"
                                    placeholderTextColor={colors.muted}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    editable={step === 1}
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>Логин</Text>
                            <View style={styles.inputIconContainer}>
                                <MaterialIcons name="person" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIcon}
                                    placeholder="kezdes_user"
                                    placeholderTextColor={colors.muted}
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    editable={step === 1}
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>Телефон</Text>
                            <View style={styles.inputIconContainer}>
                                <MaterialIcons name="phone" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIcon}
                                    placeholder="+7 700 000 00 00"
                                    placeholderTextColor={colors.muted}
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                    editable={step === 1}
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>Пароль</Text>
                            <View style={styles.inputIconContainer}>
                                <MaterialIcons name="lock" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIconRight}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.muted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    editable={step === 1}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                    <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={20} color={colors.muted} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>Повторите пароль</Text>
                            <View
                                style={[
                                    styles.inputIconContainer,
                                    password && confirmPassword && password !== confirmPassword ? styles.inputErrorContainer : null,
                                ]}
                            >
                                <MaterialIcons name="lock" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIconRight}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.muted}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                    editable={step === 1}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                                    <MaterialIcons name={showConfirmPassword ? 'visibility-off' : 'visibility'} size={20} color={colors.muted} />
                                </TouchableOpacity>
                            </View>
                            {password && confirmPassword && password !== confirmPassword ? (
                                <Text style={styles.errorText}>Пароли не совпадают.</Text>
                            ) : null}
                        </View>

                        {step === 2 ? (
                            <>
                                {otpRequired && debugOtpCode ? (
                                    <View style={styles.debugCard}>
                                        <Text style={styles.debugLabel}>Dev OTP</Text>
                                        <Text style={styles.debugCode}>{debugOtpCode}</Text>
                                    </View>
                                ) : null}

                                {otpRequired ? (
                                    <View style={styles.inputWrapper}>
                                        <Text style={styles.label}>Код подтверждения</Text>
                                        <View style={styles.inputIconContainer}>
                                            <MaterialIcons name="key" size={20} color={colors.muted} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.inputWithIcon}
                                                placeholder="123456"
                                                placeholderTextColor={colors.muted}
                                                value={otpCode}
                                                onChangeText={setOtpCode}
                                                keyboardType="number-pad"
                                            />
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.debugCard}>
                                        <Text style={styles.debugLabel}>Email status</Text>
                                        <Text style={styles.debugCode}>READY</Text>
                                    </View>
                                )}

                                <View style={styles.otpActions}>
                                    <TouchableOpacity
                                        style={styles.ghostButton}
                                        onPress={() => setStep(1)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.ghostButtonText}>Изменить данные</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.ghostButton, !canSendOtp && styles.ghostButtonDisabled]}
                                        onPress={handleSendOtp}
                                        activeOpacity={0.85}
                                        disabled={!canSendOtp}
                                    >
                                        <Text style={styles.ghostButtonText}>
                                            {otpCooldown > 0 ? `Повтор через ${otpCooldown}с` : isSendingOtp ? 'Отправка...' : otpRequired ? 'Отправить снова' : 'Проверить email снова'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={[styles.registerButton, isSubmitting ? styles.registerButtonDisabled : null]}
                                    onPress={handleRegister}
                                    activeOpacity={0.85}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>Подтвердить и войти</Text>}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                style={[styles.registerButton, (isSendingOtp || !canSendOtp) ? styles.registerButtonDisabled : null]}
                                onPress={handleSendOtp}
                                activeOpacity={0.85}
                                disabled={isSendingOtp}
                            >
                                {isSendingOtp ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>Отправить код</Text>}
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.footerLinkContainer}>
                        <Text style={styles.footerLegalText}>
                            Продолжая, вы соглашаетесь с нашими{'\n'}
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
        fontSize: 30,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    form: {
        gap: 20,
    },
    roleSegmentContainer: {
        marginBottom: 8,
    },
    roleSegmentDouble: {
        flexDirection: 'row',
        backgroundColor: colors.border,
        borderRadius: 40,
        padding: 4,
        height: 48,
    },
    roleSegmentActive: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
            web: {
                boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
            },
            default: {},
        }),
    },
    roleSegmentInactive: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleSegmentTextActive: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    roleSegmentTextInactive: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    hintCard: {
        flexDirection: 'row',
        gap: 10,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#f8fafc',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    hintText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 20,
        color: colors.textSecondary,
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
    inputIconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 40,
        backgroundColor: colors.white,
    },
    inputErrorContainer: {
        borderColor: colors.error,
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
    errorText: {
        color: colors.error,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    debugCard: {
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    debugLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1d4ed8',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    debugCode: {
        marginTop: 6,
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 4,
        color: '#1e3a8a',
    },
    otpActions: {
        flexDirection: 'row',
        gap: 12,
    },
    ghostButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    ghostButtonDisabled: {
        opacity: 0.55,
    },
    ghostButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        textAlign: 'center',
    },
    registerButton: {
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 32,
        alignItems: 'center',
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
    registerButtonDisabled: {
        opacity: 0.7,
    },
    registerButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    footerLinkContainer: {
        marginTop: 32,
        alignItems: 'center',
    },
    footerLegalText: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 20,
    },
    legalLink: {
        color: colors.primary,
        fontWeight: '700',
    },
});
