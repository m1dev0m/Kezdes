import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Image,
    ImageBackground,
    StatusBar,
    TextInput,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { RangeSlider } from '@react-native-assets/slider';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

const EVENT_TYPES = [
    { id: 'birthday', label: 'День рождения', icon: 'cake', bgColor: 'rgba(19, 127, 236, 0.1)' },
    { id: 'wedding', label: 'Свадьба', icon: 'favorite', bgColor: 'rgba(236, 19, 127, 0.1)' },
    { id: 'corporate', label: 'Корпоратив', icon: 'business', bgColor: 'rgba(19, 180, 236, 0.1)' },
    { id: 'banquet', label: 'Банкет', icon: 'restaurant', bgColor: 'rgba(236, 180, 19, 0.1)' },
    { id: 'party', label: 'Вечеринка', icon: 'celebration', bgColor: 'rgba(127, 19, 236, 0.1)' },
    { id: 'other', label: 'Другое', icon: 'more-horiz', bgColor: 'rgba(148, 163, 184, 0.1)' },
];

const BUDGET_TIERS = [
    { id: 'economy', label: 'Эконом', desc: 'до 50 000 ₸', icon: 'savings' },
    { id: 'standard', label: 'Стандарт', desc: '50 000 — 200 000 ₸', icon: 'payments' },
    { id: 'premium', label: 'Премиум', desc: 'от 200 000 ₸', icon: 'diamond' },
];

export default function WizardScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [step, setStep] = useState(1);


    const [eventType, setEventType] = useState('business');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [guests, setGuests] = useState(4);

    const [selectedHour, setSelectedHour] = useState('18');
    const [selectedMinute, setSelectedMinute] = useState('00');

    const [budget, setBudget] = useState('standard');

    const isBigEvent = eventType === 'wedding';
    const minPossibleGuests = isBigEvent ? 50 : 2;
    const maxPossibleGuests = isBigEvent ? 500 : 100;

    const minSliderBudget = isBigEvent ? 0 : 10000;
    const maxSliderBudget = isBigEvent ? 50000000 : 5000000;
    const sliderStep = isBigEvent ? 500000 : 10000;

    const [minBudget, setMinBudget] = useState(isBigEvent ? 1000000 : 50000);
    const [maxBudget, setMaxBudget] = useState(isBigEvent ? 5000000 : 200000);

    const [addons, setAddons] = useState<string[]>([]);
    const [comments, setComments] = useState('');
    const [eventTitle, setEventTitle] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);

    const TOTAL_STEPS = 4; // 1: Type, 2: Date/Time, 3: Details, 4: Add-ons

    const updateEventType = (typeId: string) => {
        setEventType(typeId);

        const big = typeId === 'wedding';
        if (big) {
            setGuests(Math.max(50, guests)); // bump up to minimum 50
            setMinBudget(1000000);
            setMaxBudget(5000000);
        } else {
            setGuests(Math.min(100, guests)); // clamp down to max 100
            setMinBudget(50000);
            setMaxBudget(200000);
        }
    };

    const handleNext = () => {
        if (step < TOTAL_STEPS) {
            setStep(step + 1);
        } else {
            if (__DEV__) {
                console.log("Wizard complete", { eventType, guests, budget: maxBudget, addons });
            }

            const rId = params.restaurantId || params.venueId;
            const rName = params.restaurantName || params.venueName;
            const orderId = params.orderId;
            const payAtRestaurant = params.payAtRestaurant;

            if (rId) {
                router.push({
                    pathname: '/review',
                    params: {
                        restaurantId: rId,
                        restaurantName: rName,
                        date: date,
                        time: `${selectedHour}:${selectedMinute}`,
                        guests: guests.toString(),
                        budget: maxBudget.toString(),
                        addons: addons.join(", "),
                        comments: comments,
                        eventTitle: eventTitle,
                        orderId: orderId ? String(orderId) : undefined,
                        payAtRestaurant: payAtRestaurant ? String(payAtRestaurant) : undefined,
                    }
                });
            } else {
                router.push({
                    pathname: '/results',
                    params: {
                        eventType,
                        guests: guests.toString(),
                        date: date,
                        time: `${selectedHour}:${selectedMinute}`,
                        budget: maxBudget.toString(),
                        addons: addons.join(", "),
                        comments: comments,
                        eventTitle: eventTitle
                    }
                });
            }
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            if (router.canGoBack()) {
                router.back();
            } else {
                if (__DEV__) {
                    console.warn("Cant go back, pushing to home");
                }
                router.push('/home');
            }
        }
    };

    const renderHeader = (title: string) => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
                    <MaterialIcons
                        name={step === 1 ? "close" : "chevron-left"}
                        size={28}
                        color="#0f172a"
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title}</Text>
                <View style={{ width: 44 }} />
            </View>
        </View>
    );

    const renderBottomProgress = () => (
        <View style={styles.bottomProgressContainer}>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
            </View>
            <Text style={styles.progressStepText}>Шаг {step} из {TOTAL_STEPS}</Text>
        </View>
    );

    const formatDateShort = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

            {step === 1 && (
                <>
                    {renderHeader('Тип события')}
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={{ marginBottom: 32 }}>
                            <Text style={styles.heroTitle}>планируете?</Text>
                            <Text style={styles.heroSubtitle}>Выберите категорию, чтобы мы подобрали лучшие условия</Text>
                        </View>

                        <View style={styles.grid}>
                            {EVENT_TYPES.map(type => {
                                const isActive = eventType === type.id;
                                return (
                                    <TouchableOpacity
                                        key={type.id}
                                        style={[styles.typeCard, isActive && styles.typeCardActive]}
                                        onPress={() => updateEventType(type.id)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.typeIconBox, { backgroundColor: type.bgColor }]}>
                                            <MaterialIcons name={type.icon as any} size={32} color={colors.primary} />
                                        </View>
                                        <Text style={styles.typeLabel}>{type.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                    {renderBottomProgress()}
                </>
            )}

            {step === 2 && (
                <>
                    {renderHeader('Дата и время')}
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={{ marginBottom: 32 }}>
                            <Text style={styles.heroTitle}>Когда состоится ваше событие?</Text>
                        </View>

                        <View style={styles.dateSelectorCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <MaterialIcons name="calendar-today" size={24} color="#0047FF" />
                                <Text style={styles.dateSelectorText}>{formatDateShort(date)}</Text>
                            </View>
                            <TouchableOpacity style={styles.editDateBtn} onPress={() => setShowCalendar(true)}>
                                <Text style={styles.editDateText}>Изм.</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.inputTitle, { marginTop: 32 }]}>Название события</Text>
                        <TextInput
                            style={styles.wizardInput}
                            placeholder="Напр. День рождения Алины"
                            value={eventTitle}
                            onChangeText={setEventTitle}
                        />
                        <Text style={styles.privacyNote}>* Это название видите только вы</Text>

                        <Text style={[styles.inputTitle, { marginTop: 32 }]}>Выбор времени</Text>
                        <View style={styles.timeGrid}>
                            {['12:00', '14:00', '16:00', '18:00', '19:00', '20:00'].map(t => {
                                const isActive = `${selectedHour}:${selectedMinute}` === t;
                                return (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.timeGridBtn, isActive && styles.timeGridBtnActive]}
                                        onPress={() => {
                                            const [h, m] = t.split(':');
                                            setSelectedHour(h);
                                            setSelectedMinute(m);
                                        }}
                                    >
                                        <Text style={[styles.timeGridText, isActive && styles.timeGridTextActive]}>{t}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={{ height: 100 }} />
                    </ScrollView>

                    <View style={styles.stickyFooter}>
                        <TouchableOpacity style={styles.mainActionBtn} activeOpacity={0.9} onPress={handleNext}>
                            <Text style={styles.mainActionBtnText}>Продолжить</Text>
                            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                        </TouchableOpacity>
                        {renderBottomProgress()}
                    </View>
                </>
            )}

            {step === 3 && (
                <>
                    {renderHeader('Детали события')}
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={{ marginBottom: 32 }}>
                            <Text style={styles.heroTitle}>Почти готово!</Text>
                            <Text style={styles.heroSubtitle}>Укажите количество гостей и бюджет, чтобы заведения могли предложить вам лучшие варианты.</Text>
                        </View>

                        <Text style={styles.inputTitle}>Количество гостей</Text>
                        <TextInput
                            style={styles.wizardInput}
                            value={guests.toString()}
                            onChangeText={v => setGuests(Number(v.replace(/[^0-9]/g, '')))}
                            keyboardType="numeric"
                            placeholder="50"
                        />

                        <Text style={[styles.inputTitle, { marginTop: 24 }]}>Примерный бюджет (₸)</Text>
                        <TextInput
                            style={styles.wizardInput}
                            value={maxBudget.toString()}
                            onChangeText={v => setMaxBudget(Number(v.replace(/[^0-9]/g, '')))}
                            keyboardType="numeric"
                            placeholder="500,000"
                        />

                        <Text style={[styles.inputTitle, { marginTop: 24 }]}>Дополнительные пожелания</Text>
                        <TextInput
                            style={[styles.wizardInput, { height: 120, textAlignVertical: 'top', paddingTop: 16 }]}
                            placeholder="Напр. Оборудование для диджея, детская зона..."
                            multiline
                            value={comments}
                            onChangeText={setComments}
                        />
                        <View style={{ height: 100 }} />
                    </ScrollView>

                    <View style={styles.stickyFooter}>
                        <TouchableOpacity style={styles.mainActionBtn} activeOpacity={0.9} onPress={handleNext}>
                            <Text style={styles.mainActionBtnText}>Создать событие</Text>
                            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                        </TouchableOpacity>
                        {renderBottomProgress()}
                    </View>
                </>
            )}

            {step === 4 && (
                <>
                    {renderHeader('Дополнения и заметки')}
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={{ marginBottom: 32 }}>
                            <Text style={styles.heroTitle}>Дополнения</Text>
                            <Text style={styles.heroSubtitle}>Выберите необходимое оборудование или услуги для вашего события.</Text>
                        </View>

                        <View style={styles.addonsGrid}>
                            {[
                                { id: 'projector', name: 'Кейтеринг', desc: 'Организация питания', icon: 'restaurant-menu' },
                                { id: 'decoration', name: 'Спец. запросы', desc: 'Оборудование или декор', icon: 'celebration' },
                            ].map((addon) => {
                                const isSelected = addons.includes(addon.id);
                                return (
                                    <TouchableOpacity
                                        key={addon.id}
                                        style={[styles.addonToggleCard, isSelected && styles.addonToggleCardActive]}
                                        onPress={() => {
                                            if (isSelected) {
                                                setAddons(addons.filter(i => i !== addon.id));
                                            } else {
                                                setAddons([...addons, addon.id]);
                                            }
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.addonToggleLeft}>
                                            <View style={[styles.addonToggleIconBox, isSelected && styles.addonToggleIconBoxActive]}>
                                                <MaterialIcons name={addon.icon as any} size={24} color={isSelected ? colors.primary : colors.textSecondary} />
                                            </View>
                                            <View>
                                                <Text style={styles.addonToggleName}>{addon.name}</Text>
                                                <Text style={styles.addonToggleDesc}>{addon.desc}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.checkboxOuter}>
                                            {isSelected && <MaterialIcons name="check" size={16} color="#fff" />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={{ marginTop: 32, marginBottom: 16 }}>
                            <Text style={[styles.titleLarge, { textAlign: 'left', fontSize: 18, marginBottom: 8 }]}>Комментарии</Text>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Укажите предпочтения по рассадке, аллергии или другие важные детали для ресторана... (опционально)"
                                placeholderTextColor={colors.muted}
                                multiline
                                numberOfLines={4}
                                value={comments}
                                onChangeText={setComments}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.infoNote}>
                            <MaterialIcons name="info" size={20} color={colors.primary} style={{ marginTop: 2 }} />
                            <Text style={styles.infoNoteText}>
                                Ваши заметки помогут ресторану подготовиться к вашему бизнес-мероприятию на высшем уровне.
                            </Text>
                        </View>
                        <View style={{ height: 100 }} />
                    </ScrollView>

                    <View style={styles.stickyFooter}>
                        <TouchableOpacity style={styles.mainActionBtn} activeOpacity={0.9} onPress={handleNext}>
                            <Text style={styles.mainActionBtnText}>Далее</Text>
                            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                        </TouchableOpacity>
                        {renderBottomProgress()}
                    </View>
                </>
            )}

            {step === 1 && (
                <View style={styles.bottomNavCta}>
                    <TouchableOpacity style={styles.mainActionBtn} activeOpacity={0.9} onPress={handleNext}>
                        <Text style={styles.mainActionBtnText}>Продолжить</Text>
                        <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}

            <Modal visible={showCalendar} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.calendarModalContent}>
                        <View style={styles.calendarModalHeader}>
                            <Text style={styles.calendarModalTitle}>Выберите дату</Text>
                            <TouchableOpacity onPress={() => setShowCalendar(false)}>
                                <MaterialIcons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {(() => {
                            const currentDate = new Date(date + 'T00:00:00');
                            const year = currentDate.getFullYear();
                            const month = currentDate.getMonth();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const firstDayOfWeek = new Date(year, month, 1).getDay();
                            const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
                            const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

                            const changeMonth = (delta: number) => {
                                const d = new Date(year, month + delta, 1);
                                setDate(d.toISOString().split('T')[0]);
                            };

                            return (
                                <>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <TouchableOpacity onPress={() => changeMonth(-1)}>
                                            <MaterialIcons name="chevron-left" size={28} color="#0f172a" />
                                        </TouchableOpacity>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>
                                            {monthNames[month]} {year}
                                        </Text>
                                        <TouchableOpacity onPress={() => changeMonth(1)}>
                                            <MaterialIcons name="chevron-right" size={28} color="#0f172a" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                                        {dayNames.map(d => (
                                            <View key={d} style={[styles.calendarDayBtn, { backgroundColor: 'transparent' }]}>
                                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8' }}>{d}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <View style={styles.calendarGrid}>
                                        {Array.from({ length: (firstDayOfWeek + 6) % 7 }, (_, i) => (
                                            <View key={`empty-${i}`} style={styles.calendarDayBtn} />
                                        ))}
                                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                            const dStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                            const isActive = date === dStr;
                                            const today = new Date();
                                            const dayDate = new Date(year, month, day);
                                            const isPast = dayDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                            return (
                                                <TouchableOpacity
                                                    key={day}
                                                    style={[
                                                        styles.calendarDayBtn,
                                                        isActive && styles.calendarDayBtnActive,
                                                        isPast && { opacity: 0.3 }
                                                    ]}
                                                    disabled={isPast}
                                                    onPress={() => {
                                                        setDate(dStr);
                                                        setShowCalendar(false);
                                                    }}
                                                >
                                                    <Text style={[styles.calendarDayText, isActive && styles.calendarDayTextActive]}>{day}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingTop: 16,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingBottom: 8,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    backText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.primary,
        marginLeft: -4,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 120, // space for fixed footer
    },
    heroTextCenter: {
        alignItems: 'center',
        marginBottom: 32,
        paddingHorizontal: 8,
    },
    titleLarge: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitleMedium: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 16,
    },
    typeCard: {
        width: (width - 40 - 16) / 2, // (screen width - outer padding - gap) / 2
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    typeCardActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(19, 127, 236, 0.02)',
    },
    typeIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    typeIconBoxActive: {
        backgroundColor: 'rgba(19, 127, 236, 0.1)',
    },
    typeLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },
    checkIconAbs: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    infoAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: 'rgba(19, 127, 236, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(19, 127, 236, 0.1)',
        padding: 20,
        borderRadius: 16,
        marginTop: 40,
    },
    infoAlertText: {
        flex: 1,
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    },

    sectionBlock: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    cardBox: {
        backgroundColor: 'rgba(246, 247, 248, 0.7)', // slate-50 equiv
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    calNavBtn: {
        padding: 4,
        borderRadius: 8,
    },
    calMonthLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayHeaderCell: {
        width: '14.28%',
        alignItems: 'center',
        marginBottom: 8,
    },
    dayHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    dayCellActive: {
        backgroundColor: colors.primary,
    },
    dayCellText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    dayCellTextActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
    timePickerMock: {
        height: 160,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        backgroundColor: '#ffffff',
    },
    timeColumnScroll: {
        flex: 1,
        height: 160,
    },
    timeSlot: {
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeSelectorHighlight: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 40,
        marginTop: -20,
        backgroundColor: 'rgba(19, 127, 236, 0.1)',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(19, 127, 236, 0.2)',
        zIndex: 0,
    },
    timeColon: {
        fontSize: 24,
        fontWeight: '700',
        paddingHorizontal: 8,
        color: colors.text,
        zIndex: 1,
    },
    timeTextFaded: {
        fontSize: 18,
        color: colors.muted,
    },
    timeTextActive: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        zIndex: 1,
    },
    guestCounterBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(246, 247, 248, 0.7)',
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
    },
    counterBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    counterBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    guestDisplay: {
        alignItems: 'center',
    },
    guestNumberInput: {
        fontSize: 36,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 40,
        textAlign: 'center',
        minWidth: 80,
        padding: 0, // override default android padding
        margin: 0,
    },
    guestLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    guestMinMaxText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },

    budgetVisualBox: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 32,
    },
    budgetVisualEdges: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 32,
    },
    budgetVisualLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    budgetVisualVal: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.primary,
    },
    fakeSlider: {
        height: 6,
        position: 'relative',
        justifyContent: 'center',
        marginBottom: 16,
    },
    fakeSliderTrack: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.border,
        borderRadius: 3,
    },
    fakeSliderFill: {
        position: 'absolute',
        left: '20%',
        right: '30%',
        top: 0,
        bottom: 0,
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    fakeSliderThumb: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: colors.primary,
        transform: [{ translateY: -9 }, { translateX: -12 }], // approximate center
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    budgetVisualMinMax: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    budgetVisualLabelSm: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    tiersHeaderLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    tiersGrid: {
        gap: 12,
    },
    tierCardOuter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.border,
    },
    tierCardOuterActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(19, 127, 236, 0.05)',
    },
    tierCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    tierIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tierIconBoxActive: {
        backgroundColor: colors.primary,
    },
    tierLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    tierDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: -0.2,
        marginTop: 2,
        fontWeight: '500',
    },

    addonsGrid: {
        gap: 12,
    },
    addonToggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 16,
    },
    addonToggleCardActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(19, 127, 236, 0.05)',
    },
    addonToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    addonToggleIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addonToggleIconBoxActive: {
        backgroundColor: '#ffffff',
        borderColor: 'rgba(19, 127, 236, 0.2)',
    },
    addonToggleName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    addonToggleDesc: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    checkboxOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    dateSelectorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    dateSelectorText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
    },
    editDateBtn: {
        backgroundColor: 'rgba(0, 71, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    editDateText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0047FF',
    },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    timeGridBtn: {
        width: (width - 40 - 24) / 3,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    timeGridBtnActive: {
        backgroundColor: '#0047FF',
        borderColor: '#0047FF',
    },
    timeGridText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
    },
    timeGridTextActive: {
        color: '#ffffff',
    },
    wizardInput: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        fontWeight: '500',
        color: '#0f172a',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },

    bottomNavCta: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 20,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    mainActionBtn: {
        backgroundColor: '#0047FF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 50,
        gap: 8,
    },
    mainActionBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#0f172a',
        textAlign: 'left',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'left',
        lineHeight: 24,
    },
    bottomProgressContainer: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        alignItems: 'center',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 3,
        width: '100%',
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#0047FF',
    },
    progressStepText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94a3b8',
    },
    stickyFooter: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    commentInput: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: colors.text,
        minHeight: 120,
    },
    infoNote: {
        flexDirection: 'row',
        backgroundColor: 'rgba(67, 97, 238, 0.05)',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
    },
    infoNoteText: {
        flex: 1,
        color: colors.primary,
        fontSize: 13,
        lineHeight: 18,
        marginLeft: 12,
    },
    privacyNote: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 8,
        fontStyle: 'italic',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    calendarModalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        width: '100%',
        padding: 24,
    },
    calendarModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    calendarModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    calendarDayBtn: {
        width: (width - 40 - 48 - 60) / 7,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: '#f8fafc',
    },
    calendarDayBtnActive: {
        backgroundColor: '#0047FF',
    },
    calendarDayText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
    },
    calendarDayTextActive: {
        color: '#fff',
    }
});
