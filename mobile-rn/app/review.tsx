import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ImageBackground,
    ActivityIndicator,
    Platform,
    TextInput,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../lib/auth-context';
import { createBooking, fetchAvailableSlots } from '../lib/api';

function getLocalDateString() {
    const now = new Date();
    const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function formatVisitDateLabel(value: string) {
    const date = new Date(`${value}T12:00:00`);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export default function ReviewScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [submitting, setSubmitting] = useState(false);
    const initialPayAtRestaurant =
        (params.payAtRestaurant as string) === 'true' || (params.payAtRestaurant as string) === '1';
    const [payInRestaurant, setPayInRestaurant] = useState(initialPayAtRestaurant);
    const { user } = useAuth();

    const restaurantName = (params.restaurantName as string) || (params.venueName as string) || 'Выбранный ресторан';
    const restaurantAddress = (params.restaurantAddress as string) || '';
    const restaurantImageUrl = (params.restaurantImageUrl as string) || '';
    const guestCount = parseInt(params.guests as string) || 2;
    const guestString = `${guestCount} гостей`;
    const totalBudget = parseInt(params.budget as string) || 0;
    const restaurantId = (params.restaurantId as string) || (params.venueId as string) || '';
    const [selectedDate, setSelectedDate] = useState((params.date as string) || getLocalDateString());
    const [showCalendar, setShowCalendar] = useState(false);
    const initialTimeCandidate = (() => {
        const raw = ((params.time as string) || '19:00').trim();
        const candidate = raw.split(' ')[0] || '19:00';
        return candidate.length >= 5 ? candidate.slice(0, 5) : '19:00';
    })();

    const [slots, setSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(true);
    const [slotsError, setSlotsError] = useState<string | null>(null);
    const [selectedSlot, setSelectedSlot] = useState(initialTimeCandidate);
    const [guestName, setGuestName] = useState('');
    const slotsAuthError = slotsError === 'Сессия истекла. Войдите снова.';
    const slotsTemporaryError = Boolean(slotsError && !slotsAuthError);
    const profilePhone = (user?.phone || '').trim();
    const hasProfilePhone = Boolean(profilePhone);
    const displayPhone = hasProfilePhone ? profilePhone : 'Номер не указан в профиле';

    const basePricePerPerson = 8000;
    const reservationPrice = guestCount * basePricePerPerson;
    const addonsCount = (params.addons && (params.addons as string).trim() !== '')
        ? (params.addons as string).split(',').length
        : 0;
    const addonsPrice = addonsCount * 10000;
    const finalTotal = reservationPrice + addonsPrice;

    const redirectTo = (() => {
        const nextParams = new URLSearchParams();
        const entries = [
            ['restaurantId', params.restaurantId as string | undefined],
            ['restaurantName', restaurantName],
            ['restaurantAddress', restaurantAddress],
            ['restaurantImageUrl', restaurantImageUrl],
            ['guests', String(guestCount)],
            ['date', selectedDate],
            ['time', selectedSlot],
            ['budget', params.budget as string | undefined],
            ['eventType', params.eventType as string | undefined],
            ['eventTitle', params.eventTitle as string | undefined],
            ['addons', params.addons as string | undefined],
            ['comments', params.comments as string | undefined],
            ['payAtRestaurant', payInRestaurant ? 'true' : 'false'],
            ['orderId', params.orderId as string | undefined],
        ] as const;

        entries.forEach(([key, value]) => {
            if (typeof value === 'string' && value.trim()) {
                nextParams.set(key, value);
            }
        });

        const query = nextParams.toString();
        return `/review${query ? `?${query}` : ''}`;
    })();

    const currentCalendarDate = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate]);
    const currentCalendarYear = currentCalendarDate.getFullYear();
    const currentCalendarMonth = currentCalendarDate.getMonth();
    const monthNames = useMemo(
        () => ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
        [],
    );
    const dayNames = useMemo(() => ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], []);
    const daysInMonth = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();
    const firstDayOfWeek = (new Date(currentCalendarYear, currentCalendarMonth, 1).getDay() + 6) % 7;

    const changeCalendarMonth = (delta: number) => {
        const next = new Date(currentCalendarYear, currentCalendarMonth + delta, 1, 12);
        const today = new Date();
        const floorToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
        if (next < floorToday) {
            setSelectedDate(getLocalDateString());
            return;
        }
        setSelectedDate(next.toISOString().slice(0, 10));
    };

    const loadSlots = async () => {
        if (!restaurantId) {
            setSlots([]);
            setSlotsError('Не удалось определить ресторан для проверки доступности.');
            setSlotsLoading(false);
            return;
        }

        setSlotsLoading(true);
        setSlotsError(null);
        try {
            const availability = await fetchAvailableSlots({
                restaurant_id: restaurantId,
                date: selectedDate,
                guests: guestCount,
            });
            const nextSlots = Array.isArray(availability?.slots) ? availability.slots : [];
            setSlots(nextSlots);
            if (nextSlots.length > 0) {
                setSelectedSlot((current) => (nextSlots.includes(current) ? current : nextSlots[0]));
            }
        } catch (error: any) {
            if (error?.message === 'SESSION_EXPIRED') {
                setSlotsError('Сессия истекла. Войдите снова.');
                setSlots([]);
                return;
            }
            setSlotsError('Не удалось загрузить слоты. Проверьте соединение и попробуйте снова.');
            setSlots([]);
        } finally {
            setSlotsLoading(false);
        }
    };

    useEffect(() => {
        void loadSlots();
        
    }, [restaurantId, selectedDate, guestCount]);

    useEffect(() => {
        const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
        if (fullName) {
            setGuestName(fullName);
            return;
        }
        if (user?.username) {
            setGuestName(user.username);
        }
    }, [user?.first_name, user?.last_name, user?.username]);

    const canConfirm = useMemo(() => {
        if (submitting) return false;
        if (slotsLoading) return false;
        if (!restaurantId) return false;
        if (slotsAuthError) return false;
        if (slots.length === 0 && !slotsTemporaryError) return false;
        return true;
    }, [restaurantId, slots.length, slotsAuthError, slotsLoading, slotsTemporaryError, submitting]);
    const isSubmitDisabled = !canConfirm || submitting;

    const handleConfirm = async () => {
        if (!user || !user.access) {
            alert('Войдите или зарегистрируйтесь, и мы вернём вас к подтверждению брони.');
            router.push({
                pathname: '/auth/login',
                params: {
                    redirectTo,
                },
            });
            return;
        }

        if (!guestName.trim()) {
            alert('Введите имя для бронирования.');
            return;
        }

        if (!hasProfilePhone) {
            alert('Добавьте номер телефона в профиль, чтобы завершить бронирование.');
            return;
        }

        setSubmitting(true);
        try {
            const startTimeCandidate = selectedSlot.length >= 5 ? selectedSlot.slice(0, 5) : initialTimeCandidate;
            let startTime = `${startTimeCandidate}:00`;

            if (!restaurantId) {
                alert('Не удалось определить ресторан для бронирования.');
                return;
            }

            try {
                const availability = await fetchAvailableSlots({
                    restaurant_id: restaurantId,
                    date: selectedDate,
                    guests: guestCount,
                });
                const slots = Array.isArray(availability?.slots) ? availability.slots : [];
                const candidateSlot = startTimeCandidate.length === 5 ? startTimeCandidate : initialTimeCandidate;

                if (slots.length === 0) {
                    alert('На выбранную дату свободных слотов нет. Попробуйте другую дату или ресторан.');
                    return;
                }

                if (!slots.includes(candidateSlot)) {
                    const fallbackSlot = slots[0];
                    alert(`Выбранное время недоступно. Ближайший слот: ${fallbackSlot}.`);
                    startTime = `${fallbackSlot}:00`;
                }
            } catch (error: any) {
                if (error?.message === 'SESSION_EXPIRED') {
                    return;
                }
                
            }

            let specialRequests = '';
            if (params.addons) specialRequests += `Доп. услуги: ${params.addons}. `;
            if (params.comments) specialRequests += `Комментарий: ${params.comments}`;

            const res = await createBooking({
                restaurant: restaurantId,
                date: selectedDate,
                time: startTime,
                guests: guestCount,
                user_name: guestName.trim(),
                user_phone: profilePhone,
                event_type: params.eventType as string || 'reservation',
                event_title: params.eventTitle as string || '',
                special_requests: specialRequests.trim(),
                budget: totalBudget,
                pay_at_restaurant: payInRestaurant,
                order_id: params.orderId ? parseInt(params.orderId as string) : undefined,
            }, user.access);

            router.push({
                pathname: '/booking/confirmation',
                params: {
                    bookingId: res.id,
                    restaurantName: restaurantName,
                    date: selectedDate,
                    time: startTime.slice(0, 5),
                    guests: String(guestCount),
                    eventTitle: params.eventTitle || '',
                    reservationPrice: reservationPrice.toString(),
                    addonsPrice: addonsPrice.toString(),
                    totalPrice: finalTotal.toString(),
                    payAtRestaurant: payInRestaurant ? 'true' : 'false',
                    depositRequired: res.deposit_required ? 'true' : 'false',
                    depositAmount: res.deposit_required ? String(res.deposit_required) : '0',
                    bookingStatus: res.status || 'pending',
                }
            });
        } catch (error: any) {
            if (error.message === 'SESSION_EXPIRED') {
                return; 
            }
            console.error('Booking failed:', error);
            const rawMessage = typeof error?.message === 'string' ? error.message : '';
            const mightBeAvailabilityIssue =
                /slot|available|availability|no\s*slots|time|date|стол|слот|время|дата/i.test(rawMessage);
            if (mightBeAvailabilityIssue && !rawMessage.trim()) {
                alert('Слот недоступен. Вернитесь назад и выберите другое время или дату.');
                return;
            }
            alert(rawMessage.trim() || 'Не удалось создать бронирование.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <MaterialIcons name="chevron-left" size={28} color={colors.primary} />
                    <Text style={styles.backText}>Назад</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Подтверждение</Text>
                <View style={{ width: 80 }} />
            </View>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.titleLarge}>Детали бронирования</Text>
                    <Text style={styles.subtitleMedium}>Пожалуйста, проверьте данные перед подтверждением</Text>
                </View>
                <View style={styles.summaryCard}>
                    <View style={styles.imageContainer}>
                        <ImageBackground
                            source={restaurantImageUrl ? { uri: restaurantImageUrl } : require('../assets/images/rest_bg.jpg')}
                            style={styles.summaryImagePlaceholder}
                            imageStyle={{ resizeMode: 'cover' }}
                        >
                            <View style={styles.summaryPremiumBadge}>
                                <Text style={styles.premiumBadgeText}>KEZDES</Text>
                            </View>
                        </ImageBackground>
                    </View>
                    <View style={styles.summaryCardBody}>
                        <View style={styles.summaryTypeRow}>
                            <View style={styles.tagWrap}>
                                <Text style={styles.tagText}>Бронирование</Text>
                            </View>
                            <Text style={styles.idText}>ID: #88291</Text>
                        </View>
                        <Text style={styles.summaryTitle}>Бронь в ресторане: {restaurantName}</Text>

                        <View style={styles.detailsList}>
                            <View style={styles.detailItem}>
                                <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
                                <TouchableOpacity style={styles.detailValueButton} activeOpacity={0.8} onPress={() => setShowCalendar(true)}>
                                    <Text style={styles.detailText}>{formatVisitDateLabel(selectedDate)}</Text>
                                    <MaterialIcons name="edit-calendar" size={18} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.detailItem}>
                                <MaterialIcons name="schedule" size={20} color={colors.primary} />
                                <Text style={styles.detailText}>{selectedSlot} (2 часа)</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <MaterialIcons name="group" size={20} color={colors.primary} />
                                <Text style={styles.detailText}>{guestString}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <MaterialIcons name="location-on" size={20} color={colors.primary} />
                                <Text style={styles.detailText} numberOfLines={1}>
                                    {restaurantAddress ? `${restaurantName}, ${restaurantAddress}` : restaurantName}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionBlock}>
                    <Text style={styles.sectionTitle}>КОНТАКТ ГОСТЯ</Text>
                    <View style={styles.contactCard}>
                        <Text style={styles.contactLabel}>Имя</Text>
                        <TextInput
                            style={styles.contactInput}
                            value={guestName}
                            onChangeText={setGuestName}
                            placeholder="Как к вам обращаться"
                            placeholderTextColor="#94a3b8"
                        />
                        <Text style={[styles.contactLabel, styles.contactLabelSpacing]}>Телефон</Text>
                        <View style={styles.contactPhoneBox}>
                            <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
                            <Text style={hasProfilePhone ? styles.contactPhoneText : styles.contactPhoneMutedText}>
                                {displayPhone}
                            </Text>
                        </View>
                        <Text style={styles.contactHint}>
                            Номер берём из профиля, чтобы бронь и уведомления были привязаны к вашему аккаунту.
                        </Text>
                    </View>
                </View>

                <View style={styles.sectionBlock}>
                    <Text style={styles.sectionTitle}>ДОСТУПНОЕ ВРЕМЯ</Text>
                    {slotsLoading ? (
                        <View style={styles.slotsLoadingRow}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.slotsHintText}>Проверяем слоты…</Text>
                        </View>
                    ) : slotsError ? (
                        <View style={styles.slotsErrorCard}>
                            <Text style={styles.slotsErrorText}>
                                {slotsAuthError
                                    ? slotsError
                                    : `${slotsError} Выбранное время сохранено — можно продолжить, и мы перепроверим доступность при подтверждении.`}
                            </Text>
                            <View style={styles.slotsErrorActions}>
                                <TouchableOpacity style={styles.slotsRetryBtn} activeOpacity={0.8} onPress={() => void loadSlots()}>
                                    <Text style={styles.slotsRetryText}>Повторить</Text>
                                </TouchableOpacity>
                                {slotsAuthError && (
                                    <TouchableOpacity
                                        style={[styles.slotsRetryBtn, styles.slotsSecondaryBtn]}
                                        activeOpacity={0.8}
                                        onPress={() =>
                                            router.push({
                                                pathname: '/auth/login',
                                                params: { redirectTo },
                                            })
                                        }
                                    >
                                        <Text style={styles.slotsSecondaryText}>Войти</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ) : slots.length === 0 ? (
                        <View style={styles.slotsErrorCard}>
                            <Text style={styles.slotsErrorText}>На выбранную дату свободных слотов нет.</Text>
                        </View>
                    ) : (
                        <View style={styles.slotsRow}>
                            {slots.map((slot) => (
                                <TouchableOpacity
                                    key={slot}
                                    style={slot === selectedSlot ? styles.slotChipActive : styles.slotChip}
                                    activeOpacity={0.85}
                                    onPress={() => setSelectedSlot(slot)}
                                >
                                    <Text style={slot === selectedSlot ? styles.slotChipTextActive : styles.slotChipText}>{slot}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                    <Text style={styles.slotsHintText}>Слоты подтягиваются из CRM ресторана и обновляются при изменении даты и количества гостей.</Text>
                </View>

                {addonsCount > 0 && (
                    <View style={styles.sectionBlock}>
                        <Text style={styles.sectionTitle}>ДОПОЛНИТЕЛЬНЫЕ ОПЦИИ</Text>
                        <View style={styles.addonsList}>
                            {(params.addons as string).split(',').map((addonId, index, array) => {
                                const id = addonId.trim();
                                let name = id === 'projector' ? 'Доп. услуги' : 'Спец. запросы';
                                let desc = id === 'projector' ? 'Организация питания или сервиса' : 'Оборудование или декор';
                                let icon = id === 'projector' ? 'restaurant-menu' : 'celebration';

                                return (
                                    <View key={id}>
                                        <View style={styles.addonItem}>
                                            <View style={styles.addonLeft}>
                                                <View style={styles.addonIconBox}>
                                                    <MaterialIcons name={icon as any} size={20} color={colors.primary} />
                                                </View>
                                                <View>
                                                    <Text style={styles.addonName}>{name}</Text>
                                                    <Text style={styles.addonDesc}>{desc}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.addonPrice}>+10,000 ₸</Text>
                                        </View>
                                        {index < array.length - 1 && <View style={styles.divider} />}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}


                <View style={styles.sectionBlock}>
                    <Text style={styles.sectionTitle}>СПОСОБ ОПЛАТЫ</Text>
                    <TouchableOpacity
                        style={styles.paymentMethodCard}
                        onPress={() => setPayInRestaurant(!payInRestaurant)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.paymentMethodLeft}>
                            <View style={[styles.methodIconBox, payInRestaurant && styles.methodIconBoxActive]}>
                                <MaterialIcons
                                    name={payInRestaurant ? "restaurant" : "credit-card"}
                                    size={24}
                                    color={payInRestaurant ? colors.primary : colors.textSecondary}
                                />
                            </View>
                            <View>
                                <Text style={styles.methodTitle}>
                                    {payInRestaurant ? "Оплата в ресторане" : "Онлайн оплата (Kezdes Pay)"}
                                </Text>
                                <Text style={styles.methodDesc}>
                                    {payInRestaurant ? "Вы оплатите счет после завершения визита" : "Безопасная оплата картой сейчас"}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.checkbox, payInRestaurant && styles.checkboxChecked]}>
                            {payInRestaurant && <Ionicons name="checkmark" size={16} color="#fff" />}
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionBlock}>
                    <Text style={styles.sectionTitle}>ДЕТАЛИЗАЦИЯ ОПЛАТЫ</Text>
                    <View style={styles.budgetRow}>
                        <Text style={styles.budgetText}>Бронирование ({guestCount} чел.)</Text>
                        <Text style={styles.budgetAmount}>{reservationPrice.toLocaleString()} ₸</Text>
                    </View>
                    <View style={styles.budgetRow}>
                        <Text style={styles.budgetText}>Доп. услуги ({addonsCount})</Text>
                        <Text style={styles.budgetAmount}>{addonsPrice.toLocaleString()} ₸</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalText}>Итого к оплате</Text>
                        <Text style={styles.totalAmount}>{finalTotal.toLocaleString()} ₸</Text>
                    </View>
                </View>
            </ScrollView>

            <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.calendarModalContent}>
                        <View style={styles.calendarModalHeader}>
                            <Text style={styles.calendarModalTitle}>Выберите дату</Text>
                            <TouchableOpacity onPress={() => setShowCalendar(false)} activeOpacity={0.8}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.calendarMonthHeader}>
                            <TouchableOpacity onPress={() => changeCalendarMonth(-1)} activeOpacity={0.8}>
                                <Ionicons name="chevron-back" size={28} color="#0f172a" />
                            </TouchableOpacity>
                            <Text style={styles.calendarMonthTitle}>
                                {monthNames[currentCalendarMonth]} {currentCalendarYear}
                            </Text>
                            <TouchableOpacity onPress={() => changeCalendarMonth(1)} activeOpacity={0.8}>
                                <Ionicons name="chevron-forward" size={28} color="#0f172a" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.calendarWeekRow}>
                            {dayNames.map((day) => (
                                <View key={day} style={styles.calendarWeekCell}>
                                    <Text style={styles.calendarWeekText}>{day}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.calendarGrid}>
                            {Array.from({ length: firstDayOfWeek }, (_, index) => (
                                <View key={`empty-${index}`} style={styles.calendarDayBtn} />
                            ))}
                            {Array.from({ length: daysInMonth }, (_, index) => {
                                const day = index + 1;
                                const nextDate = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const isActive = selectedDate === nextDate;
                                const today = new Date();
                                const dayDate = new Date(currentCalendarYear, currentCalendarMonth, day, 12);
                                const isPast = dayDate < new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);

                                return (
                                    <TouchableOpacity
                                        key={nextDate}
                                        style={[
                                            styles.calendarDayBtn,
                                            isActive && styles.calendarDayBtnActive,
                                            isPast && styles.calendarDayBtnDisabled,
                                        ]}
                                        disabled={isPast}
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            setSelectedDate(nextDate);
                                            setShowCalendar(false);
                                        }}
                                    >
                                        <Text style={[styles.calendarDayText, isActive && styles.calendarDayTextActive]}>{day}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={styles.footer}>
                <View style={styles.secureBadgeRow}>
                    <MaterialIcons name="verified-user" size={14} color="#94a3b8" />
                    <Text style={styles.secureBadgeText}>БЕЗОПАСНОЕ БРОНИРОВАНИЕ ЧЕРЕЗ KEZDES</Text>
                </View>
                <TouchableOpacity
                    style={[styles.submitBtn, isSubmitDisabled ? styles.submitBtnDisabled : null]}
                    onPress={handleConfirm}
                    activeOpacity={0.8}
                    disabled={isSubmitDisabled}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.submitBtnText}>Подтвердить бронирование</Text>
                    )}
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
        height: 56,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        zIndex: 10,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 80,
        marginLeft: -8,
    },
    backText: {
        fontSize: 16,
        color: '#0047FF',
        fontWeight: '500',
        marginLeft: -4,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
    },
    content: {
        paddingBottom: 40,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 16,
    },
    titleLarge: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    subtitleMedium: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    summaryCard: {
        backgroundColor: '#ffffff',
        borderRadius: 40,
        marginHorizontal: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0px 8px 18px rgba(15, 23, 42, 0.06)',
            },
            default: {},
        }),
    },
    imageContainer: {
        height: 128,
        backgroundColor: '#e2e8f0',
    },
    summaryImagePlaceholder: {
        width: '100%',
        height: '100%',
        padding: 12,
    },
    summaryPremiumBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#0047FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    premiumBadgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    summaryCardBody: {
        padding: 16,
    },
    summaryTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    tagWrap: {
        backgroundColor: 'rgba(0, 71, 255, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 99,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0047FF',
    },
    idText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#94a3b8',
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 12,
        lineHeight: 24,
    },
    detailsList: {
        gap: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    detailText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#475569',
        flex: 1,
    },
    detailValueButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionBlock: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 12,
    },
    contactCard: {
        backgroundColor: '#ffffff',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
    },
    contactLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
        marginBottom: 8,
    },
    contactLabelSpacing: {
        marginTop: 14,
    },
    contactInput: {
        height: 52,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#dbe3f0',
        backgroundColor: '#ffffff',
        paddingHorizontal: 14,
        fontSize: 15,
        color: '#0f172a',
    },
    contactPhoneBox: {
        minHeight: 52,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    contactPhoneText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0f172a',
    },
    contactPhoneMutedText: {
        fontSize: 15,
        color: '#94a3b8',
    },
    contactHint: {
        marginTop: 10,
        fontSize: 13,
        lineHeight: 18,
        color: '#64748b',
    },
    addonsList: {
        backgroundColor: '#f8fafc',
        borderRadius: 32,
        overflow: 'hidden',
    },
    addonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    addonLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    addonIconBox: {
        width: 40,
        height: 40,
        borderRadius: 32,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addonName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
    },
    addonDesc: {
        fontSize: 12,
        color: '#64748b',
    },
    addonFree: {
        fontSize: 12,
        fontWeight: '700',
        color: '#16a34a', 
        letterSpacing: 0.5,
    },
    addonPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
    },
    divider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginHorizontal: 16,
    },
    budgetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    budgetText: {
        fontSize: 14,
        color: '#64748b',
    },
    budgetAmount: {
        fontSize: 14,
        fontWeight: '500',
        color: '#0f172a',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 4,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#cbd5e1',
        borderStyle: 'dashed',
    },
    totalText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0047FF',
    },
    footer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        padding: 20,
        paddingTop: 12,
        gap: 16,
    },
    secureBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    secureBadgeText: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    submitBtn: {
        backgroundColor: '#0047FF',
        paddingVertical: 18,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#0047FF',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
            web: {
                boxShadow: '0px 12px 24px rgba(0, 71, 255, 0.2)',
            },
            default: {},
        }),
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
    },
    paymentMethodCard: {
        backgroundColor: '#ffffff',
        borderRadius: 32,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    paymentMethodLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    methodIconBox: {
        width: 48,
        height: 48,
        borderRadius: 40,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
    },
    methodIconBoxActive: {
        backgroundColor: 'rgba(0, 71, 255, 0.1)',
    },
    methodTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
    },
    methodDesc: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#0047FF',
        borderColor: '#0047FF',
    },
    slotsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 14,
    },
    slotsLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 14,
    },
    slotChip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    slotChipActive: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#0047FF',
        backgroundColor: '#0047FF',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    slotChipText: {
        color: '#0f172a',
        fontSize: 13,
        fontWeight: '700',
    },
    slotChipTextActive: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
    },
    slotsHintText: {
        marginTop: 14,
        fontSize: 12,
        color: '#64748b',
        lineHeight: 18,
    },
    slotsErrorCard: {
        marginTop: 14,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#fee2e2',
        backgroundColor: '#fff1f2',
        padding: 14,
        gap: 12,
    },
    slotsErrorActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    slotsErrorText: {
        color: '#9f1239',
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 18,
    },
    slotsRetryBtn: {
        alignSelf: 'flex-start',
        borderRadius: 999,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#fecdd3',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    slotsRetryText: {
        color: '#9f1239',
        fontSize: 12,
        fontWeight: '800',
    },
    slotsSecondaryBtn: {
        backgroundColor: '#fff',
        borderColor: '#fecdd3',
    },
    slotsSecondaryText: {
        color: '#9f1239',
        fontSize: 12,
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'center',
        padding: 20,
    },
    calendarModalContent: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 20,
    },
    calendarModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    calendarModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    calendarMonthHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    calendarMonthTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    calendarWeekRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    calendarWeekCell: {
        width: '14.2857%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
    },
    calendarWeekText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94a3b8',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarDayBtn: {
        width: '14.2857%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        marginBottom: 8,
    },
    calendarDayBtnActive: {
        backgroundColor: '#0047FF',
    },
    calendarDayBtnDisabled: {
        opacity: 0.3,
    },
    calendarDayText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
    },
    calendarDayTextActive: {
        color: '#fff',
    },
});
