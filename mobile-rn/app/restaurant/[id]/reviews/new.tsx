import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../../theme/colors';
import { createReview } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';

export default function NewReviewScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const restaurantId = params.id as string;

    // Support deep link query params where booking id might be passed
    const bookingId = params.booking_id as string | undefined;

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('Ошибка', 'Пожалуйста, поставьте оценку от 1 до 5 звезд.');
            return;
        }

        setIsSubmitting(true);
        try {
            await createReview(restaurantId, {
                rating,
                comment,
                booking_id: bookingId
            }, user?.access);
            Alert.alert(
                'Спасибо!',
                'Ваш отзыв успешно отправлен и поможет другим гостям.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            console.error('Failed to submit review:', error);
            Alert.alert('Ошибка', 'Не удалось отправить отзыв. Попробуйте позже.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Оставить отзыв</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.promptText}>Как вам понравилось заведение?</Text>

                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                            key={star}
                            activeOpacity={0.7}
                            onPress={() => setRating(star)}
                            style={styles.starBtn}
                        >
                            <MaterialIcons
                                name={star <= rating ? "star" : "star-border"}
                                size={48}
                                color={star <= rating ? "#FBBF24" : colors.border}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                {rating > 0 && (
                    <Text style={styles.ratingText}>
                        {rating === 1 ? 'Ужасно' : rating === 2 ? 'Плохо' : rating === 3 ? 'Нормально' : rating === 4 ? 'Хорошо' : 'Отлично!'}
                    </Text>
                )}

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Ваш комментарий (необязательно)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Что вам понравилось или не понравилось?"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                        value={comment}
                        onChangeText={setComment}
                    />
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
                    activeOpacity={0.8}
                    onPress={handleSubmit}
                    disabled={rating === 0 || isSubmitting}
                >
                    <Text style={styles.submitBtnText}>
                        {isSubmitting ? 'Отправка...' : 'Отправить отзыв'}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 20,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 32,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    scrollContent: {
        padding: 24,
    },
    promptText: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
    },
    starBtn: {
        padding: 4,
    },
    ratingText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#FBBF24',
        marginBottom: 40,
    },
    inputContainer: {
        marginTop: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 12,
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 32,
        padding: 16,
        fontSize: 16,
        color: colors.text,
        minHeight: 120,
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    submitBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnDisabled: {
        backgroundColor: colors.border,
    },
    submitBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
});
