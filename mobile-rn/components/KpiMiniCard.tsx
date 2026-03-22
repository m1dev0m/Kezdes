import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface KpiMiniCardProps {
    label: string;
    value: string | number;
    suffix?: string;
}

const KpiMiniCard = memo(({ label, value, suffix }: KpiMiniCardProps) => {
    return (
        <View style={styles.card}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.valueRow}>
                <Text style={styles.value}>{value}</Text>
                {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 40,
        padding: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748b',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    value: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.text,
        fontStyle: 'italic',
        letterSpacing: -0.5,
    },
    suffix: {
        fontSize: 14,
        fontWeight: '800',
        color: '#94a3b8',
    },
});

export default KpiMiniCard;
