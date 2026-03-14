import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { createManualBooking, fetchMyRestaurant } from '../../lib/api';

export default function AdminAddBookingScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('19:00');
    const [guests, setGuests] = useState('2');
    const [eventType, setEventType] = useState('private');
    const [eventTitle, setEventTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);

    const isBlank = (v: string) => !v || !v.trim();

    const handleCreate = async () => {
        setSubmitAttempted(true);
        if (isBlank(name) || isBlank(phone) || isBlank(date) || isBlank(time) || isBlank(guests)) {
            Alert.alert('Ошибка', 'Пожалуйста, заполните необходимые поля (имя, телефон, дата, время, гости)');
            return;
        }

        setIsSubmitting(true);
        try {
            const restaurant = await fetchMyRestaurant(user.access);

            const res = await createManualBooking({
                restaurant: restaurant.id,
                user_name_manual: name,
                user_phone_manual: phone,
                date,
                time,
                guests: parseInt(guests),
                event_type: eventType,
                event_title: eventTitle || `Бронь: ${name}`,
                status: 'confirmed'
            }, user.access);

            Alert.alert('Успех', 'Бронирование создано!', [
                { text: 'ОК', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Error creating manual booking:', error);
            Alert.alert('Ошибка', 'Не удалось создать бронирование');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Новое бронирование</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Имя гостя*</Text>
                    <TextInput
                        style={[styles.input, submitAttempted && isBlank(name) ? styles.inputError : null]}
                        placeholder="Александр"
                        value={name}
                        onChangeText={setName}
                    />
                    {submitAttempted && isBlank(name) ? <Text style={styles.errorText}>Введите имя</Text> : null}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Телефон*</Text>
                    <TextInput
                        style={[styles.input, submitAttempted && isBlank(phone) ? styles.inputError : null]}
                        placeholder="+7..."
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                    />
                    {submitAttempted && isBlank(phone) ? <Text style={styles.errorText}>Введите номер телефона</Text> : null}
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Дата*</Text>
                        <TextInput
                            style={[styles.input, submitAttempted && isBlank(date) ? styles.inputError : null]}
                            placeholder="ГГГГ-ММ-ДД"
                            value={date}
                            onChangeText={setDate}
                        />
                        {submitAttempted && isBlank(date) ? <Text style={styles.errorText}>Введите дату</Text> : null}
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Время*</Text>
                        <TextInput
                            style={[styles.input, submitAttempted && isBlank(time) ? styles.inputError : null]}
                            placeholder="ЧЧ:ММ"
                            value={time}
                            onChangeText={setTime}
                        />
                        {submitAttempted && isBlank(time) ? <Text style={styles.errorText}>Введите время</Text> : null}
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Гости*</Text>
                        <TextInput
                            style={[styles.input, submitAttempted && isBlank(guests) ? styles.inputError : null]}
                            placeholder="Кол-во"
                            keyboardType="numeric"
                            value={guests}
                            onChangeText={setGuests}
                        />
                        {submitAttempted && isBlank(guests) ? <Text style={styles.errorText}>Укажите количество гостей</Text> : null}
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Тип события</Text>
                        <TouchableOpacity
                            style={styles.selectBtn}
                            onPress={() => setEventType(eventType === 'private' ? 'business' : 'private')}
                        >
                            <Text style={styles.selectText}>
                                {eventType === 'private' ? 'Частное' : 'Бизнес'}
                            </Text>
                            <MaterialIcons name="swap-horiz" size={18} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Название события (необязательно)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Напр. День рождения"
                        value={eventTitle}
                        onChangeText={setEventTitle}
                    />
                </View>

                <View style={{ height: 40 }} />

                <TouchableOpacity
                    style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                    onPress={handleCreate}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitText}>Создать бронь</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    backBtn: { width: 44, height: 44, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    content: { padding: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: colors.surface, padding: 16, borderRadius: 16, fontSize: 15, borderWidth: 1, borderColor: colors.border, color: colors.text },
    inputError: { borderColor: colors.error },
    errorText: { marginTop: 6, marginLeft: 4, fontSize: 12, fontWeight: '600', color: colors.error },
    row: { flexDirection: 'row', gap: 16 },
    selectBtn: { backgroundColor: colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    selectText: { fontSize: 15, color: colors.text, fontWeight: '500' },
    submitBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
