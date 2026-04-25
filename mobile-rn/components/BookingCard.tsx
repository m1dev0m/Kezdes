import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface CustomerSummary {
    id: number;
    visits_count: number;
    no_show_count: number;
    flag: string;
    is_vip: boolean;
    risk_label: string;
    notes: string;
    note_preview: string;
}

interface BookingRecord {
    id: string | number;
    date?: string | null;
    time?: string | null;
    status: string;
    user_name?: string | null;
    customer_name?: string | null;
    user_phone?: string | null;
    customer_phone?: string | null;
    guests?: number;
    table_number?: string | null;
    table?: string | number | null;
    table_id?: number | null;
    event_type?: string | null;
    pay_at_restaurant?: boolean;
    customer_summary?: CustomerSummary | null;
}

const statusMap = {
    pending: { label: 'ОЖИДАНИЕ', color: '#f97316', bg: '#fff7ed', border: '#ffedd5' },
    approved: { label: 'ПОДТВЕРЖДЕНО', color: '#16a34a', bg: '#f0fdf4', border: '#dcfce7' },
    confirmed: { label: 'ПОДТВЕРЖДЕНО', color: '#16a34a', bg: '#f0fdf4', border: '#dcfce7' },
    seated: { label: 'ЗА СТОЛОМ', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    completed: { label: 'ЗАВЕРШЕНО', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
    rejected: { label: 'ОТКЛОНЕНО', color: '#ef4444', bg: '#fef2f2', border: '#fee2e2' },
    no_show: { label: 'НЕ ПРИШЕЛ', color: '#94a3b8', bg: '#f1f5f9', border: '#e2e8f0' },
};

interface BookingCardProps {
    booking: BookingRecord;
    isTablet?: boolean;
    highlighted?: boolean;
    onAction: (id: string | number, action: 'confirm' | 'reject') => void;
    onSeat: (id: string | number) => void;
    onPatchStatus: (id: string | number, status: 'no_show' | 'complete') => void;
    onChat: (id: string | number, name: string) => void;
    onEdit: (id: string | number) => void;
    onDetails: (id: string | number) => void;
}


const BookingCard = memo(({ booking: b, isTablet = false, highlighted = false, onAction, onSeat, onPatchStatus, onChat, onEdit, onDetails }: BookingCardProps) => {
    const status = statusMap[b.status as keyof typeof statusMap] || statusMap.pending;
    const isPending = b.status === 'pending';
    const isActive = b.status === 'approved' || b.status === 'confirmed';
    const isSeated = b.status === 'seated';

    return (
        <View style={[styles.card, isTablet && styles.cardTablet, highlighted && styles.cardHighlighted]}>
            <View style={styles.cardHeader}>
                <Text style={styles.timeLabel}>
                    {b.time ? b.time.substring(0, 5) : '--:--'} • {b.date || 'СЕГОДНЯ'}
                </Text>
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
                    onPress={() => onChat(b.id, b.user_name || b.customer_name || '')}
                >
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <Ionicons name="people" size={16} color={colors.textSecondary} />
                    <Text style={styles.metaText}>{b.guests} гостей</Text>
                </View>
                {!!(b.table_number ?? b.table) && (
                    <View style={styles.tableMetaBadge}>
                        <Ionicons name="grid-outline" size={14} color={colors.primary} />
                        <Text style={styles.tableMetaText}>Стол {b.table_number ?? b.table}</Text>
                    </View>
                )}
                {!!b.event_type && (
                    <>
                        <View style={styles.metaDot} />
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
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

            {(b.customer_summary?.is_vip || b.customer_summary?.risk_label === 'no_show_risk' || (b.customer_summary?.no_show_count ?? 0) > 0) ? (
                <View style={styles.crmRow}>
                    {b.customer_summary?.is_vip ? (
                        <View style={[styles.crmBadge, styles.crmBadgeVip]}>
                            <Text style={[styles.crmBadgeText, styles.crmBadgeTextVip]}>VIP</Text>
                        </View>
                    ) : null}
                    {b.customer_summary?.risk_label === 'no_show_risk' ? (
                        <View style={[styles.crmBadge, styles.crmBadgeWarn]}>
                            <Text style={[styles.crmBadgeText, styles.crmBadgeTextWarn]}>No-show risk</Text>
                        </View>
                    ) : null}
                    {(b.customer_summary?.no_show_count ?? 0) > 0 ? (
                        <Text style={styles.crmMetaText}>{b.customer_summary!.no_show_count} no-show</Text>
                    ) : null}
                    {(b.customer_summary?.visits_count ?? 0) > 0 ? (
                        <Text style={styles.crmMetaText}>{b.customer_summary!.visits_count} визитов</Text>
                    ) : null}
                </View>
            ) : null}

            <View style={[styles.actions, isTablet && styles.actionsTablet]}>
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
                        <TouchableOpacity style={styles.btnPrimary} onPress={() => onSeat(b.id)}>
                            <Text style={styles.btnPrimaryText}>Посадить</Text>
                        </TouchableOpacity>
                    </>
                ) : isSeated ? (
                    <>
                        <TouchableOpacity style={styles.btnOutline} onPress={() => onChat(b.id, b.user_name || b.customer_name || '')}>
                            <Text style={styles.btnOutlineText}>Чат</Text>
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
    cardTablet: {
        minHeight: 250,
        padding: 20,
    },
    cardHighlighted: {
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOpacity: 0.14,
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
        borderRadius: 32,
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
        borderRadius: 40,
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
        flexWrap: 'wrap',
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
    tableMetaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    tableMetaText: {
        fontSize: 12,
        color: '#1d4ed8',
        fontWeight: '800',
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
    crmRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 18,
    },
    crmBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
    },
    crmBadgeVip: {
        backgroundColor: '#fdf4ff',
        borderColor: '#f5d0fe',
    },
    crmBadgeWarn: {
        backgroundColor: '#fff7ed',
        borderColor: '#fed7aa',
    },
    crmBadgeText: {
        fontSize: 10,
        fontWeight: '900',
    },
    crmBadgeTextVip: {
        color: '#a21caf',
    },
    crmBadgeTextWarn: {
        color: '#c2410c',
    },
    crmMetaText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionsTablet: {
        marginTop: 'auto',
    },
    btnOutline: {
        flex: 1,
        backgroundColor: '#f8fafc',
        paddingVertical: 14,
        borderRadius: 32,
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
        borderRadius: 32,
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
