import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';

import { useRouter, Link } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { API_BASE_URL } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { Logo } from '../../components/ui/Logo';

const CATEGORIES = [
    { id: 'photographer', label: 'Фотограф' },
    { id: 'videographer', label: 'Видеограф' },
    { id: 'host', label: 'Ведущий' },
    { id: 'music', label: 'DJ/Музыкант' },
    { id: 'decorator', label: 'Декоратор' },
];

export default function RegisterScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const [role, setRole] = useState<'organizer' | 'worker' | 'restaurant_admin'>('organizer');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);


    const [category, setCategory] = useState('');
    const [price, setPrice] = useState('');
    const [bio, setBio] = useState('');

    const handleRegister = async () => {
        if (isSubmitting) return;
        if (!email || !username || !password || !confirmPassword) {
            Alert.alert('Ошибка', 'Пожалуйста, заполните все обязательные поля');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Ошибка', 'Пароли не совпадают. Пожалуйста, проверьте ввод.');
            return;
        }

        try {
            setIsSubmitting(true);
            const body: any = {
                email,
                username,
                password,
                role,
            };

            if (role === 'worker') {
                if (category) body.category = category;
                if (price) body.price_from = parseFloat(price) || 0;
                if (bio) body.description = bio;
                body.name = username;
            }

            const response = await fetch(`${API_BASE_URL}/auth/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                try {
                    await login({ username, password });
                } catch (loginError) {
                    const msg = loginError instanceof Error && loginError.message ? loginError.message : 'Не удалось войти автоматически.';
                    Alert.alert('Успех', `Аккаунт создан, но не удалось войти автоматически.\n\n${msg}`, [
                        { text: 'Войти', onPress: () => router.replace('/auth/login') }
                    ]);
                }
            } else {
                const text = await response.text().catch(() => '');
                let data: any = null;
                try {
                    data = text ? JSON.parse(text) : null;
                } catch {
                    data = null;
                }

                let errorMessage = 'Ошибка регистрации';
                if (data?.detail) errorMessage = data.detail;
                else if (data?.username) errorMessage = `Логин: ${data.username[0]}`;
                else if (data?.email) errorMessage = `Email: ${data.email[0]}`;
                else if (data?.price_from) errorMessage = `Цена: ${data.price_from[0]}`;
                else if (data?.password) errorMessage = `Пароль: ${data.password[0]}`;
                else if (text.trim()) errorMessage = text.trim();

                Alert.alert('Ошибка', errorMessage);
            }
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось подключиться к серверу. Убедитесь, что сервер запущен.');
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
                        <MaterialIcons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Logo />
                    <View style={styles.iconButton} />
                </View>

                <View style={styles.tabsContainer}>
                    <Link href="/auth/login" asChild>
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
                        <Text style={styles.title}>Создать аккаунт</Text>
                        <Text style={styles.subtitle}>Зарегистрируйтесь, чтобы начать планировать мероприятия</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.roleSegmentContainer}>
                            <View style={styles.roleSegmentTriple}>
                                <TouchableOpacity
                                    style={role === 'organizer' ? styles.roleSegmentActive : styles.roleSegmentInactive}
                                    onPress={() => setRole('organizer')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={role === 'organizer' ? styles.roleSegmentTextActive : styles.roleSegmentTextInactive}>
                                        Организатор
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={role === 'worker' ? styles.roleSegmentActive : styles.roleSegmentInactive}
                                    onPress={() => setRole('worker')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={role === 'worker' ? styles.roleSegmentTextActive : styles.roleSegmentTextInactive}>
                                        Исполнитель
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={role === 'restaurant_admin' ? styles.roleSegmentActive : styles.roleSegmentInactive}
                                    onPress={() => setRole('restaurant_admin')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={role === 'restaurant_admin' ? styles.roleSegmentTextActive : styles.roleSegmentTextInactive}>
                                        Ресторан
                                    </Text>
                                </TouchableOpacity>
                            </View>
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
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>Логин</Text>
                            <View style={styles.inputIconContainer}>
                                <MaterialIcons name="person" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIcon}
                                    placeholder="alex123"
                                    placeholderTextColor={colors.muted}
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
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
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                    <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={20} color={colors.muted} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>Повторите пароль</Text>
                            <View style={[styles.inputIconContainer, password && confirmPassword && password !== confirmPassword ? { borderColor: colors.error } : null]}>
                                <MaterialIcons name="lock" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIcon}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.muted}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                                    <MaterialIcons name={showConfirmPassword ? 'visibility-off' : 'visibility'} size={20} color={colors.muted} />
                                </TouchableOpacity>
                            </View>
                            {password && confirmPassword && password !== confirmPassword && (
                                <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>Пароли не совпадают</Text>
                            )}
                        </View>


                        {role === 'worker' && (
                            <View style={styles.workerSection}>
                                <Text style={styles.sectionTitle}>Профиль исполнителя</Text>

                                <Text style={styles.label}>Кто вы?</Text>
                                <View style={styles.categoryGrid}>
                                    {CATEGORIES.map(c => (
                                        <TouchableOpacity
                                            key={c.id}
                                            style={[styles.categoryBtn, category === c.id && styles.categoryBtnActive]}
                                            onPress={() => setCategory(c.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.categoryBtnText, category === c.id && styles.categoryBtnTextActive]}>{c.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={styles.inputWrapper}>
                                    <Text style={styles.label}>Мин. стоимость (₸)</Text>
                                    <View style={styles.inputIconContainer}>
                                        <MaterialIcons name="payments" size={20} color={colors.muted} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.inputWithIcon}
                                            placeholder="50000"
                                            placeholderTextColor={colors.muted}
                                            keyboardType="numeric"
                                            value={price}
                                            onChangeText={setPrice}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputWrapper}>
                                    <Text style={styles.label}>О себе</Text>
                                    <View style={[styles.inputIconContainer, { alignItems: 'flex-start', paddingVertical: 12 }]}>
                                        <MaterialIcons name="description" size={20} color={colors.muted} style={[styles.inputIcon, { marginTop: 2 }]} />
                                        <TextInput
                                            style={[styles.inputWithIcon, styles.textArea]}
                                            placeholder="Расскажите о своем опыте и услугах..."
                                            placeholderTextColor={colors.muted}
                                            multiline
                                            numberOfLines={4}
                                            value={bio}
                                            onChangeText={setBio}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.registerButton, isSubmitting ? styles.registerButtonDisabled : null]}
                            onPress={handleRegister}
                            activeOpacity={0.85}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.registerButtonText}>Зарегистрироваться</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footerLinkContainer}>
                        <Text style={styles.footerLegalText}>
                            Создавая аккаунт, вы соглашаетесь с нашими{'\n'}
                            <Text style={styles.legalLink}>Условиями использования</Text> и <Text style={styles.legalLink}>Политикой</Text>
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
    roleSegmentContainer: {
        marginBottom: 32,
    },
    roleSegmentGroup: {
        flexDirection: 'row',
        backgroundColor: colors.border,
        borderRadius: 40,
        padding: 4,
        height: 48,
    },
    roleSegmentTriple: {
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
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
    workerSection: {
        gap: 16,
        marginTop: 16,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 32,
        backgroundColor: colors.border,
    },
    categoryBtnActive: {
        backgroundColor: colors.primary + '1A',
        borderWidth: 1,
        borderColor: colors.primary,
        paddingHorizontal: 15,
        paddingVertical: 9,
    },
    categoryBtnText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    categoryBtnTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    textArea: {
        height: 100,
        paddingTop: 0,
        textAlignVertical: 'top',
    },
    registerButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 40,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
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
