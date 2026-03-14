import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const STAFF = [
    { id: '1', name: 'Айзада Б.', role: 'Менеджер', status: 'В сети' },
    { id: '2', name: 'Берик К.', role: 'Официант', status: 'Перерыв' },
    { id: '3', name: 'Данияр М.', role: 'Администратор', status: 'В сети' },
];

export default function AdminStaffScreen() {
    const router = useRouter();

    const renderStaff = ({ item }: { item: typeof STAFF[0] }) => (
        <View style={styles.staffCard}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]}</Text>
            </View>
            <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{item.name}</Text>
                <Text style={styles.staffRole}>{item.role}</Text>
            </View>
            <View style={styles.statusBox}>
                <View style={[styles.statusDot, { backgroundColor: item.status === 'В сети' ? '#16a34a' : '#f59e0b' }]} />
                <Text style={styles.statusText}>{item.status}</Text>
            </View>
            <TouchableOpacity style={styles.moreBtn}>
                <Ionicons name="ellipsis-vertical" size={20} color={colors.muted} />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Персонал</Text>
                <TouchableOpacity style={styles.addBtn}>
                    <Ionicons name="person-add-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={STAFF}
                renderItem={renderStaff}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListFooterComponent={
                    <TouchableOpacity style={styles.inviteCard}>
                        <Ionicons name="mail-outline" size={24} color={colors.primary} />
                        <Text style={styles.inviteText}>Пригласить сотрудника</Text>
                    </TouchableOpacity>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    addBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
    list: { padding: 16 },
    staffCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    staffInfo: { flex: 1 },
    staffName: { fontSize: 16, fontWeight: '700', color: colors.text },
    staffRole: { fontSize: 13, color: colors.textSecondary },
    statusBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 12 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, color: colors.textSecondary },
    moreBtn: { padding: 4 },
    inviteCard: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
    inviteText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
