import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const MOCK_FAVORITES = [
    { id: '1', name: 'hhal', address: 'пр. Абая, 10', rating: 4.8, image: null },
    { id: '2', name: 'Sky Lounge', address: 'ул. Достык, 50', rating: 4.9, image: null },
];

export default function FavoritesScreen() {
    const router = useRouter();

    const renderItem = ({ item }: { item: typeof MOCK_FAVORITES[0] }) => (
        <TouchableOpacity style={styles.card} onPress={() => router.push(`/restaurant/${item.id}`)}>
            <View style={styles.imageBox}>
                <Ionicons name="restaurant" size={32} color={colors.primary} />
                <TouchableOpacity style={styles.favBtn}>
                    <Ionicons name="heart" size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.address}>{item.address}</Text>
                <View style={styles.ratingRow}>
                    <MaterialIcons name="star" size={16} color="#f59e0b" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Избранное</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={MOCK_FAVORITES}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="heart-outline" size={64} color={colors.muted} />
                        <Text style={styles.emptyText}>Ничего не добавлено в избранное</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    list: { padding: 16 },
    card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 16 },
    imageBox: { width: 100, height: 100, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    favBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', padding: 4, borderRadius: 8 },
    info: { flex: 1, justifyContent: 'center' },
    name: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
    address: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { fontSize: 14, fontWeight: '600', color: colors.text },
    empty: { marginTop: 100, alignItems: 'center' },
    emptyText: { marginTop: 16, color: colors.muted, fontSize: 16 },
});
