import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function MapPicker() {
    return (
        <View style={styles.webMapFallback}>
            <View style={styles.fallbackIcon}>
                <Ionicons name="map-outline" size={60} color={colors.primary} />
            </View>
            <Text style={styles.fallbackText}>Карта доступна в мобильном приложении</Text>
            <Text style={styles.fallbackSubtext}>Локация: Астана, Казахстан</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    webMapFallback: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    fallbackIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    fallbackText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
    },
    fallbackSubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
    },
});
