import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function AdminClaimScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Подключить заведение</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.hero}>
                    <MaterialIcons name="add-business" size={64} color={colors.primary} />
                    <Text style={styles.heroTitle}>Развивайте бизнес с Kezdes</Text>
                    <Text style={styles.heroSubtitle}>Мы поможем вам привлечь больше гостей и автоматизировать бронирования</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Название заведения</Text>
                        <TextInput style={styles.input} placeholder="Напр. hhal" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Контактное лицо</Text>
                        <TextInput style={styles.input} placeholder="Имя Фамилия" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Номер телефона</Text>
                        <TextInput style={styles.input} placeholder="+7 (___) ___-__-__" keyboardType="phone-pad" />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={() => router.back()}>
                        <Text style={styles.submitText}>Отправить заявку</Text>
                    </TouchableOpacity>

                    <Text style={styles.disclaimer}>
                        После отправки заявки наш менеджер свяжется с вами в течение 24 часов для подтверждения данных.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    content: { padding: 24 },
    hero: { alignItems: 'center', marginBottom: 40 },
    heroTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 16, textAlign: 'center' },
    heroSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    form: { gap: 20 },
    inputGroup: { gap: 8 },
    label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginLeft: 4 },
    input: { backgroundColor: colors.surface, padding: 18, borderRadius: 32, fontSize: 15, borderWidth: 1, borderColor: colors.border },
    submitBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 32, alignItems: 'center', marginTop: 12 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    disclaimer: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
});
