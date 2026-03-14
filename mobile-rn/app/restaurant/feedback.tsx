import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function RestaurantFeedbackScreen() {
    const router = useRouter();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    const handleSubmit = () => {
        if (rating === 0) {
            Alert.alert("Ошибка", "Пожалуйста, поставьте оценку");
            return;
        }
        Alert.alert("Спасибо!", "Ваш отзыв успешно отправлен");
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Оставить отзыв</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.restaurantRow}>
                    <View style={styles.iconBox}>
                        <Ionicons name="restaurant" size={32} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.restaurantName}>hhal</Text>
                        <Text style={styles.restaurantSub}>Ваш визит был 25 Октября</Text>
                    </View>
                </View>

                <View style={styles.ratingSection}>
                    <Text style={styles.sectionTitle}>Как вам наше заведение?</Text>
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map(star => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <MaterialIcons
                                    name={star <= rating ? "star" : "star-border"}
                                    size={44}
                                    color={star <= rating ? "#f59e0b" : colors.border}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.commentSection}>
                    <Text style={styles.sectionTitle}>Поделитесь впечатлениями</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Что вам особенно понравилось?"
                        placeholderTextColor={colors.muted}
                        multiline
                        numberOfLines={6}
                        value={comment}
                        onChangeText={setComment}
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                    <Text style={styles.submitText}>Отправить отзыв</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    content: { padding: 24 },
    restaurantRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 40 },
    iconBox: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
    restaurantName: { fontSize: 20, fontWeight: '700', color: colors.text },
    restaurantSub: { fontSize: 13, color: colors.textSecondary },
    ratingSection: { alignItems: 'center', marginBottom: 40 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 20 },
    starsRow: { flexDirection: 'row', gap: 12 },
    commentSection: { marginBottom: 40 },
    input: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, fontSize: 15, color: colors.text, minHeight: 150, borderWidth: 1, borderColor: colors.border },
    submitBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
