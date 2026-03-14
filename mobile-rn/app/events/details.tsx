import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function EventDetailsCreateScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [guests, setGuests] = useState('50');
    const [budget, setBudget] = useState('500,000');
    const [notes, setNotes] = useState('');

    const handleCreate = () => {
        router.replace('/(tabs)/events');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Детали события</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Почти готово!</Text>
                <Text style={styles.subtitle}>Укажите количество гостей и бюджет, чтобы заведения могли предложить вам лучшие варианты.</Text>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Количество гостей</Text>
                        <TextInput
                            style={styles.input}
                            value={guests}
                            onChangeText={setGuests}
                            keyboardType="numeric"
                            placeholder="Напр. 50"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Примерный бюджет (₸)</Text>
                        <TextInput
                            style={styles.input}
                            value={budget}
                            onChangeText={setBudget}
                            keyboardType="numeric"
                            placeholder="Напр. 500,000"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Дополнительные пожелания</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Напр. Оборудование для диджея, детская зона..."
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: '100%' }]} />
                </View>
                <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                    <Text style={styles.createBtnText}>Создать событие</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    content: { padding: 24 },
    title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 8 },
    subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 32, lineHeight: 22 },
    form: { gap: 20 },
    inputGroup: { gap: 8 },
    label: { fontSize: 14, fontWeight: '700', color: colors.text },
    input: { height: 56, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
    textArea: { height: 120, paddingTop: 16, textAlignVertical: 'top' },
    footer: { padding: 24, borderTopWidth: 1, borderTopColor: colors.border },
    progressContainer: { height: 6, backgroundColor: colors.surface, borderRadius: 3, marginBottom: 16, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: colors.primary },
    createBtn: { height: 56, backgroundColor: colors.primary, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
