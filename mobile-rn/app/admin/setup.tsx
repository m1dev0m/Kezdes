import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { createRestaurant, updateMyRestaurant, fetchMyRestaurant, createRestaurantApplication } from '../../lib/api';

export default function RestaurantSetupScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [capacity, setCapacity] = useState('');
    const [averagePrice, setAveragePrice] = useState('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [floor, setFloor] = useState('');
    const [entrance, setEntrance] = useState('');
    const [extraAddressInfo, setExtraAddressInfo] = useState('');
    const [latitude, setLatitude] = useState(43.2389);
    const [longitude, setLongitude] = useState(76.8897);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
    const [isSearchingAddress, setIsSearchingAddress] = useState(false);
    const searchTimeout = useRef<any>(null);

    React.useEffect(() => {
        if (params.edit === 'true') {
            setIsEdit(true);
            loadData();
        }
    }, [params.edit]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await fetchMyRestaurant(user.access);
            setName(data.name);
            setAddress(data.address);
            setCapacity(data.capacity?.toString() || '');
            setAveragePrice(data.average_price?.toString() || '');
            setPhone(data.phone || '');
            setDescription(data.description || '');
            setFloor(data.floor || '');
            setEntrance(data.entrance || '');
            setExtraAddressInfo(data.extra_address_info || '');
            if (data.latitude) setLatitude(data.latitude);
            if (data.longitude) setLongitude(data.longitude);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            Alert.alert('Внимание', 'Не удалось загрузить данные ресторана.');
        } finally {
            setIsLoading(false);
        }
    };

    const search2GIS = async (query: string) => {
        if (!query || query.length < 3) {
            setAddressSuggestions([]);
            return;
        }
        const apiKey = process.env.EXPO_PUBLIC_2GIS_API_KEY;
        if (!apiKey) {
            setAddressSuggestions([]);
            return;
        }
        setIsSearchingAddress(true);
        try {
            const res = await fetch(`https://catalog.api.2gis.com/3.0/items?q=${encodeURIComponent(query)}&key=${apiKey}&fields=items.point,items.address_name`);
            const data = await res.json();

            if (data.result && data.result.items) {
                const suggestions = data.result.items.map((item: any) => ({
                    id: item.id,
                    name: item.address_name || item.name,
                    lat: item.point?.lat,
                    lon: item.point?.lon
                }));
                setAddressSuggestions(suggestions);
            } else {
                setAddressSuggestions([]);
            }
        } catch (err) {
            console.error('2GIS Search Error:', err);
        } finally {
            setIsSearchingAddress(false);
        }
    };

    const handleSave = async () => {
        if (!name || !address || !capacity || !averagePrice) {
            Alert.alert('Ошибка', 'Пожалуйста, заполните основные поля (название, адрес, вместимость, средний чек)');
            return;
        }

        setIsSubmitting(true);
        try {
            const data = {
                name,
                address,
                capacity: parseInt(capacity),
                average_price: parseInt(averagePrice),
                phone,
                description,
                floor,
                entrance,
                extra_address_info: extraAddressInfo,
                latitude,
                longitude
            };

            if (isEdit) {
                await updateMyRestaurant(data, user.access);
                setJustSaved(true);
                setTimeout(() => setJustSaved(false), 1200);
            } else {
                await createRestaurantApplication(
                    {
                        name,
                        city: 'Алматы',
                        address,
                        phone,
                    },
                    user.access
                );
                Alert.alert(
                    'Заявка отправлена',
                    'Ваша заявка на подключение ресторана отправлена. Мы свяжемся с вами после одобрения.',
                    [
                        {
                            text: 'ОК',
                            onPress: () => router.replace('/admin'),
                        },
                    ]
                );
            }
        } catch (error: any) {
            Alert.alert('Ошибка', 'Не удалось сохранить данные.');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Настройка ресторана</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.hero}>
                    <MaterialIcons name="restaurant" size={64} color={colors.primary} />
                    <Text style={styles.heroTitle}>Добро пожаловать!</Text>
                    <Text style={styles.heroSubtitle}>Давайте добавим ваше заведение в Kezdes</Text>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                ) : (
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Название заведения*</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Напр. Grand Ballroom"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Адрес*</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Напр. пр. Абая 44"
                                value={address}
                                onChangeText={(text) => {
                                    setAddress(text);
                                    if (searchTimeout.current) clearTimeout(searchTimeout.current);
                                    searchTimeout.current = setTimeout(() => {
                                        search2GIS(text);
                                    }, 500);
                                }}
                            />
                            {isSearchingAddress && (
                                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8, alignSelf: 'flex-start', marginLeft: 16 }} />
                            )}
                            {!isSearchingAddress && addressSuggestions.length > 0 && (
                                <View style={styles.suggestions}>
                                    {addressSuggestions.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={styles.suggestionItem}
                                            onPress={() => {
                                                setAddress(item.name);
                                                if (item.lat) setLatitude(item.lat);
                                                if (item.lon) setLongitude(item.lon);
                                                setAddressSuggestions([]);
                                            }}
                                        >
                                            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                                            <Text style={styles.suggestionText}>{item.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Этаж</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Этаж"
                                    value={floor}
                                    onChangeText={setFloor}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Подъезд/Вход</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Вход"
                                    value={entrance}
                                    onChangeText={setEntrance}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Доп. инфо для курьера/гостя</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Напр. код домофона"
                                value={extraAddressInfo}
                                onChangeText={setExtraAddressInfo}
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Вместимость*</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Человек"
                                    keyboardType="numeric"
                                    value={capacity}
                                    onChangeText={setCapacity}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Средний чек*</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Тенге"
                                    keyboardType="numeric"
                                    value={averagePrice}
                                    onChangeText={setAveragePrice}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Телефон</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="+7..."
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={setPhone}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Описание</Text>
                            <TextInput
                                style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                                placeholder="Расскажите о вашем заведении..."
                                multiline
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>

                        {isEdit && (
                            <TouchableOpacity
                                style={styles.manageTablesBtn}
                                onPress={() => router.push('/admin/tables')}
                            >
                                <MaterialCommunityIcons name="table-furniture" size={24} color={colors.primary} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.manageTablesTitle}>Управление столами</Text>
                                    <Text style={styles.manageTablesSub}>Добавьте или измените схему столов</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                            </TouchableOpacity>
                        )}

                        <View style={styles.bottomRow}>
                            {justSaved && (
                                <View style={styles.savedBadge}>
                                    <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                                    <Text style={styles.savedText}>Сохранено</Text>
                                </View>
                            )}
                            <TouchableOpacity
                                style={[styles.submitBtn, (isSubmitting) && { opacity: 0.7 }]}
                                onPress={handleSave}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitText}>{isEdit ? 'Сохранить изменения' : 'Завершить настройку'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    content: { padding: 24 },
    hero: { alignItems: 'center', marginBottom: 40 },
    heroTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 16 },
    heroSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
    form: { gap: 20 },
    inputGroup: { gap: 8 },
    inputRow: { flexDirection: 'row', gap: 16 },
    label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginLeft: 4 },
    input: { backgroundColor: colors.surface, padding: 18, borderRadius: 32, fontSize: 15, borderWidth: 1, borderColor: colors.border },
    bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, gap: 12 },
    savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#ecfdf5' },
    savedText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
    submitBtn: { flex: 1, backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 32, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    suggestions: { backgroundColor: colors.surface, borderRadius: 32, borderWidth: 1, borderColor: colors.border, marginTop: 4, overflow: 'hidden' },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    suggestionText: { fontSize: 14, color: colors.text },
    manageTablesBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8fafc',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginTop: 10
    },
    manageTablesTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    manageTablesSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
