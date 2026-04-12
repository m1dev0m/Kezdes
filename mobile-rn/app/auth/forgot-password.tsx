import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../lib/useTranslation';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleReset = () => {
        if (!email) {
            Alert.alert(t('common.error'), t('auth.enterEmailOrPhone'));
            return;
        }
        setIsSubmitted(true);
    };

    if (isSubmitted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('auth.recovery')}</Text>
                    <View style={styles.iconButton} />
                </View>
                <View style={styles.successContent}>
                    <View style={styles.successIconBox}>
                        <Ionicons name="mail-open-outline" size={60} color={colors.primary} />
                    </View>
                    <Text style={styles.successTitle}>{t('auth.instructionsSent')}</Text>
                    <Text style={styles.successDescription}>
                        {t('auth.linkSentTo')} {email}. {t('auth.checkEmail')}
                    </Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                        <Text style={styles.buttonText}>{t('auth.backToLogin')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('auth.forgotPasswordTitle')}</Text>
                    <View style={styles.iconButton} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{t('auth.recoveryAccess')}</Text>
                        <Text style={styles.subtitle}>
                            {t('auth.recoverySubtitle')}
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>{t('auth.emailOrPhone')}</Text>
                            <View style={styles.inputIconContainer}>
                                <Ionicons name="mail-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIcon}
                                    placeholder="example@mail.com"
                                    placeholderTextColor={colors.muted}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.primaryButton} onPress={handleReset} activeOpacity={0.85}>
                            <Text style={styles.buttonText}>{t('auth.send')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background || '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border || '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text || '#1F2937',
    },
    iconButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    titleContainer: {
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text || '#1F2937',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary || '#6B7280',
        lineHeight: 24,
    },
    form: {
        gap: 24,
    },
    inputWrapper: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text || '#1F2937',
        marginLeft: 4,
    },
    inputIconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border || '#E5E7EB',
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
    },
    inputIcon: {
        paddingLeft: 16,
    },
    inputWithIcon: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 12,
        fontSize: 16,
        color: colors.text || '#1F2937',
    },
    primaryButton: {
        backgroundColor: colors.primary || '#0047FF',
        paddingVertical: 16,
        borderRadius: 40,
        alignItems: 'center',
        shadowColor: colors.primary || '#0047FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    successContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    successIconBox: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text || '#1F2937',
        marginBottom: 16,
        textAlign: 'center',
    },
    successDescription: {
        fontSize: 16,
        color: colors.textSecondary || '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
});
