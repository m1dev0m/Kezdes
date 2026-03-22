import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface StaffCardProps {
    item: {
        id: string;
        name: string;
        role: string;
        status: string;
    };
    onMore?: (item: any) => void;
}

const StaffCard = memo(({ item, onMore }: StaffCardProps) => {
    const isOnline = item.status === 'В сети';

    return (
        <View style={styles.card}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]}</Text>
                <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#10b981' : '#f59e0b' }]} />
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.role}>{item.role}</Text>
            </View>
            <TouchableOpacity style={styles.actions} onPress={() => onMore?.(item)}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#94a3b8" />
            </TouchableOpacity>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 40,
        backgroundColor: '#fff',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        alignItems: 'center',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 18,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        position: 'relative',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '900',
        color: colors.text,
        fontStyle: 'italic',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 3,
        borderColor: '#fff',
    },
    info: {
        flex: 1,
        marginLeft: 16,
    },
    name: {
        fontSize: 17,
        fontWeight: '900',
        color: colors.text,
        fontStyle: 'italic',
        letterSpacing: -0.5,
    },
    role: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        marginTop: 2,
        letterSpacing: 0.5,
    },
    actions: {
        width: 40,
        height: 40,
        borderRadius: 40,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default StaffCard;
