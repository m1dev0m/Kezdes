import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import EmptyState from '../components/EmptyState';

const GUESTS = [
    { id: '1', name: 'Александр Иванов', status: 'ПОДТВЕРДИЛ', initial: 'АИ', statusColor: '#22c55e' },
    { id: '2', name: 'Елена Смирнова', status: 'ОЖИДАНИЕ', initial: 'ЕС', statusColor: '#f59e0b' },
    { id: '3', name: 'Дмитрий Петров', status: 'ОТКЛОНИЛ', initial: 'ДП', statusColor: '#ef4444' },
    { id: '4', name: 'Мария Кузнецова', status: 'ПОДТВЕРДИЛ', initial: 'МК', statusColor: '#22c55e' },
    { id: '5', name: 'Виктор Соколов', status: 'ОЖИДАНИЕ', initial: 'ВС', statusColor: '#f59e0b' },
];

export default function GuestListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('Все');

    const filteredGuests = GUESTS.filter(g => {
        if (filter === 'Подтвержденные' && g.status !== 'ПОДТВЕРДИЛ') return false;
        if (filter === 'Ожидают' && g.status !== 'ОЖИДАНИЕ') return false;
        if (searchQuery && !g.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Список гостей</Text>
                <TouchableOpacity onPress={() => { }} style={styles.actionTextButton}>
                    <Text style={styles.actionText}>Экспорт</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 200 + insets.bottom }]}>
                <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Статус заполнения</Text>
                        <Text style={styles.progressValue}><Text style={{ fontWeight: '700' }}>12 / 20</Text> подтверждено</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '60%' }]} />
                    </View>
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Поиск по имени..."
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={styles.filterTabs}>
                    {['Все', 'Подтвержденные', 'Ожидают'].map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
                            onPress={() => setFilter(tab)}
                        >
                            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={[styles.listContainer, filteredGuests.length === 0 && { paddingVertical: 40 }]}>
                    {filteredGuests.length > 0 ? (
                        filteredGuests.map((guest, index) => (
                            <View key={guest.id} style={styles.guestCard}>
                                <View style={styles.guestLeft}>
                                    <View style={styles.avatar}>
                                        <Text style={[styles.avatarText, { color: guest.statusColor }]}>{guest.initial}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.guestName}>{guest.name}</Text>
                                        <View style={styles.statusRow}>
                                            <View style={[styles.statusDot, { backgroundColor: guest.statusColor }]} />
                                            <Text style={[styles.statusText, { color: guest.statusColor }]}>{guest.status}</Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.editBtn}>
                                    <MaterialIcons name="edit" size={14} color={colors.primary} />
                                    <Text style={styles.editBtnText}>Редактировать</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    ) : (
                        <EmptyState
                            title="Гости не найдены"
                            description="Попробуйте изменить параметры поиска или фильтры."
                            iconName="people-outline"
                            iconType="Ionicons"
                        />
                    )}
                </View>
            </ScrollView>

            <View style={[styles.floatingActions, { bottom: 85 + insets.bottom }]}>
                <TouchableOpacity style={styles.primaryBtn}>
                    <Ionicons name="person-add" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Добавить гостя</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn}>
                    <MaterialIcons name="contact-phone" size={20} color={colors.primary} />
                    <Text style={styles.secondaryBtnText}>Импортировать из контактов</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.bottomNav, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(tabs)/home')}>
                    <Ionicons name="home" size={24} color={colors.textSecondary} />
                    <Text style={styles.navText}>Главная</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <Ionicons name="calendar-outline" size={24} color={colors.textSecondary} />
                    <Text style={styles.navText}>События</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <Ionicons name="people" size={24} color={colors.primary} />
                    <Text style={[styles.navText, { color: colors.primary }]}>Гости</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <Ionicons name="person-circle-outline" size={24} color={colors.textSecondary} />
                    <Text style={styles.navText}>Профиль</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    iconButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
    },
    actionTextButton: {
        padding: 4,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    scroll: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    progressCard: {
        marginBottom: 24,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    progressValue: {
        fontSize: 12,
        color: colors.primary,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: colors.text,
    },
    filterTabs: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    filterTabActive: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    filterTabText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    filterTabTextActive: {
        color: colors.text,
    },
    listContainer: {
        gap: 12,
    },
    guestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 12,
    },
    guestLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '700',
    },
    guestName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    editBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.primary,
    },
    floatingActions: {
        position: 'absolute',
        left: 16,
        right: 16,
        gap: 12,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        gap: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryBtnText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
    },
    secondaryBtnText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
        justifyContent: 'space-around',
    },
    navItem: {
        alignItems: 'center',
        flex: 1,
    },
    navText: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
        color: colors.textSecondary,
    }
});
