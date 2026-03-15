import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { AdminMenuItem, createAdminMenuItem, fetchAdminMenuItems, updateAdminMenuItem } from '../../lib/api';

import MenuItemCard from '../../components/MenuItemCard';

export default function AdminMenuScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [items, setItems] = useState<AdminMenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const loadItems = React.useCallback(async () => {
        if (!user?.access) return;
        setIsLoading(true);
        try {
            const data = await fetchAdminMenuItems(user.access);
            setItems(data);
        } catch (e: any) {
            Alert.alert('Ошибка', e?.message || 'Не удалось загрузить меню.');
        } finally {
            setIsLoading(false);
        }
    }, [user?.access]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const handleCreate = async () => {
        if (!user?.access) return;
        if (!newName.trim() || !newPrice.trim()) {
            Alert.alert('Ошибка', 'Введите название и цену.');
            return;
        }
        const priceNum = parseFloat(newPrice.replace(/\s/g, ''));
        if (!Number.isFinite(priceNum) || priceNum <= 0) {
            Alert.alert('Ошибка', 'Введите корректную цену.');
            return;
        }
        setIsSaving(true);
        try {
            const created = await createAdminMenuItem(
                { name: newName.trim(), price: priceNum, description: newDesc.trim() || undefined },
                user.access,
            );
            setItems((prev) => [created, ...prev]);
            setNewName('');
            setNewPrice('');
            setNewDesc('');
        } catch (e: any) {
            Alert.alert('Ошибка', e?.message || 'Не удалось добавить блюдо.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleAvailable = React.useCallback(async (item: AdminMenuItem) => {
        if (!user?.access) return;
        try {
            const updated = await updateAdminMenuItem(
                item.id,
                { is_available: !item.is_available },
                user.access,
            );
            setItems((prev) => prev.map((it) => (it.id === item.id ? updated : it)));
        } catch (e: any) {
            Alert.alert('Ошибка', e?.message || 'Не удалось обновить статус блюда.');
        }
    }, [user?.access]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Меню</Text>
                <View style={styles.headerRight}>
                    <Ionicons name="restaurant-outline" size={20} color="#000" />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>ДОБАВИТЬ БЛЮДО</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>НАЗВАНИЕ</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Напр. Стейк Рибай"
                            placeholderTextColor="#94a3b8"
                            value={newName}
                            onChangeText={setNewName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>ЦЕНА (₸)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="7500"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            value={newPrice}
                            onChangeText={setNewPrice}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>ОПИСАНИЕ</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Ингредиенты, степень прожарки..."
                            placeholderTextColor="#94a3b8"
                            multiline
                            numberOfLines={3}
                            value={newDesc}
                            onChangeText={setNewDesc}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, isSaving && styles.btnDisabled]}
                        disabled={isSaving}
                        onPress={handleCreate}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>ДОБАВИТЬ В МЕНЮ</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>ТЕКУЩИЙ СПИСОК</Text>

                {isLoading ? (
                    <ActivityIndicator size="small" color="#000" style={{ marginTop: 20 }} />
                ) : items.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="fast-food-outline" size={48} color="#e2e8f0" />
                        <Text style={styles.emptyText}>Блюда пока не добавлены</Text>
                    </View>
                ) : (
                    items.map(item => (
                        <MenuItemCard key={item.id} item={item} onToggle={toggleAvailable} />
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#000', fontStyle: 'italic', marginLeft: 12, flex: 1 },
    headerRight: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

    content: { paddingHorizontal: 24, paddingBottom: 40 },

    formCard: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 24,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    formTitle: { fontSize: 11, fontWeight: '900', color: '#64748b', letterSpacing: 1, marginBottom: 20 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 8 },
    input: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    saveBtn: {
        marginTop: 12,
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '900', fontStyle: 'italic' },
    btnDisabled: { opacity: 0.7 },

    sectionLabel: { fontSize: 11, fontWeight: '900', color: '#64748b', letterSpacing: 1, marginBottom: 16 },
    emptyContainer: { alignItems: 'center', marginTop: 40, gap: 12 },
    emptyText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
});
