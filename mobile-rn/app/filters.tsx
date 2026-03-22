import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function FiltersModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [equipment, setEquipment] = useState({
        projector: true,
        wifi: true,
        vip: false,
        sound: false,
    });

    const [cuisine, setCuisine] = useState('Европейская');
    const [capacity, setCapacity] = useState('10-30');

    const [amenities, setAmenities] = useState({
        parking: false,
        terrace: false,
        kids: false,
    });

    const toggleEq = (key: keyof typeof equipment) => setEquipment(p => ({ ...p, [key]: !p[key] }));
    const toggleAm = (key: keyof typeof amenities) => setAmenities(p => ({ ...p, [key]: !p[key] }));

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Фильтры</Text>
                <TouchableOpacity onPress={() => { }} style={styles.iconButton}>
                    <Text style={styles.resetText}>Сбросить</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ДЕЛОВОЕ ОСНАЩЕНИЕ</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleEq('projector')}>
                            <Text style={styles.checkboxLabel}>Проектор</Text>
                            <Ionicons name={equipment.projector ? "checkbox" : "square-outline"} size={24} color={equipment.projector ? colors.primary : colors.border} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleEq('wifi')}>
                            <Text style={styles.checkboxLabel}>Wi-Fi</Text>
                            <Ionicons name={equipment.wifi ? "checkbox" : "square-outline"} size={24} color={equipment.wifi ? colors.primary : colors.border} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleEq('vip')}>
                            <Text style={styles.checkboxLabel}>VIP-зал</Text>
                            <Ionicons name={equipment.vip ? "checkbox" : "square-outline"} size={24} color={equipment.vip ? colors.primary : colors.border} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleEq('sound')}>
                            <Text style={styles.checkboxLabel}>Звуковое оборудование</Text>
                            <Ionicons name={equipment.sound ? "checkbox" : "square-outline"} size={24} color={equipment.sound ? colors.primary : colors.border} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ТИП КУХНИ</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={{ paddingRight: 16 }}>
                        {['Европейская', 'Азиатская', 'Казахская', 'Итальянская'].map(c => {
                            const isActive = cuisine === c;
                            return (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.pill, isActive && styles.pillActive]}
                                    onPress={() => setCuisine(c)}
                                >
                                    <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{c}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ВМЕСТИМОСТЬ</Text>
                    <View style={styles.grid}>
                        {[
                            { id: '10', label: 'до 10 чел' },
                            { id: '10-30', label: '10 – 30 чел' },
                            { id: '30-100', label: '30 – 100 чел' },
                            { id: '100+', label: '100+ чел' },
                        ].map(item => {
                            const isActive = capacity === item.id;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.gridItem, isActive && styles.gridItemActive]}
                                    onPress={() => setCapacity(item.id)}
                                >
                                    <Text style={[styles.gridItemText, isActive && styles.gridItemTextActive]}>{item.label}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>УДОБСТВА</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleAm('parking')}>
                            <View style={styles.iconLabelRow}>
                                <Text style={styles.iconMock}>P</Text>
                                <Text style={styles.checkboxLabel}>Парковка</Text>
                            </View>
                            <Ionicons name={amenities.parking ? "checkbox" : "square-outline"} size={24} color={amenities.parking ? colors.primary : colors.border} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleAm('terrace')}>
                            <View style={styles.iconLabelRow}>
                                <MaterialIcons name="beach-access" size={18} color={colors.textSecondary} style={{ width: 20, textAlign: 'center' }} />
                                <Text style={styles.checkboxLabel}>Летняя терраса</Text>
                            </View>
                            <Ionicons name={amenities.terrace ? "checkbox" : "square-outline"} size={24} color={amenities.terrace ? colors.primary : colors.border} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleAm('kids')}>
                            <View style={styles.iconLabelRow}>
                                <MaterialIcons name="child-care" size={18} color={colors.textSecondary} style={{ width: 20, textAlign: 'center' }} />
                                <Text style={styles.checkboxLabel}>Детская зона</Text>
                            </View>
                            <Ionicons name={amenities.kids ? "checkbox" : "square-outline"} size={24} color={amenities.kids ? colors.primary : colors.border} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
                <TouchableOpacity style={styles.submitBtn} onPress={() => router.back()}>
                    <Text style={styles.submitBtnText}>Показать 124 результата</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f6f7f8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        zIndex: 10,
    },
    iconButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    resetText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    scroll: {
        paddingVertical: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 40,
        marginHorizontal: 16,
        paddingHorizontal: 16,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    checkboxLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
    },
    horizontalScroll: {
        paddingLeft: 16,
    },
    pill: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 40,
        marginRight: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    pillActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    pillText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    pillTextActive: {
        color: '#ffffff',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        justifyContent: 'space-between',
    },
    gridItem: {
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 40,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#ffffff',
    },
    gridItemActive: {
        backgroundColor: '#eff6ff', // blue-50
        borderColor: '#bfdbfe', // blue-200
    },
    gridItemText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    gridItemTextActive: {
        color: colors.primary,
    },
    iconLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconMock: {
        width: 20,
        textAlign: 'center',
        fontWeight: '800',
        fontSize: 16,
        color: colors.textSecondary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        padding: 16,
        paddingTop: 16,
    },
    submitBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 40,
        alignItems: 'center',
    },
    submitBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    }
});
