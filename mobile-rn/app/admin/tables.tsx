import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, RefreshControl, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { fetchTables, createTable, updateTable, deleteTable } from '../../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';

export default function AdminTablesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
    const [tables, setTables] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingTable, setEditingTable] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [number, setNumber] = useState('');
    const [seats, setSeats] = useState('');
    const [tableType, setTableType] = useState('rectangle');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (user?.access) loadData();
    }, [user]);

    const loadData = async (refresh = false) => {
        const token = user?.access;
        if (!token) {
            setIsLoading(false);
            return;
        }
        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        try {
            const data = await fetchTables(token);
            setTables(data || []);
        } catch (error) {
            console.error('Error fetching tables:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить список столов.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleAdd = () => {
        setEditingTable(null);
        setNumber('');
        setSeats('');
        setTableType('rectangle');
        setIsActive(true);
        setIsModalVisible(true);
    };

    const handleEdit = (table: any) => {
        setEditingTable(table);
        setNumber(table.number);
        setSeats(table.seats.toString());
        setTableType(table.table_type || 'rectangle');
        setIsActive(table.is_active !== false);
        setIsModalVisible(true);
    };

    const handleDelete = (id: number) => {
        Alert.alert(
            'Удаление стола',
            'Вы уверены, что хотите удалить этот стол?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        const token = user?.access;
                        if (!token) {
                            Alert.alert('Ошибка', 'Сессия истекла. Войдите заново.');
                            return;
                        }
                        try {
                            await deleteTable(id, token);
                            setTables(prev => prev.filter(t => t.id !== id));
                        } catch (error) {
                            Alert.alert('Ошибка', 'Не удалось удалить стол');
                        }
                    }
                }
            ]
        );
    };

    const handleSave = async () => {
        const token = user?.access;
        if (!token) {
            Alert.alert('Ошибка', 'Сессия истекла. Войдите заново.');
            return;
        }
        if (!number || !seats) {
            Alert.alert('Ошибка', 'Пожалуйста, заполните все поля');
            return;
        }

        setIsSaving(true);
        try {
            const data = {
                number,
                seats: parseInt(seats),
                table_type: tableType,
                is_active: isActive
            };

            if (editingTable) {
                const res = await updateTable(editingTable.id, data, token);
                setTables(prev => prev.map(t => t.id === editingTable.id ? res : t));
            } else {
                const res = await createTable(data, token);
                setTables(prev => [...prev, res]);
            }
            setIsModalVisible(false);
        } catch (error: any) {
            Alert.alert('Ошибка', error.message || 'Не удалось сохранить стол');
        } finally {
            setIsSaving(false);
        }
    };

    const renderTableIcon = (type: string) => {
        switch (type) {
            case 'circle': return <Ionicons name="ellipse-outline" size={24} color={colors.primary} />;
            case 'square': return <Ionicons name="square-outline" size={24} color={colors.primary} />;
            default: return <Ionicons name="remove-outline" size={24} color={colors.primary} />;
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Управление столами</Text>
                <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
                    <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={tables}
                numColumns={isTablet ? 2 : 1}
                key={isTablet ? 'tablet' : 'phone'}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />
                }
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={7}
                removeClippedSubviews
                renderItem={({ item }) => (
                    <View style={[styles.tableCardWrap, isTablet && styles.tableCardWrapTablet]}>
                    <View style={styles.tableCard}>
                        <View style={styles.tableInfo}>
                            <View style={styles.iconContainer}>
                                {renderTableIcon(item.table_type)}
                            </View>
                            <View>
                                <Text style={styles.tableNumber}>Стол №{item.number}</Text>
                                <Text style={styles.tableSeats}>{item.seats} мест {item.is_active === false ? '· Неактивен' : ''}</Text>
                            </View>
                        </View>
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
                                <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="grid-outline" size={64} color={colors.muted} />
                        <Text style={styles.emptyText}>У вас пока нет добавленных столов</Text>
                        <TouchableOpacity style={styles.setupBtn} onPress={handleAdd}>
                            <Text style={styles.setupBtnText}>Добавить первый стол</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            <Modal visible={isModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingTable ? 'Редактировать стол' : 'Добавить стол'}</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Номер стола*</Text>
                                <TextInput
                                    style={styles.input}
                                    value={number}
                                    onChangeText={setNumber}
                                    placeholder="Напр. 1 или VIP-1"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Количество мест*</Text>
                                <TextInput
                                    style={styles.input}
                                    value={seats}
                                    onChangeText={setSeats}
                                    keyboardType="numeric"
                                    placeholder="Напр. 4"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Тип стола</Text>
                                <View style={styles.typeRow}>
                                    {['rectangle', 'circle', 'square'].map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                styles.typeBtn,
                                                tableType === type && styles.typeBtnActive
                                            ]}
                                            onPress={() => setTableType(type)}
                                        >
                                            <Text style={[
                                                styles.typeBtnText,
                                                tableType === type && styles.typeBtnTextActive
                                            ]}>
                                                {type === 'rectangle' ? 'Прям.' : type === 'circle' ? 'Круг' : 'Квадр.'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={[styles.inputGroup, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }]}>
                                <View>
                                    <Text style={styles.label}>Активен для смены</Text>
                                    <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 4, marginTop: 2, maxWidth: 220 }}>Если выключить, стол не будет доступен для посадки.</Text>
                                </View>
                                <Switch
                                    value={isActive}
                                    onValueChange={setIsActive}
                                    trackColor={{ false: '#e2e8f0', true: colors.primary }}
                                    thumbColor="#fff"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                                onPress={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Сохранить</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f5f9' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, backgroundColor: '#fff' },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    addBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
    listContent: { paddingVertical: 20, paddingBottom: 120 },
    tableCardWrap: { width: '100%' },
    tableCardWrapTablet: { width: '50%', paddingHorizontal: 6 },
    tableCard: { backgroundColor: '#fff', borderRadius: 32, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    tableInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconContainer: { width: 48, height: 48, borderRadius: 40, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    tableNumber: { fontSize: 16, fontWeight: '700', color: colors.text },
    tableSeats: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { width: 36, height: 36, borderRadius: 32, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { fontSize: 15, color: colors.textSecondary, marginTop: 16, textAlign: 'center' },
    setupBtn: { marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 40 },
    setupBtnText: { color: '#fff', fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    modalContentTablet: { alignSelf: 'center', width: '100%', maxWidth: 680, borderRadius: 32, marginBottom: 32 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    form: { gap: 20 },
    inputGroup: { gap: 8 },
    label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginLeft: 4 },
    input: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 40, fontSize: 15, borderWidth: 1, borderColor: colors.border },
    typeRow: { flexDirection: 'row', gap: 10 },
    typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 40, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    typeBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    typeBtnTextActive: { color: '#fff' },
    saveBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 32, alignItems: 'center', marginTop: 12 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
