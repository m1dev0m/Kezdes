import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { AdminMenuItem, createAdminMenuItem, fetchAdminMenuItems, updateAdminMenuItem } from '../../lib/api';

export default function AdminMenuScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [items, setItems] = useState<AdminMenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newDesc, setNewDesc] = useState('');

    useEffect(() => {
        if (!user?.access) return;
        loadItems();
    }, [user]);

    const loadItems = async () => {
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
    };

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

    const toggleAvailable = async (item: AdminMenuItem) => {
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
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="chevron-back" size={24} color={colors.text} onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Меню заведения</Text>
                <View style={styles.addBtn} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Добавить блюдо</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Название</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Напр. Фирменный стейк"
                            value={newName}
                            onChangeText={setNewName}
                        />
                    </View>
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Цена (₸)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="5400"
                                keyboardType="numeric"
                                value={newPrice}
                                onChangeText={setNewPrice}
                            />
                        </View>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Описание (необязательно)</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                            placeholder="Краткое описание блюда..."
                            multiline
                            value={newDesc}
                            onChangeText={setNewDesc}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                        disabled={isSaving}
                        onPress={handleCreate}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Сохранить</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>Текущее меню</Text>

                {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : items.length === 0 ? (
                    <Text style={styles.emptyText}>Вы еще не добавили блюда.</Text>
                ) : (
                    items.map(item => (
                        <View key={item.id} style={styles.menuItem}>
                            <View style={styles.itemImage}>
                                <MaterialCommunityIcons name="food" size={32} color={colors.primary} />
                            </View>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemPrice}>{parseFloat(item.price).toLocaleString('ru-RU')} ₸</Text>
                                {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
                            </View>
                            <View style={styles.itemActions}>
                                <TouchableOpacity
                                    style={styles.statusSwitch}
                                    activeOpacity={0.8}
                                    onPress={() => toggleAvailable(item)}
                                >
                                    <View
                                        style={[
                                            styles.switchDot,
                                            !item.is_available && { alignSelf: 'flex-start', backgroundColor: '#e5e7eb' },
                                        ]}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    addBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
    content: { padding: 20 },
    formCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 24 },
    formTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
    inputGroup: { marginBottom: 12 },
    label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 4 },
    input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text },
    row: { flexDirection: 'row', gap: 12 },
    saveBtn: { marginTop: 8, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 },
    emptyText: { fontSize: 13, color: colors.textSecondary },
    menuItem: { flexDirection: 'row', padding: 16, borderRadius: 20, backgroundColor: colors.surface, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    itemImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    itemInfo: { flex: 1, marginLeft: 16 },
    itemName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
    itemPrice: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 4 },
    itemDesc: { fontSize: 12, color: colors.muted },
    itemActions: { alignItems: 'flex-end', justifyContent: 'space-between' },
    statusSwitch: { width: 40, height: 24, borderRadius: 12, backgroundColor: '#16a34a', paddingHorizontal: 4, justifyContent: 'center' },
    switchDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', alignSelf: 'flex-end' },
});
