import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

import StaffCard from '../../components/StaffCard';

const STAFF = [
    { id: '1', name: 'Айзада Б.', role: 'Менеджер', status: 'В сети' },
    { id: '2', name: 'Берик К.', role: 'Официант', status: 'Перерыв' },
    { id: '3', name: 'Данияр М.', role: 'Администратор', status: 'В сети' },
];

export default function AdminStaffScreen() {
    const router = useRouter();

    const renderStaff = React.useCallback(({ item }: { item: typeof STAFF[0] }) => (
        <StaffCard item={item} />
    ), []);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Персонал</Text>
                <View style={styles.headerRight}>
                    <Ionicons name="people-outline" size={22} color="#000" />
                </View>
            </View>

            <FlatList
                data={STAFF}
                renderItem={renderStaff}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        <Text style={styles.sectionLabel}>CОТРУДНИКИ В ДОСТУПЕ</Text>
                    </View>
                }
                ListFooterComponent={
                    <TouchableOpacity style={styles.inviteBtn} activeOpacity={0.8}>
                        <Ionicons name="add" size={24} color="#fff" />
                        <Text style={styles.inviteBtnText}>ПРИГЛАСИТЬ СОТРУДНИКА</Text>
                    </TouchableOpacity>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 40, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#000', fontStyle: 'italic', marginLeft: 12, flex: 1 },
    headerRight: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

    list: { paddingHorizontal: 24, paddingBottom: 40 },
    listHeader: { marginTop: 12, marginBottom: 16 },
    sectionLabel: { fontSize: 11, fontWeight: '900', color: '#64748b', letterSpacing: 1 },

    inviteBtn: {
        marginTop: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 32,
    },
    inviteBtnText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#fff',
        fontStyle: 'italic',
        letterSpacing: 0.5,
    },
});
