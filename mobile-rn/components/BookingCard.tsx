import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const statusMap = {
    pending: { label: 'ОЖИДАНИЕ', color: '#f97316', bg: '#fff7ed', border: '#ffedd5' },
    approved: { label: 'ПОДТВЕРЖДЕНО', color: '#16a34a', bg: '#f0fdf4', border: '#dcfce7' },
    confirmed: { label: 'ПОДТВЕРЖДЕНО', color: '#16a34a', bg: '#f0fdf4', border: '#dcfce7' },
    completed: { label: 'ЗАВЕРШЕНО', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
    rejected: { label: 'ОТКЛОНЕНО', color: '#ef4444', bg: '#fef2f2', border: '#fee2e2' },
    no_show: { label: 'НЕ ПРИШЕЛ', color: '#94a3b8', bg: '#f1f5f9', border: '#e2e8f0' },
};

interface BookingCardProps {
    booking: any;
    onAction: (id: string | number, action: 'confirm' | 'reject') => void;
    onPatchStatus: (id: string | number, status: 'no_show' | 'complete') => void;
    onChat: (id: string | number, name: string) => void;
    onEdit: (id: string | number) => void;
    onDetails: (id: string | number) => void;
}

const BookingCard = memo(({ booking: b, onAction, onPatchStatus, onChat, onEdit, onDetails }: BookingCardProps) => {
    const status = statusMap[b.status as keyof typeof statusMap] || statusMap.pending;
    const isPending = b.status === 'pending';
    const isActive = b.status === 'approved' || b.status === 'confirmed';

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.timeLabel}>{b.time ? b.time.substring(0, 5) : '--:--'} • СЕГОДНЯ</Text>
                <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.border }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
            </View>

            <View style={styles.userNameRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.userName} numberOfLines={1}>{b.user_name || b.customer_name || 'Клиент'}</Text>
                    {!!(b.user_phone || b.customer_phone) && (
                        <View style={styles.phoneRow}>
                            <Ionicons name="call" size={12} color={colors.textSecondary} />
                            <Text style={styles.phoneText}>{b.user_phone || b.customer_phone}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.chatIconBtn}
                    onPress={() => onChat(b.id, b.user_name || b.customer_name)}
                >
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <Ionicons name="people" size={16} color={colors.textSecondary} />
                    <Text style={styles.metaText}>{b.guests} PAX</Text>
                </View>
                {!!b.event_type && (
                    <>
                        <View style={styles.metaDot} />
                        <View style={styles.metaItem}>
                            <MaterialIcons name="event" size={14} color={colors.primary} />
                            <Text style={styles.metaText}>{b.event_type === 'business' ? 'Бизнес' : 'Частное'}</Text>
                        </View>
                    </>
                )}
                {!!b.pay_at_restaurant && (
                    <View style={styles.payBadge}>
                        <Text style={styles.payText}>CASH</Text>
                    </View>
                )}
            </View>

            <View style={styles.actions}>
                {isPending ? (
                    <>
                        <TouchableOpacity style={styles.btnOutline} onPress={() => onAction(b.id, 'reject')}>
                            <Text style={styles.btnOutlineText}>Отклонить</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnPrimary} onPress={() => onAction(b.id, 'confirm')}>
                            <Text style={styles.btnPrimaryText}>Подтвердить</Text>
                        </TouchableOpacity>
                    </>
                ) : isActive ? (
                    <>
                        <TouchableOpacity style={styles.btnOutline} onPress={() => onPatchStatus(b.id, 'no_show')}>
                            <Text style={styles.btnOutlineText}>No-show</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnPrimary} onPress={() => onPatchStatus(b.id, 'complete')}>
                            <Text style={styles.btnPrimaryText}>Завершить</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <TouchableOpacity style={styles.btnOutline} onPress={() => onEdit(b.id)}>
                            <Text style={styles.btnOutlineText}>{b.status === 'rejected' ? 'Посмотреть' : 'Изменить'}</Text>
                        </TouchableOpacity>
                        {b.status !== 'rejected' && (
                            <TouchableOpacity style={styles.btnPrimary} onPress={() => onDetails(b.id)}>
                                <Text style={styles.btnPrimaryText}>Детали</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 28,
        padding: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    timeLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: colors.textSecondary,
        letterSpacing: 1,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '900',
    },
    userNameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    userName: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: -0.5,
        fontStyle: 'italic',
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    phoneText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    chatIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 24,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '700',
        fontStyle: 'italic',
    },
    metaDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#e2e8f0',
    },
    payBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginLeft: 'auto',
    },
    payText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#92400e',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    btnOutline: {
        flex: 1,
        backgroundColor: '#f8fafc',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    btnOutlineText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '800',
        fontStyle: 'italic',
    },
    btnPrimary: {
        flex: 1,
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
    },
    btnPrimaryText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
        fontStyle: 'italic',
    },
});

export default BookingCard;
