import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Профиль</Text>
                <TouchableOpacity style={styles.iconButton} onPress={logout}>
                    <MaterialIcons name="logout" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatarWrap}>
                            <Image
                                source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80' }}
                                style={styles.avatar}
                            />
                        </View>
                        <TouchableOpacity style={styles.editButton}>
                            <MaterialIcons name="edit" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{user?.username || 'Константин Козлов'}</Text>
                    <Text style={styles.userCompany}>Бизнес-аналитик</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>12</Text>
                            <Text style={styles.statLabel}>Событий</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>5</Text>
                            <Text style={styles.statLabel}>Избранных</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>4.9</Text>
                            <Text style={styles.statLabel}>Рейтинг</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.mainContent}>
                    <View style={styles.group}>
                        <View style={styles.groupCard}>
                            {user?.role === 'restaurant_admin' && (
                                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin')}>
                                    <View style={[styles.menuIconBox, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
                                        <MaterialIcons name="dashboard" size={20} color="#4f46e5" />
                                    </View>
                                    <Text style={styles.menuText}>Панель управления</Text>
                                    <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/events')}>
                                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(0, 71, 255, 0.1)' }]}>
                                    <Ionicons name="calendar" size={20} color={colors.primary} />
                                </View>
                                <Text style={styles.menuText}>Мои бронирования</Text>
                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/orders/history')}>
                                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                    <MaterialIcons name="shopping-bag" size={20} color="#10b981" />
                                </View>
                                <Text style={styles.menuText}>История заказов</Text>
                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem}>
                                <View style={[styles.menuIconBox, { backgroundColor: '#e0e7ff' }]}>
                                    <MaterialIcons name="payments" size={20} color="#4f46e5" />
                                </View>
                                <Text style={styles.menuText}>Способы оплаты</Text>
                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem}>
                                <View style={[styles.menuIconBox, { backgroundColor: '#fef3c7' }]}>
                                    <MaterialIcons name="person" size={20} color="#d97706" />
                                </View>
                                <Text style={styles.menuText}>Редактировать профиль</Text>
                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                                onPress={() => router.push('/support')}
                            >
                                <View style={[styles.menuIconBox, { backgroundColor: '#dcfce7' }]}>
                                    <MaterialIcons name="help-outline" size={20} color="#16a34a" />
                                </View>
                                <Text style={styles.menuText}>Служба поддержки</Text>
                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.group}>
                        <Text style={styles.groupTitle}>ИНФОРМАЦИЯ</Text>
                        <View style={styles.groupCard}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/about')}>
                                <View style={[styles.menuIconBox, { backgroundColor: '#f3e8ff' }]}>
                                    <MaterialIcons name="info-outline" size={20} color="#a855f7" />
                                </View>
                                <Text style={styles.menuText}>О приложении</Text>
                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => router.push('/rules')}>
                                <View style={[styles.menuIconBox, { backgroundColor: '#fce7f3' }]}>
                                    <MaterialIcons name="gavel" size={20} color="#ec4899" />
                                </View>
                                <Text style={styles.menuText}>Правила сервиса</Text>
                                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                        <MaterialIcons name="logout" size={20} color={colors.error} />
                        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>
                        Kezdes v3.0.0 (Premium){'\n'}© 2026 Kezdes SaaS Solutions
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconButton: {
        padding: 8,
        borderRadius: 32,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    scroll: {
        paddingBottom: 40,
    },
    profileSection: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
        backgroundColor: '#ffffff',
        marginBottom: 8,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarWrap: {
        width: 112,
        height: 112,
        borderRadius: 56,
        borderWidth: 4,
        borderColor: 'rgba(0, 71, 255, 0.1)',
        overflow: 'hidden',
        backgroundColor: colors.border,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    editButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        width: 32,
        height: 32,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    userCompany: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textSecondary,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        width: '100%',
    },
    statBox: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.border,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 71, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 40,
        marginTop: 8,
        gap: 4,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    mainContent: {
        padding: 16,
        gap: 24,
    },
    group: {},
    groupTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 8,
        marginLeft: 8,
        letterSpacing: 0.5,
    },
    groupCard: {
        backgroundColor: '#ffffff',
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuIconBox: {
        width: 40,
        height: 40,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuText: {
        flex: 1,
        marginLeft: 16,
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        paddingVertical: 16,
        borderRadius: 40,
        marginTop: 16,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.error,
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        color: colors.muted,
        marginTop: 16,
        lineHeight: 18,
    },
});
