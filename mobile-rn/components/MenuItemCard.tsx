import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface MenuItemCardProps {
    item: {
        id: number;
        name: string;
        price: string | number;
        description?: string | null;
        is_available: boolean;
    };
    onToggle: (item: any) => void;
}

const MenuItemCard = memo(({ item, onToggle }: MenuItemCardProps) => {
    return (
        <View style={[styles.card, !item.is_available && styles.cardDisabled]}>
            <View style={styles.iconContainer}>
                <MaterialIcons
                    name="restaurant-menu"
                    size={28}
                    color={item.is_available ? colors.primary : colors.muted}
                />
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>{parseFloat(item.price as string).toLocaleString('ru-RU')} ₸</Text>
                {!!item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
            </View>
            <TouchableOpacity
                style={[styles.toggle, item.is_available ? styles.toggleOn : styles.toggleOff]}
                onPress={() => onToggle(item)}
            >
                <View style={[styles.dot, !item.is_available && styles.dotOff]} />
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
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        alignItems: 'center',
    },
    cardDisabled: {
        opacity: 0.6,
        backgroundColor: '#f8fafc',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 32,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    info: {
        flex: 1,
        marginLeft: 16,
    },
    name: {
        fontSize: 18,
        fontWeight: '900',
        color: '#000',
        fontStyle: 'italic',
        letterSpacing: -0.5,
    },
    price: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.primary,
        fontStyle: 'italic',
        marginTop: 2,
    },
    desc: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
        lineHeight: 16,
    },
    toggle: {
        width: 44,
        height: 24,
        borderRadius: 40,
        paddingHorizontal: 4,
        justifyContent: 'center',
    },
    toggleOn: {
        backgroundColor: colors.primary,
    },
    toggleOff: {
        backgroundColor: '#e2e8f0',
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 32,
        backgroundColor: '#fff',
        alignSelf: 'flex-end',
    },
    dotOff: {
        alignSelf: 'flex-start',
    },
});

export default MenuItemCard;
